'use client';

import {
  Input,
  Layout,
  RoomState,
  updateRoom,
  getAvailableShaders,
  addCameraInput,
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

// ===== utils =====
const WHIP_URL =
  process.env.NEXT_PUBLIC_WHIP_URL ||
  'https://puffer.fishjam.io/smelter-demo-whep';
const DEBUG_ICE = false;

function buildIceServers(): RTCIceServer[] {
  // można wstrzyknąć TURN przez env (NEXT_PUBLIC_TURN_*)
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
    // w FF zostaw wszystkie warianty H264; w Chromium możesz dać preferencję baseline 42e01f, ale nie wymagaj
    const prefer = isFF
      ? h264s
      : h264s.find((c) => /profile-level-id=42e01f/i.test(c.sdpFmtpLine || ''))
        ? // baseline najpierw, potem reszta
          [
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

function stopStream(s: MediaStream | null) {
  s?.getTracks().forEach((t) => {
    try {
      t.stop();
    } catch {}
  });
}

// ===== component =====
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

  // global cleanup (tylko na wyjście z widoku/okna)
  useEffect(() => {
    const onUnload = () => {
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
      // nie czyścimy tu – unikamy przypadkowego remount-killa
    };
  }, []);

  // ===== WHIP add (kamera) =====
  const [addingWhip, setAddingWhip] = useState(false);

  const handleAddWhip = useCallback(async () => {
    if (addingWhip) return;
    setAddingWhip(true);
    try {
      // 1) Rejestruj input po swojej stronie
      const response: AddInputResponse = await addCameraInput(roomId);
      await handleRefreshState(); // jeśli to robi remount, pc/stream są w refach i przetrwają

      // 2) Media lokalnie
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;

      // 3) RTCPeerConnection
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

      // 4) Transceivery + H264 (bez simulcastu)
      const vTrack = stream.getVideoTracks()[0];
      const aTrack = stream.getAudioTracks()[0];
      const vTx = pc.addTransceiver(vTrack, {
        direction: 'sendonly',
        sendEncodings: [{ maxBitrate: 1_200_000 }],
      });
      if (aTrack) pc.addTransceiver(aTrack, { direction: 'sendonly' });
      forceH264(vTx);

      // 5) Offer, ICE complete
      await pc.setLocalDescription(await pc.createOffer());
      const offerDesc = await waitIceComplete(pc);
      if (!offerDesc?.sdp) throw new Error('No local SDP after ICE gathering');

      // 6) Wyślij ofertę → WHIP → ustaw answer
      const { answer } = await sendWhipOfferLocal(
        response.inputId,
        response.bearerToken,
        offerDesc.sdp,
      );
      await pc.setRemoteDescription({ type: 'answer', sdp: answer });

      // (opcjonalnie) nie odświeżamy tu drugi raz, żeby nie prowokować remountu
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
  }, [addingWhip, roomId, handleRefreshState]);

  // ===== render =====
  return (
    <motion.div
      {...(fadeIn as any)}
      className='flex flex-col flex-1 min-h-0 gap-1 rounded-xl bg-black-90 border border-black-50 pt-6 shadow-sm'>
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
