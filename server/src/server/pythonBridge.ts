import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';

import { WebSocketServer, type WebSocket } from 'ws';

import { SmelterInstance } from '../smelter';

const PYTHON_SCRIPT = path.join(process.cwd(), 'sidecar', 'sidecar.py');

export type TranscriptEvent = {
  inputId: string;
  text: string;
  ts: number; // stream pts in ms
  duration: number; // ms of audio the text covers
};

export type PythonBridgeOptions = {
  port: number;
  socketDir: string;
  onTranscript: (event: TranscriptEvent) => void;
};

type IncomingMessage = {
  type?: unknown;
  inputId?: unknown;
  text?: unknown;
  ts?: unknown;
  duration?: unknown;
};

export class PythonBridge {
  private opts: PythonBridgeOptions;
  private ws: WebSocket | null = null;
  private sidecar: ChildProcess | null = null;

  constructor(opts: PythonBridgeOptions) {
    this.opts = opts;
  }

  start(): void {
    this.startWsServer();
    this.spawnSidecar();
  }

  private startWsServer(): void {
    const wss = new WebSocketServer({ port: this.opts.port, host: '127.0.0.1' });
    wss.on('connection', ws => {
      if (this.ws && this.ws.readyState === this.ws.OPEN) {
        console.warn('[sidechannel] rejecting second python connection');
        ws.close(1013, 'already connected');
        return;
      }
      this.ws = ws;
      console.log('[sidechannel] python connected');

      ws.on('message', raw => this.handleMessage(raw.toString()));
      ws.on('close', () => {
        // Disconnects shouldn't happen — sidecar is supposed to outlive the
        // server. Loud log so it surfaces as a bug rather than silent drop.
        console.error('[sidechannel] python disconnected — this is a bug');
        if (this.ws === ws) this.ws = null;
      });
      ws.on('error', err => console.error('[sidechannel] ws error', err));
    });
    console.log(`[sidechannel] python WS listening on :${this.opts.port}`);
  }

  private handleMessage(raw: string): void {
    let parsed: IncomingMessage;
    try {
      parsed = JSON.parse(raw) as IncomingMessage;
    } catch {
      console.warn('[sidechannel] non-JSON message dropped');
      return;
    }
    if (
      parsed.type !== 'transcript' ||
      typeof parsed.inputId !== 'string' ||
      typeof parsed.text !== 'string' ||
      typeof parsed.ts !== 'number' ||
      typeof parsed.duration !== 'number'
    ) {
      console.warn('[sidechannel] invalid message dropped', parsed);
      return;
    }
    this.scheduleTranscript({
      inputId: parsed.inputId,
      text: parsed.text,
      ts: parsed.ts,
      duration: parsed.duration,
    });
  }

  private scheduleTranscript(event: TranscriptEvent): void {
    const start = SmelterInstance.getStartTime();
    const wait = start === null ? 0 : start + event.ts - Date.now();
    if (wait <= 0) {
      this.opts.onTranscript(event);
      return;
    }
    setTimeout(() => this.opts.onTranscript(event), wait);
  }

  private spawnSidecar(): void {
    if (process.env.SKIP_PYTHON === '1') {
      console.log(
        '[sidechannel] SKIP_PYTHON=1 — start sidecar manually with these env vars:'
      );
      console.log(
        `  SMELTER_SIDE_CHANNEL_SOCKET_DIR=${this.opts.socketDir} NODE_WS_URL=ws://127.0.0.1:${this.opts.port} python3 ${PYTHON_SCRIPT}`
      );
      return;
    }
    const pythonBin = process.env.SIDECAR_PYTHON || 'python3';
    this.sidecar = spawn(pythonBin, ['-u', PYTHON_SCRIPT], {
      stdio: 'inherit',
      cwd: path.dirname(PYTHON_SCRIPT),
      env: {
        ...process.env,
        SMELTER_SIDE_CHANNEL_SOCKET_DIR: this.opts.socketDir,
        NODE_WS_URL: `ws://127.0.0.1:${this.opts.port}`,
      },
    });
    this.sidecar.on('exit', code => console.log(`[sidechannel] python exited with code ${code}`));
  }

  stop(): void {
    this.sidecar?.kill('SIGINT');
    this.sidecar = null;
  }
}
