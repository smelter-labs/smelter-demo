"""Python sidecar: consumes Smelter side-channel audio from every WHIP input
and emits whisper transcripts back to the Node app over a WebSocket.

Smelter-demo creates WHIP inputs dynamically (one per camera/screenshare),
so this sidecar discovers audio channels in a loop and spawns one whisper
worker per input id.
"""

from __future__ import annotations

import asyncio
import faulthandler
import json
import logging
import os
import sys
from collections import deque

import numpy as np
import torch
import websockets
from faster_whisper import WhisperModel
from silero_vad import VADIterator, load_silero_vad
from smelter import list_channels
from smelter.aio import subscribe_audio_channel

faulthandler.enable()

logging.basicConfig(
    level=logging.INFO, format="[python] %(message)s", stream=sys.stderr
)
log = logging.getLogger("sidecar")

NODE_WS_URL = os.environ.get("NODE_WS_URL", "ws://127.0.0.1:8082")

# Silero VAD — see yolo-whisper-node example for rationale on these numbers.
VAD_THRESHOLD = 0.3
VAD_MIN_SILENCE_MS = 200
VAD_SAMPLE_RATE = 16000
VAD_WINDOW = 512
VAD_PREROLL_WINDOWS = 6
VAD_MAX_SEGMENT_MS = 7000
WHISPER_LANGUAGE: str | None = "en"

NANOS_PER_SAMPLE_16K = 1_000_000_000 // VAD_SAMPLE_RATE

DISCOVERY_INTERVAL_S = 1.0


events_q: asyncio.Queue[dict] = asyncio.Queue(maxsize=256)


async def main() -> None:
    log.info("loading Whisper + Silero VAD models…")
    whisper_model, vad_model = await asyncio.to_thread(
        lambda: (
            WhisperModel("base", device="cpu", compute_type="int8"),
            load_silero_vad(),
        )
    )

    log.info(
        "SMELTER_SIDE_CHANNEL_SOCKET_DIR=%s",
        os.environ.get("SMELTER_SIDE_CHANNEL_SOCKET_DIR", "<unset>"),
    )

    async with websockets.connect(NODE_WS_URL, ping_interval=20, max_size=None) as ws:
        log.info("connected to Node WS %s", NODE_WS_URL)
        await asyncio.gather(
            push_events(ws),
            discover_inputs(vad_model, whisper_model),
        )


async def push_events(ws) -> None:
    while True:
        event = await events_q.get()
        try:
            await ws.send(json.dumps(event))
        except websockets.ConnectionClosed:
            return


async def discover_inputs(vad_model, whisper_model: WhisperModel) -> None:
    """Poll the side-channel directory and start a whisper worker for every
    new audio channel that appears. Channels that disappear are not actively
    torn down — the worker's subscribe iterator ends on its own and the task
    exits, then the input_id is removed from `running` so a reconnect can
    spawn a fresh worker."""
    running: dict[str, asyncio.Task] = {}
    while True:
        try:
            channels = await asyncio.to_thread(list_channels)
        except Exception as err:  # noqa: BLE001
            log.warning("list_channels failed: %s", err)
            channels = []

        for c in channels:
            if c.kind.value != "audio":
                continue
            if c.input_id in running and not running[c.input_id].done():
                continue
            log.info("starting whisper worker for %s", c.input_id)
            running[c.input_id] = asyncio.create_task(
                run_whisper(c.input_id, vad_model, whisper_model)
            )

        for input_id, task in list(running.items()):
            if task.done():
                try:
                    task.result()
                except Exception as err:  # noqa: BLE001
                    log.warning("whisper worker for %s ended: %s", input_id, err)
                else:
                    log.info("whisper worker for %s ended", input_id)
                del running[input_id]

        await asyncio.sleep(DISCOVERY_INTERVAL_S)


async def stream_16k_windows(input_id: str):
    """Yield (window, window_start_pts_ms) for every 512-sample 16 kHz mono
    window from the side channel."""
    residual = np.empty(0, dtype=np.float32)
    sample_rate: int | None = None

    async for batch in subscribe_audio_channel(input_id):
        if sample_rate is None:
            sample_rate = batch.sample_rate
            log.info("[%s] audio input sample_rate=%d", input_id, sample_rate)
        mono = batch.to_mono()
        if mono.size == 0:
            continue
        chunk = resample_to_16k(mono, sample_rate).astype(np.float32, copy=False)
        if chunk.size == 0:
            continue

        audio = np.concatenate([residual, chunk]) if residual.size else chunk
        audio_start_pts_nanos = (
            batch.start_pts_nanos - residual.size * NANOS_PER_SAMPLE_16K
        )
        n_windows = audio.size // VAD_WINDOW

        for i in range(n_windows):
            window = audio[i * VAD_WINDOW : (i + 1) * VAD_WINDOW].copy()
            window_pts_ms = (
                audio_start_pts_nanos + i * VAD_WINDOW * NANOS_PER_SAMPLE_16K
            ) // 1_000_000
            yield window, window_pts_ms

        residual = audio[n_windows * VAD_WINDOW :].copy()


async def _transcribe_and_emit(
    model: WhisperModel,
    input_id: str,
    audio: np.ndarray,
    ts_ms: int,
    duration_ms: int,
) -> None:
    def _run() -> str:
        segments, _info = model.transcribe(
            audio,
            language=WHISPER_LANGUAGE,
            beam_size=1,
        )
        return " ".join(s.text.strip() for s in segments).strip()

    try:
        text = await asyncio.to_thread(_run)
    except Exception as err:  # noqa: BLE001
        log.warning("[%s] whisper failed: %s", input_id, err)
        return
    if not text:
        return
    log.info("[%s] whisper @ %d ms (%d ms): %s", input_id, ts_ms, duration_ms, text)
    await events_q.put(
        {
            "type": "transcript",
            "inputId": input_id,
            "text": text,
            "ts": ts_ms,
            "duration": duration_ms,
        }
    )


async def run_whisper(
    input_id: str, vad_model, whisper_model: WhisperModel
) -> None:
    vad_iter = VADIterator(
        vad_model,
        threshold=VAD_THRESHOLD,
        sampling_rate=VAD_SAMPLE_RATE,
        min_silence_duration_ms=VAD_MIN_SILENCE_MS,
        speech_pad_ms=0,
    )

    pre_buffer: deque[np.ndarray] = deque(maxlen=VAD_PREROLL_WINDOWS)
    speech_windows: list[np.ndarray] = []
    speech_start_pts_ms: int | None = None

    async for window, window_pts_ms in stream_16k_windows(input_id):
        pre_buffer.append(window)

        match vad_iter(torch.from_numpy(window), return_seconds=True):
            case {"start": _}:
                speech_start_pts_ms = window_pts_ms
                speech_windows = list(pre_buffer)

            case {"end": _} if speech_start_pts_ms is not None:
                duration_ms = window_pts_ms - speech_start_pts_ms
                ts_ms = speech_start_pts_ms
                audio = np.concatenate(speech_windows)
                speech_start_pts_ms = None
                speech_windows = []
                asyncio.create_task(
                    _transcribe_and_emit(
                        whisper_model, input_id, audio, ts_ms, duration_ms
                    )
                )

            case _ if speech_start_pts_ms is not None:
                speech_windows.append(window)

        if (
            speech_start_pts_ms is not None
            and window_pts_ms - speech_start_pts_ms >= VAD_MAX_SEGMENT_MS
        ):
            duration_ms = window_pts_ms - speech_start_pts_ms
            ts_ms = speech_start_pts_ms
            audio = np.concatenate(speech_windows)
            speech_start_pts_ms = window_pts_ms
            speech_windows = list(pre_buffer)
            asyncio.create_task(
                _transcribe_and_emit(
                    whisper_model, input_id, audio, ts_ms, duration_ms
                )
            )


def resample_to_16k(audio: np.ndarray, sample_rate: int) -> np.ndarray:
    if sample_rate == 16000:
        return audio
    target_len = int(round(audio.shape[0] * 16000 / sample_rate))
    if target_len <= 0:
        return audio
    x_old = np.linspace(0.0, 1.0, audio.shape[0], endpoint=False)
    x_new = np.linspace(0.0, 1.0, target_len, endpoint=False)
    return np.interp(x_new, x_old, audio).astype(np.float32, copy=False)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
