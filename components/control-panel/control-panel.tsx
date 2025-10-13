'use client';

import {
  Input,
  Layout,
  RoomState,
  updateRoom,
  getAvailableShaders,
  addCameraInput,
  sendWhipOffer,
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
type AddInputResposne = { inputId: string; bearerToken: string };
export type InputWrapper = { id: number; inputId: string };

export default function ControlPanel({
  refreshState,
  roomId,
  roomState,
}: ControlPanelProps) {
  // --- State / refs ---
  const inputsRef = useRef<Input[]>(roomState.inputs);
  const [inputs, setInputs] = useState<Input[]>(roomState.inputs);
  const everHadInputRef = useRef<boolean>(roomState.inputs.length > 0);

  const [showStreamsSpinner, setShowStreamsSpinner] = useState(
    roomState.inputs.length === 0,
  );
  const spinnerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebRTC refs (żeby nie gubić między renderami)
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const pathname = usePathname();
  const isKick = pathname?.toLowerCase().includes('kick');

  const getInputWrappers = useCallback(
    (inputsArg: Input[] = inputsRef.current): InputWrapper[] =>
      inputsArg.map((input, index) => ({
        id: index,
        inputId: input.inputId,
      })),
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

  // shaders (jak było)
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

  // --- helpers: cleanup / ICE wait ---
  const stopStream = (s: MediaStream | null) => {
    if (!s) return;
    s.getTracks().forEach((t) => t.stop());
  };

  const waitIceComplete = (pc: RTCPeerConnection, timeoutMs = 2000) =>
    new Promise<RTCSessionDescriptionInit | null>((res) => {
      const t = setTimeout(() => res(pc.localDescription), timeoutMs);
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(t);
          res(pc.localDescription);
        }
      };
    });
  const WHIP_URL = 'http://localhost:9000';

  useEffect(() => {
    // sprzątanie przy unmount
    return () => {
      // try { pcRef.current?.close(); } catch { }
      // stopStream(streamRef.current);
      // pcRef.current = null;
      // streamRef.current = null;
    };
  }, []);

  const sendWhipOffer2 = async (
    inputId: string,
    bearerToken: string,
    sdp: any,
  ) => {
    const res = await fetch(`${WHIP_URL}/whip/${inputId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
        Authorization: `Bearer ${bearerToken}`,
      },
      body: sdp,
      // ewentualnie: cache: 'no-store'
    });

    const answer = await res.text();
    console.log('answer', answer);
    return {
      ok: res.ok,
      status: res.status,
      answer,
      location: res.headers.get('Location') ?? null,
    };
  };

  // const v = streamRef.current?.getVideoTracks()[0];
  // console.log('video readyState:', v?.readyState); // 'live' ma być
  // console.log('audio readyState:', streamRef.current?.getAudioTracks()[0]?.readyState);

  // setInterval(async () => {
  //   const stats = await pcRef.current?.getStats();
  //   let out = { bytes: 0, frames: 0, pli: 0, nack: 0, fps: 0 };
  //   stats?.forEach(r => {
  //     if (r.type === 'outbound-rtp' && !r.isRemote) {
  //       out.bytes += r.bytesSent || 0;
  //       out.frames += r.framesEncoded || 0;
  //       out.fps = r.framesPerSecond ?? out.fps;
  //       out.pli += r.pliCount || 0;
  //       out.nack += r.nackCount || 0;
  //     }
  //   });
  //   console.log('[OUT]', out);
  // }, 2000);

  let pc: RTCPeerConnection;
  let stream: MediaStream;
  // --- Add WHIP (kamera) ---
  const [addingWhip, setAddingWhip] = useState(false);
  const handleAddWhip = useCallback(async () => {
    if (addingWhip) return;
    setAddingWhip(true);
    try {
      // 1) utwórz input po stronie serwera (żeby ominąć CORS – serwer niech gada z WHIP/WHEP)
      const response: AddInputResposne = await addCameraInput(roomId);

      // 2) media lokalnie
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;

      // 3) PC z jawny STUN
      pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        bundlePolicy: 'max-bundle',
      });
      // const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });

      const vTrack = stream.getVideoTracks()[0];
      const aTrack = stream.getAudioTracks()[0];

      const vTransceiver = pc.addTransceiver(vTrack, {
        direction: 'sendonly',
        sendEncodings: [{ maxBitrate: 1_200_000 }], // prosto i stabilnie
      });
      if (aTrack) pc.addTransceiver(aTrack, { direction: 'sendonly' });

      const caps = RTCRtpSender.getCapabilities('video');
      const h264 = caps?.codecs.filter(
        (c) =>
          /video\/H264/i.test(c.mimeType) &&
          /profile-level-id=42e01f/i.test(c.sdpFmtpLine || ''),
      );
      if (h264?.length && vTransceiver.setCodecPreferences) {
        vTransceiver.setCodecPreferences(h264);
      }

      pc.onicecandidate = (e) =>
        console.log('[ICE]', e.candidate?.candidate || 'gathering complete');
      pc.oniceconnectionstatechange = () =>
        console.log('[ICE state]', pc.iceConnectionState);
      pc.onconnectionstatechange = () =>
        console.log('[PC state]', pc.connectionState);

      pcRef.current = pc;

      // 4) dodajemy tracki
      //stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // 5) Offer + poczekaj na ICE, część serwerów wymaga complete
      await pc.setLocalDescription(await pc.createOffer());
      const offerDesc = await waitIceComplete(pc);
      if (!offerDesc?.sdp) throw new Error('No local SDP after ICE gathering');

      // 6) Wyślij ofertę do swojej akcji (serwer robi WHIP POST i zwraca answer)
      const whipOfferResponse = await sendWhipOffer2(
        response.inputId,
        response.bearerToken,
        offerDesc.sdp,
      );

      // zakładam, że akcja zwraca { answer: string }
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: whipOfferResponse.answer,
      });

      await handleRefreshState();
    } catch (e: any) {
      console.error('WHIP add failed:', e);
      alert(`Nie udało się dodać wejścia WHIP: ${e?.message || e}`);
      // cleanup on failure
      //try { pcRef.current?.close(); } catch { }
      // stopStream(streamRef.current);
      //  pcRef.current = null;
      // streamRef.current = null;
    } finally {
      setAddingWhip(false);
    }
  }, [addingWhip, roomId, handleRefreshState]);

  // --- Render (Twoje sekcje niżej bez zmian poza przyciskiem WHIP) ---
  return (
    <motion.div
      {...(fadeIn as any)}
      className='flex flex-col flex-1 min-h-0 gap-1 rounded-xl bg-black-90 border border-black-50 pt-6 shadow-sm'>
      {/* ... Twitch/Kick/MP4 accordions bez zmian ... */}

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

      {/* ... Streams + Layouts bez zmian ... */}
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
                const input = inputs.find(
                  (input) => input.inputId === item.inputId,
                );
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
