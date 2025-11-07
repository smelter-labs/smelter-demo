'use client';

import { fadeIn } from '@/utils/animations';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

import type { Input, Layout, RoomState } from '@/app/actions/actions';
import {
  addCameraInput,
  getAvailableShaders,
  updateRoom as updateRoomAction,
  removeInput,
} from '@/app/actions/actions';

import InputEntry from '@/components/control-panel/input-entry/input-entry';
import { SortableItem } from '@/components/control-panel/sortable-list/sortable-item';
import { SortableList } from '@/components/control-panel/sortable-list/sortable-list';
import Accordion from '@/components/ui/accordion';
import LayoutSelector from '@/components/layout-selector';
import TwitchAddInputForm from './add-input-form/twitch-add-input-form';
import { Mp4AddInputForm } from './add-input-form/mp4-add-input-form';
import { KickAddInputForm } from './add-input-form/kick-add-input-form';
import LoadingSpinner from '@/components/ui/spinner';

import { GenericAddInputForm } from './add-input-form/generic-add-input-form';
import { Button } from '@/components/ui/button';

import { useAutoResume } from './whip-input/hooks/use-auto-resume';
import { useWhipHeartbeat } from './whip-input/hooks/use-whip-heartbeat';
import { useStreamsSpinner } from './whip-input/hooks/use-streams-spinner';
import { stopCameraAndConnection } from './whip-input/utils/preview';

import {
  loadUserName,
  saveUserName,
  loadWhipSession,
  saveWhipSession,
  saveLastWhipInputId,
  loadLastWhipInputId,
  clearWhipSession,
  clearLastWhipInputId,
} from './whip-input/utils/whip-storage';
import { startPublish } from './whip-input/utils/whip-publisher';
import { toast } from 'react-toastify';

export type ControlPanelProps = {
  roomId: string;
  roomState: RoomState;
  refreshState: () => Promise<void>;
};

function WHIPAddInputForm(props: {
  inputs: Input[];
  roomId: string;
  refreshState: () => Promise<void>;
  userName: string;
  setUserName: (name: string) => void;
  pcRef: React.MutableRefObject<RTCPeerConnection | null>;
  streamRef: React.MutableRefObject<MediaStream | null>;
  setActiveWhipInputId: (id: string | null) => void;
  setIsWhipActive: (active: boolean) => void;
}) {
  const {
    inputs,
    roomId,
    refreshState,
    userName,
    setUserName,
    pcRef,
    streamRef,
    setActiveWhipInputId,
    setIsWhipActive,
  } = props;

  const handleAddWhip = async (whipUserName: string) => {
    const cleanedName = whipUserName.trim();
    if (!cleanedName) {
      toast.error('Please enter a username.');
      throw new Error('Please enter a username.');
    }
    try {
      const s = loadWhipSession();
      const response = await addCameraInput(roomId, cleanedName);

      setActiveWhipInputId(response.inputId);
      setIsWhipActive(false);

      const onDisconnected = () => {
        stopCameraAndConnection(pcRef, streamRef);
        setIsWhipActive(false);
      };

      const { location } = await startPublish(
        response.inputId,
        response.bearerToken,
        pcRef,
        streamRef,
        onDisconnected,
      );

      setIsWhipActive(true);

      saveWhipSession({
        roomId,
        inputId: response.inputId,
        bearerToken: response.bearerToken,
        location,
        ts: Date.now(),
      });
      saveLastWhipInputId(roomId, response.inputId);
    } catch (e: any) {
      console.error('WHIP add failed:', e);
      toast.error(`Failed to add WHIP input: ${e?.message || e}`);
      stopCameraAndConnection(pcRef, streamRef);
      setActiveWhipInputId(null);
      setIsWhipActive(false);
      throw e;
    }
  };

  return (
    <GenericAddInputForm<string>
      showArrow={false}
      inputs={inputs}
      refreshState={refreshState}
      suggestions={[]}
      placeholder='Enter a username (e.g. John Smith)'
      initialValue={userName}
      onSubmit={async (whipUserName: string) => {
        await handleAddWhip(whipUserName);
        setUserName(whipUserName);
      }}
      renderSuggestion={(suggestion: string) => suggestion}
      getSuggestionValue={(v) => v}
      buttonText='Add Camera'
      loadingText='Adding...'
      validateInput={(value) =>
        !value ? 'Please enter a username.' : undefined
      }
    />
  );
}

export type InputWrapper = { id: number; inputId: string };

export default function ControlPanel({
  refreshState,
  roomId,
  roomState,
}: ControlPanelProps) {
  const [userName, setUserName] = useState<string>(() => {
    const saved = loadUserName(roomId);
    if (saved) return saved;
    const random = Math.floor(1000 + Math.random() * 9000);
    return `User ${random}`;
  });
  useEffect(() => {
    saveUserName(roomId, userName);
  }, [roomId, userName]);

  const inputsRef = useRef<Input[]>(roomState.inputs);
  const [inputs, setInputs] = useState<Input[]>(roomState.inputs);
  const everHadInputRef = useRef<boolean>(roomState.inputs.length > 0);

  const { showStreamsSpinner, onInputsChange } = useStreamsSpinner(
    roomState.inputs,
  );

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [activeWhipInputId, setActiveWhipInputId] = useState<string | null>(
    () => {
      const session = loadWhipSession();
      return session?.roomId === roomId ? session.inputId : null;
    },
  );
  const [isWhipActive, setIsWhipActive] = useState<boolean>(false);

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
  const [listVersion, setListVersion] = useState<number>(0);
  const handleRefreshState = useCallback(async () => {
    setInputWrappers(getInputWrappers(inputsRef.current));
    setListVersion((v) => v + 1);
    await refreshState();
  }, [getInputWrappers, refreshState]);

  useAutoResume(
    roomId,
    userName,
    pcRef,
    streamRef,
    inputs,
    handleRefreshState,
    setActiveWhipInputId,
    setIsWhipActive,
  );
  useWhipHeartbeat(roomId, activeWhipInputId, isWhipActive);

  useEffect(() => {
    setInputWrappers(getInputWrappers(inputs));
    inputsRef.current = inputs;
    onInputsChange(inputs);
  }, [inputs, getInputWrappers, onInputsChange]);

  useEffect(() => {
    setInputs(roomState.inputs);
    inputsRef.current = roomState.inputs;
    onInputsChange(roomState.inputs);
  }, [roomState.inputs, onInputsChange]);

  useEffect(() => {
    if (!activeWhipInputId) return;
    const stillExists = inputs.some((i) => i.inputId === activeWhipInputId);
    if (stillExists) return;

    const timeout = setTimeout(() => {
      const existsNow = inputsRef.current.some(
        (i) => i.inputId === activeWhipInputId,
      );
      if (existsNow) return;
      try {
        stopCameraAndConnection(pcRef, streamRef);
        setIsWhipActive(false);
        const s = loadWhipSession();
        if (s && s.roomId === roomId && s.inputId === activeWhipInputId) {
          clearWhipSession(roomId);
        }
        const lastId = loadLastWhipInputId(roomId);
        if (lastId === activeWhipInputId) clearLastWhipInputId(roomId);
      } finally {
        setActiveWhipInputId(null);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [inputs, activeWhipInputId, roomId]);

  const [availableShaders, setAvailableShaders] = useState<any[]>([]);
  useEffect(() => {
    let mounted = true;
    getAvailableShaders()
      .then((shaders) => {
        if (mounted) setAvailableShaders(shaders);
      })
      .catch(() => {
        if (mounted) setAvailableShaders([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const updateOrder = useCallback(
    async (newInputWrappers: InputWrapper[]) => {
      try {
        const newOrderIds = newInputWrappers.map((item) => item.inputId);
        await updateRoomAction(roomId, { inputOrder: newOrderIds });
      } catch (e) {
        console.error('updateOrder failed:', e);
        alert('Failed to save stream order.');
      }
    },
    [roomId],
  );

  const changeLayout = useCallback(
    async (layout: Layout) => {
      try {
        await updateRoomAction(roomId, { layout });
        await refreshState();
      } catch (e) {
        console.error('changeLayout failed:', e);
        alert('Failed to change layout.');
      }
    },
    [roomId, refreshState],
  );

  useEffect(() => {
    const onUnload = () => {
      stopCameraAndConnection(pcRef, streamRef);
    };
    window.addEventListener('beforeunload', onUnload);
    window.addEventListener('pagehide', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      window.removeEventListener('pagehide', onUnload);
    };
  }, []);

  useEffect(() => {
    return () => {
      stopCameraAndConnection(pcRef, streamRef);
      setIsWhipActive(false);
    };
  }, []);

  useEffect(() => {
    const pc = pcRef.current;
    if (!pc) return;

    const handleConnectionStateChange = () => {
      const state = pc.connectionState;

      if (state === 'connected') {
        setIsWhipActive(true);
      } else if (
        state === 'failed' ||
        state === 'disconnected' ||
        state === 'closed'
      ) {
        setIsWhipActive(false);
      }
    };

    pc.addEventListener('connectionstatechange', handleConnectionStateChange);

    handleConnectionStateChange();

    return () => {
      pc.removeEventListener(
        'connectionstatechange',
        handleConnectionStateChange,
      );
    };
  }, [pcRef.current]);

  return (
    <motion.div
      {...(fadeIn as any)}
      className='flex flex-col flex-1 min-h-0 gap-1 rounded-xl bg-black-90 border border-black-50 pt-6 shadow-sm'>
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

      <Accordion title='Add new Camera input' defaultOpen>
        {!activeWhipInputId ? (
          <WHIPAddInputForm
            inputs={inputs}
            roomId={roomId}
            refreshState={handleRefreshState}
            userName={userName}
            setUserName={setUserName}
            pcRef={pcRef}
            streamRef={streamRef}
            setActiveWhipInputId={setActiveWhipInputId}
            setIsWhipActive={setIsWhipActive}
          />
        ) : (
          (() => {
            // Find the WHIP input entry if it exists, fallback to userName
            const whipInput = inputs.find(
              (i) => i.inputId === activeWhipInputId,
            );
            const displayName = whipInput?.title || userName;
            return (
              <div className='p-4 rounded-md bg-black-80 border border-black-50 flex items-center justify-between'>
                <div className='text-white-100 text-sm'>
                  User {displayName} is already connected.
                </div>
              </div>
            );
          })()
        )}
      </Accordion>

      {/* Streams list */}
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
              resetVersion={listVersion}
              renderItem={(item) => {
                const input = inputs.find(
                  (input) => input.inputId === item.inputId,
                );

                return (
                  <SortableItem key={item.inputId} id={item.id}>
                    {input && (
                      <InputEntry
                        input={input}
                        refreshState={handleRefreshState}
                        roomId={roomId}
                        availableShaders={availableShaders}
                        pcRef={pcRef}
                        streamRef={streamRef}
                        onWhipDisconnectedOrRemoved={(id) => {
                          if (activeWhipInputId === id) {
                            setActiveWhipInputId(null);
                            setIsWhipActive(false);
                          }
                        }}
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

      {/* Layout selector */}
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
