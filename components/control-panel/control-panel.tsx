'use client';

import {
  Input,
  Layout,
  RoomState,
  updateRoom,
  getAvailableShaders,
  addCameraInput,
  getWHIP_URL,
} from '@/app/actions/actions';
import { fadeIn } from '@/utils/animations';
import { motion } from 'framer-motion';
import InputEntry from '@/components/control-panel/input-entry/input-entry';
import { useEffect, useState, useCallback, useRef } from 'react';
import { SortableList } from '@/components/control-panel/sortable-list/sortable-list';
import { SortableItem } from '@/components/control-panel/sortable-list/sortable-item';
import Accordion from '@/components/ui/accordion';
import LayoutSelector from '@/components/layout-selector';
import TwitchAddInputForm from './add-input-form/twitch-add-input-form';
import { Mp4AddInputForm } from './add-input-form/mp4-add-input-form';
import { KickAddInputForm } from './add-input-form/kick-add-input-form';
import { usePathname } from 'next/navigation';
import LoadingSpinner from '@/components/ui/spinner';

type ControlPanelProps = {
  roomId: string;
  roomState: RoomState;
  refreshState: () => Promise<void>;
};
type AddInputResponse = { inputId: string; bearerToken: string };
export type InputWrapper = { id: number; inputId: string };

// ======================= utils =======================

const DEBUG_ICE = false;

function buildIceServers(): RTCIceServer[] {
  const urls =
    process.env.NEXT_PUBLIC_TURN_URLS?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  const username = process.env.NEXT_PUBLIC_TURN_USER;
  const credential = process.env.NEXT_PUBLIC_TURN_PASS;
  const servers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
  if (urls.length && username && credential)
    servers.push({ urls, username, credential });
  return servers;
}

async function waitIceComplete(
  pc: RTCPeerConnection,
  timeoutMs = 2500,
): Promise<RTCSessionDescriptionInit | null> {
  return new Promise((res) => {
    if (pc.iceGatheringState === 'complete') return res(pc.localDescription);
    const t = setTimeout(() => res(pc.localDescription), timeoutMs);
    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(t);
        res(pc.localDescription);
      }
    };
  });
}

function forceH264(transceiver: RTCRtpTransceiver) {
  const caps = RTCRtpSender.getCapabilities('video');
  const h264s =
    caps?.codecs.filter((c) => /video\/H264/i.test(c.mimeType)) ?? [];
  if (h264s.length && transceiver.setCodecPreferences) {
    const isFF = /Firefox/i.test(navigator.userAgent);
    const prefer = isFF
      ? h264s
      : h264s.find((c) => /profile-level-id=42e01f/i.test(c.sdpFmtpLine || ''))
        ? [
            ...h264s.filter((c) =>
              /profile-level-id=42e01f/i.test(c.sdpFmtpLine || ''),
            ),
            ...h264s.filter(
              (c) => !/profile-level-id=42e01f/i.test(c.sdpFmtpLine || ''),
            ),
          ]
        : h264s;
    transceiver.setCodecPreferences(prefer);
  }
}

async function sendWhipOfferLocal(
  inputId: string,
  bearerToken: string,
  sdp: string,
): Promise<{ answer: string; location: string | null }> {
  const WHIP_URL = await getWHIP_URL();
  const res = await fetch(`${WHIP_URL}/whip/${inputId}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/sdp',
      authorization: `Bearer ${bearerToken}`,
    },
    body: sdp,
    cache: 'no-store',
  });
  const answer = await res.text();
  if (!res.ok) throw new Error(`WHIP ${res.status}: ${answer}`);
  return { answer, location: res.headers.get('Location') };
}

async function deleteWhipResource(
  location: string,
  bearerToken: string,
  opts: { keepalive?: boolean } = {},
) {
  try {
    let absolute = location;
    if (!/^https?:\/\//i.test(location)) {
      const WHIP_URL = await getWHIP_URL();
      absolute = `${WHIP_URL.replace(/\/+$/, '')}/${location.replace(/^\/+/, '')}`;
    }
    await fetch(absolute, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${bearerToken}` },
      keepalive: opts.keepalive === true,
    });
  } catch {
    // best-effort
  }
}

function stopStream(s: MediaStream | null) {
  s?.getTracks().forEach((t) => {
    try {
      t.stop();
    } catch {}
  });
}

function attachLocalPreview(stream: MediaStream | null) {
  const el = document.getElementById(
    'local-preview',
  ) as HTMLVideoElement | null;
  if (el && stream) {
    el.srcObject = stream;
    el.play?.().catch(() => {});
  }
}

// session (z LOCATION!)
type WhipSession = {
  roomId: string;
  inputId: string;
  bearerToken: string;
  location: string | null;
  ts: number;
};
const WHIP_SESSION_KEY = 'whip-session-v1';

function saveWhipSession(s: WhipSession) {
  try {
    localStorage.setItem(WHIP_SESSION_KEY, JSON.stringify(s));
  } catch {}
}
function loadWhipSession(): WhipSession | null {
  try {
    const raw = localStorage.getItem(WHIP_SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as WhipSession;
    if (!s.inputId || !s.bearerToken || !s.roomId) return null;
    if (Date.now() - s.ts > 24 * 60 * 60 * 1000) return null;
    return s;
  } catch {
    return null;
  }
}
function clearWhipSession() {
  try {
    localStorage.removeItem(WHIP_SESSION_KEY);
  } catch {}
}

/** uruchamia publikację na danym inputId */
async function startPublish(
  inputId: string,
  bearerToken: string,
  pcRef: React.MutableRefObject<RTCPeerConnection | null>,
  streamRef: React.MutableRefObject<MediaStream | null>,
): Promise<{ location: string | null }> {
  // Media
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  streamRef.current = stream;
  attachLocalPreview(stream);

  // PC
  const pc = new RTCPeerConnection({
    iceServers: buildIceServers(),
    bundlePolicy: 'max-bundle',
  });
  pcRef.current = pc;

  if (DEBUG_ICE) {
    pc.onicecandidate = (e) =>
      console.log('[ICE]', e.candidate?.candidate || 'gathering complete');
    pc.oniceconnectionstatechange = () =>
      console.log('[ICE state]', pc.iceConnectionState);
    pc.onconnectionstatechange = () =>
      console.log('[PC state]', pc.connectionState);
  }

  const vTrack = stream.getVideoTracks()[0];
  const aTrack = stream.getAudioTracks()[0];
  const vTx = pc.addTransceiver(vTrack, {
    direction: 'sendonly',
    sendEncodings: [{ maxBitrate: 1_200_000 }],
  });
  if (aTrack) pc.addTransceiver(aTrack, { direction: 'sendonly' });
  forceH264(vTx);

  await pc.setLocalDescription(await pc.createOffer());
  const offerDesc = await waitIceComplete(pc);
  if (!offerDesc?.sdp) throw new Error('No local SDP after ICE gathering');

  const { answer, location } = await sendWhipOfferLocal(
    inputId,
    bearerToken,
    offerDesc.sdp,
  );
  await pc.setRemoteDescription({ type: 'answer', sdp: answer });

  return { location };
}

// ======================= component =======================

export default function ControlPanel({
  refreshState,
  roomId,
  roomState,
}: ControlPanelProps) {
  // lists/state
  const inputsRef = useRef<Input[]>(roomState.inputs);
  const [inputs, setInputs] = useState<Input[]>(roomState.inputs);
  const everHadInputRef = useRef<boolean>(roomState.inputs.length > 0);
  const [showStreamsSpinner, setShowStreamsSpinner] = useState(
    roomState.inputs.length === 0,
  );
  const spinnerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebRTC refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const pathname = usePathname();
  const isKick = pathname?.toLowerCase().includes('kick');

  const getInputWrappers = useCallback(
    (inputsArg: Input[] = inputsRef.current): InputWrapper[] =>
      inputsArg.map((input, index) => ({ id: index, inputId: input.inputId })),
    [],
  );
  const [inputWrappers, setInputWrappers] = useState<InputWrapper[]>(() =>
    getInputWrappers(roomState.inputs),
  );

  // --- AUTO-RESUME on mount: KILL OLD + CREATE NEW INPUT ---
  useEffect(() => {
    const s = loadWhipSession();
    (async () => {
      try {
        if (pcRef.current) return;

        // 1) best-effort: jeśli mieliśmy starą sesję, spróbuj ją usunąć po stronie ingestu
        if (s?.location && s?.bearerToken) {
          await deleteWhipResource(s.location, s.bearerToken);
        }
        clearWhipSession();

        // 2) zawsze twórz NOWY input na reloadzie
        const resp: AddInputResponse = await addCameraInput(roomId);
        // (opcjonalnie) bez remountów:
        // await refreshState();

        // 3) start publish i zapisz świeżą sesję
        const { location } = await startPublish(
          resp.inputId,
          resp.bearerToken,
          pcRef,
          streamRef,
        );
        saveWhipSession({
          roomId,
          inputId: resp.inputId,
          bearerToken: resp.bearerToken,
          location,
          ts: Date.now(),
        });
      } catch (e) {
        // jeśli nie ma uprawnień do kamery itp., po prostu nie wznawiamy
        console.warn('Auto-resume skipped:', e);
      }
    })();
  }, [roomId]);

  useEffect(() => {
    setInputWrappers(getInputWrappers(inputs));
    inputsRef.current = inputs;
  }, [inputs, getInputWrappers]);

  useEffect(() => {
    setInputs(roomState.inputs);
    inputsRef.current = roomState.inputs;
  }, [roomState.inputs]);

  // shaders
  const [availableShaders, setAvailableShaders] = useState<any[]>([]);
  useEffect(() => {
    let mounted = true;
    getAvailableShaders()
      .then((shaders) => mounted && setAvailableShaders(shaders))
      .catch(() => mounted && setAvailableShaders([]));
    return () => {
      mounted = false;
    };
  }, []);

  // spinner
  useEffect(() => {
    if (inputs.length > 0) everHadInputRef.current = true;
    if (everHadInputRef.current) {
      setShowStreamsSpinner(false);
      if (spinnerTimeoutRef.current) clearTimeout(spinnerTimeoutRef.current);
      spinnerTimeoutRef.current = null;
      return;
    }
    if (inputs.length === 0) {
      setShowStreamsSpinner(true);
      if (spinnerTimeoutRef.current) clearTimeout(spinnerTimeoutRef.current);
      spinnerTimeoutRef.current = setTimeout(
        () => setShowStreamsSpinner(false),
        10000,
      );
    } else {
      setShowStreamsSpinner(false);
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
        spinnerTimeoutRef.current = null;
      }
    }
    return () => {
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
        spinnerTimeoutRef.current = null;
      }
    };
  }, [inputs]);

  const updateOrder = useCallback(
    async (newInputWrappers: InputWrapper[]) => {
      const newOrderIds = newInputWrappers.map((item) => item.inputId);
      await updateRoom(roomId, { inputOrder: newOrderIds });
    },
    [roomId],
  );

  const changeLayout = useCallback(
    async (layout: Layout) => {
      await updateRoom(roomId, { layout });
      await refreshState();
    },
    [roomId, refreshState],
  );

  const handleRefreshState = useCallback(async () => {
    setInputWrappers(getInputWrappers(inputsRef.current));
    await refreshState();
  }, [getInputWrappers, refreshState]);

  // global cleanup – usuń sesję po stronie WHIP przy zamykaniu karty
  useEffect(() => {
    const onUnload = async () => {
      try {
        const s = loadWhipSession();
        if (s?.location) {
          await deleteWhipResource(s.location, s.bearerToken, {
            keepalive: true,
          });
          clearWhipSession();
        }
      } catch {}
      try {
        pcRef.current?.close();
      } catch {}
      stopStream(streamRef.current);
      pcRef.current = null;
      streamRef.current = null;
    };
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);

  // ===== WHIP add (manual) =====
  const [addingWhip, setAddingWhip] = useState(false);

  const handleAddWhip = useCallback(async () => {
    if (addingWhip) return;
    setAddingWhip(true);
    try {
      // skasuj ewentualną starą sesję
      const s = loadWhipSession();
      if (s?.location && s?.bearerToken) {
        await deleteWhipResource(s.location, s.bearerToken);
        clearWhipSession();
      }

      // nowy input + publikacja
      const response: AddInputResponse = await addCameraInput(roomId);
      const { location } = await startPublish(
        response.inputId,
        response.bearerToken,
        pcRef,
        streamRef,
      );

      saveWhipSession({
        roomId,
        inputId: response.inputId,
        bearerToken: response.bearerToken,
        location,
        ts: Date.now(),
      });
      // (opcjonalnie) odśwież UI
      // await handleRefreshState();
    } catch (e: any) {
      console.error('WHIP add failed:', e);
      alert(`Nie udało się dodać wejścia WHIP: ${e?.message || e}`);
      try {
        pcRef.current?.close();
      } catch {}
      stopStream(streamRef.current);
      pcRef.current = null;
      streamRef.current = null;
    } finally {
      setAddingWhip(false);
    }
  }, [addingWhip, roomId]);

  // ======================= render =======================
  return (
    <motion.div
      {...(fadeIn as any)}
      className='flex flex-col flex-1 min-h-0 gap-1 rounded-xl bg-black-90 border border-black-50 pt-6 shadow-sm'>
      {/* Ukryty lokalny podgląd – zapobiega „usypianiu” streamu */}
      <video id='local-preview' muted playsInline autoPlay className='hidden' />

      {!isKick && (
        <Accordion title='Add new Twitch stream' defaultOpen>
          <TwitchAddInputForm
            inputs={inputs}
            roomId={roomId}
            refreshState={handleRefreshState}
          />
        </Accordion>
      )}

      {isKick && (
        <Accordion title='Add new Kick Channel' defaultOpen>
          <KickAddInputForm
            inputs={inputs}
            roomId={roomId}
            refreshState={handleRefreshState}
          />
        </Accordion>
      )}

      <Accordion title='Add new MP4' defaultOpen>
        <Mp4AddInputForm
          inputs={inputs}
          roomId={roomId}
          refreshState={handleRefreshState}
        />
      </Accordion>

      <Accordion title='Add new WHIP input' defaultOpen>
        <div className='flex items-center justify-start p-2'>
          <button
            className='px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700 transition disabled:opacity-50'
            onClick={handleAddWhip}
            disabled={addingWhip}
            type='button'>
            {addingWhip ? (
              <span className='flex items-center gap-2'>
                <LoadingSpinner size='sm' variant='spinner' />
                Adding...
              </span>
            ) : (
              'Add WHIP input'
            )}
          </button>
        </div>
      </Accordion>

      <Accordion title='Streams' defaultOpen>
        <div className='flex-1 overflow-auto relative'>
          <div className='pointer-events-none absolute top-0 left-0 right-0 h-2 z-40' />
          {showStreamsSpinner ? (
            <div className='flex items-center justify-center h-32'>
              <LoadingSpinner size='lg' variant='spinner' />
            </div>
          ) : (
            <SortableList
              items={inputWrappers}
              renderItem={(item) => {
                const input = inputs.find((i) => i.inputId === item.inputId);
                return (
                  <SortableItem id={item.id}>
                    {input && (
                      <InputEntry
                        input={input}
                        refreshState={handleRefreshState}
                        roomId={roomId}
                        availableShaders={availableShaders}
                      />
                    )}
                  </SortableItem>
                );
              }}
              onOrderChange={updateOrder}
            />
          )}
        </div>
      </Accordion>

      <Accordion title='Layouts' defaultOpen>
        <LayoutSelector
          changeLayout={changeLayout}
          activeLayoutId={roomState.layout}
          connectedStreamsLength={roomState.inputs.length}
        />
      </Accordion>
    </motion.div>
  );
}
