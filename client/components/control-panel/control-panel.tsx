'use client';

import { fadeIn } from '@/utils/animations';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

import type {
  Input,
  Layout,
  RoomState,
  AvailableShader,
} from '@/app/actions/actions';
import {
  getAvailableShaders,
  updateRoom as updateRoomAction,
  removeInput,
  updateInput,
  addImageInput,
  addMP4Input,
  getPictureSuggestions,
  getMP4Suggestions,
} from '@/app/actions/actions';

import InputEntry from '@/components/control-panel/input-entry/input-entry';
import { SortableItem } from '@/components/control-panel/sortable-list/sortable-item';
import { SortableList } from '@/components/control-panel/sortable-list/sortable-list';
import Accordion, { type AccordionHandle } from '@/components/ui/accordion';
import LayoutSelector from '@/components/layout-selector';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TwitchAddInputForm from './add-input-form/twitch-add-input-form';
import { Mp4AddInputForm } from './add-input-form/mp4-add-input-form';
import { KickAddInputForm } from './add-input-form/kick-add-input-form';
import { ImageAddInputForm } from './add-input-form/image-add-input-form';
import LoadingSpinner from '@/components/ui/spinner';
import { useAutoResume } from './whip-input/hooks/use-auto-resume';
import { useWhipHeartbeat } from './whip-input/hooks/use-whip-heartbeat';
import { useStreamsSpinner } from './whip-input/hooks/use-streams-spinner';
import { stopCameraAndConnection } from './whip-input/utils/preview';
import { WHIPAddInputForm } from './add-input-form/whip-add-input-form';
import { ScreenshareAddInputForm } from './add-input-form/screenshare-add-input-form';

import {
  loadUserName,
  saveUserName,
  loadWhipSession,
  loadLastWhipInputId,
  clearWhipSession,
  clearLastWhipInputId,
  clearWhipSessionFor,
} from './whip-input/utils/whip-storage';

import { useDriverTourControls } from '../tour/DriverTourContext';

export type ControlPanelProps = {
  roomId: string;
  roomState: RoomState;
  refreshState: () => Promise<void>;
};

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
  const addVideoAccordionRef = useRef<AccordionHandle | null>(null);
  const [inputs, setInputs] = useState<Input[]>(roomState.inputs);
  const { nextIf: nextIfComposing } = useDriverTourControls('composing');

  const { showStreamsSpinner, onInputsChange } = useStreamsSpinner(
    roomState.inputs,
  );

  // Separate refs for camera
  const cameraPcRef = useRef<RTCPeerConnection | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [activeCameraInputId, setActiveCameraInputId] = useState<string | null>(
    () => {
      const session = loadWhipSession();
      return session?.roomId === roomId ? session.inputId : null;
    },
  );
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  // Separate refs for screenshare
  const screensharePcRef = useRef<RTCPeerConnection | null>(null);
  const screenshareStreamRef = useRef<MediaStream | null>(null);
  const [activeScreenshareInputId, setActiveScreenshareInputId] = useState<
    string | null
  >(null);
  const [isScreenshareActive, setIsScreenshareActive] =
    useState<boolean>(false);

  const pathname = usePathname();
  const isKick = pathname?.toLowerCase().includes('kick');

  // Add-input tabs state (always declared at top-level to preserve hook order)
  type AddTab = 'stream' | 'mp4' | 'image' | 'inputs';
  const [addInputActiveTab, setAddInputActiveTab] = useState<AddTab>('stream');

  // Stream sub-tab state (Twitch or Kick)
  type StreamTab = 'twitch' | 'kick';
  const [streamActiveTab, setStreamActiveTab] = useState<StreamTab>(
    isKick ? 'kick' : 'twitch',
  );

  // Inputs sub-tab state (Camera or Screenshare)
  type InputsTab = 'camera' | 'screenshare';
  const [inputsActiveTab, setInputsActiveTab] = useState<InputsTab>('camera');

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
    cameraPcRef,
    cameraStreamRef,
    inputs,
    handleRefreshState,
    setActiveCameraInputId,
    setIsCameraActive,
  );
  useWhipHeartbeat(roomId, activeCameraInputId, isCameraActive);
  useWhipHeartbeat(roomId, activeScreenshareInputId, isScreenshareActive);

  useEffect(() => {
    setInputWrappers(getInputWrappers(inputs));
    inputsRef.current = inputs;
    onInputsChange(inputs);
  }, [inputs, getInputWrappers, onInputsChange]);

  // (moved) reordering effect defined after updateOrder

  useEffect(() => {
    setInputs(roomState.inputs);
    inputsRef.current = roomState.inputs;
    onInputsChange(roomState.inputs);
  }, [roomState.inputs, onInputsChange]);

  // Camera cleanup
  useEffect(() => {
    if (!activeCameraInputId) return;
    const stillExists = inputs.some((i) => i.inputId === activeCameraInputId);
    if (stillExists) return;

    const timeout = setTimeout(() => {
      const existsNow = inputsRef.current.some(
        (i) => i.inputId === activeCameraInputId,
      );
      if (existsNow) return;
      try {
        stopCameraAndConnection(cameraPcRef, cameraStreamRef);
        setIsCameraActive(false);
        const s = loadWhipSession();
        if (s && s.roomId === roomId && s.inputId === activeCameraInputId) {
          clearWhipSession(roomId);
        }
        const lastId = loadLastWhipInputId(roomId);
        if (lastId === activeCameraInputId) clearLastWhipInputId(roomId);
      } finally {
        setActiveCameraInputId(null);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [inputs, activeCameraInputId, roomId]);

  // Screenshare cleanup
  useEffect(() => {
    if (!activeScreenshareInputId) return;
    const stillExists = inputs.some(
      (i) => i.inputId === activeScreenshareInputId,
    );
    if (stillExists) return;

    const timeout = setTimeout(() => {
      const existsNow = inputsRef.current.some(
        (i) => i.inputId === activeScreenshareInputId,
      );
      if (existsNow) return;
      try {
        stopCameraAndConnection(screensharePcRef, screenshareStreamRef);
        setIsScreenshareActive(false);
      } finally {
        setActiveScreenshareInputId(null);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [inputs, activeScreenshareInputId, roomId]);

  const [availableShaders, setAvailableShaders] = useState<AvailableShader[]>(
    [],
  );
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

  // Auto-attach the "multiple-pictures" shader to every input when that layout is active
  useEffect(() => {
    if (roomState.layout !== 'wrapped') return;
    if (!availableShaders || availableShaders.length === 0) return;

    const shaderDef =
      availableShaders.find((s) => s.id === 'multiple-pictures') ||
      availableShaders.find(
        (s) =>
          s.name.toLowerCase().includes('multiple') &&
          s.name.toLowerCase().includes('picture'),
      );
    if (!shaderDef) return;

    (async () => {
      const updates: Promise<any>[] = [];
      for (const input of inputsRef.current) {
        const hasShader = (input.shaders || []).some(
          (s) => s.shaderId === shaderDef.id,
        );
        if (!hasShader) {
          const newShadersConfig = [
            ...(input.shaders || []),
            {
              shaderName: shaderDef.name,
              shaderId: shaderDef.id,
              enabled: true,
              params:
                shaderDef.params?.map((param) => ({
                  paramName: param.name,
                  paramValue: param.defaultValue ?? 0,
                })) || [],
            },
          ];
          updates.push(
            updateInput(roomId, input.inputId, {
              shaders: newShadersConfig,
              volume: input.volume,
            }),
          );
        }
      }
      if (updates.length > 0) {
        try {
          await Promise.allSettled(updates);
          await handleRefreshState();
        } catch {}
      }
    })();
  }, [roomState.layout, availableShaders, roomId, handleRefreshState]);

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

  // Allow reordering via up/down events from InputEntry
  useEffect(() => {
    const onMove = (e: any) => {
      try {
        const { inputId, direction } = e?.detail || {};
        if (!inputId || !direction) return;
        setInputWrappers((prev) => {
          const current = [...prev];
          const idx = current.findIndex((it) => it.inputId === inputId);
          if (idx < 0) return prev;
          const target =
            direction === 'up'
              ? Math.max(0, idx - 1)
              : Math.min(current.length - 1, idx + 1);
          if (target === idx) return prev;
          const [item] = current.splice(idx, 1);
          current.splice(target, 0, item);
          // Persist order asynchronously
          void updateOrder(current);
          return current;
        });
        setListVersion((v) => v + 1);
      } catch {}
    };
    window.addEventListener('smelter:inputs:move', onMove as EventListener);
    return () => {
      window.removeEventListener(
        'smelter:inputs:move',
        onMove as EventListener,
      );
    };
  }, [updateOrder]);

  // When main tour starts, force-switch to Stream tab with Twitch (top-level hook, not inside conditional render)
  useEffect(() => {
    const onStart = (e: any) => {
      try {
        if (e?.detail?.id === 'room') {
          setAddInputActiveTab('stream');
          setStreamActiveTab('twitch');
          // Ensure the "Add Video" accordion is open so the user sees Stream/Twitch form
          addVideoAccordionRef.current?.open();
        }
      } catch {}
    };
    window.addEventListener('smelter:tour:start', onStart);
    return () => window.removeEventListener('smelter:tour:start', onStart);
  }, []);

  const changeLayout = useCallback(
    async (layout: Layout) => {
      try {
        await updateRoomAction(roomId, { layout });
        await refreshState();
        nextIfComposing(2);

        // If switching to wrapped layout, after 2s swap the first two inputs (if there are at least 2)
        if (layout === 'wrapped' && typeof window !== 'undefined') {
          setTimeout(async () => {
            try {
              const currentInputs = inputsRef.current;
              if (!currentInputs || currentInputs.length < 2) return;

              const newWrappers = [...getInputWrappers(currentInputs)];
              // swap first and second
              const temp = newWrappers[0];
              newWrappers[0] = newWrappers[1];
              newWrappers[1] = temp;

              await updateOrder(newWrappers);
            } catch (e) {
              console.warn(
                'Failed to swap first two inputs for wrapped layout:',
                e,
              );
            }
          }, 1000);
        }
      } catch (e) {
        console.error('changeLayout failed:', e);
        alert('Failed to change layout.');
      }
    },
    [roomId, refreshState, nextIfComposing, getInputWrappers, updateOrder],
  );

  useEffect(() => {
    const onUnload = () => {
      stopCameraAndConnection(cameraPcRef, cameraStreamRef);
      stopCameraAndConnection(screensharePcRef, screenshareStreamRef);
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
      stopCameraAndConnection(cameraPcRef, cameraStreamRef);
      stopCameraAndConnection(screensharePcRef, screenshareStreamRef);
      setIsCameraActive(false);
      setIsScreenshareActive(false);
    };
  }, []);

  useEffect(() => {
    const pc = cameraPcRef.current;
    if (!pc) return;

    const handleConnectionStateChange = () => {
      const state = pc.connectionState;

      if (state === 'connected') {
        setIsCameraActive(true);
      } else if (
        state === 'failed' ||
        state === 'disconnected' ||
        state === 'closed'
      ) {
        setIsCameraActive(false);
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
  }, [cameraPcRef]);

  useEffect(() => {
    const pc = screensharePcRef.current;
    if (!pc) return;

    const handleConnectionStateChange = () => {
      const state = pc.connectionState;

      if (state === 'connected') {
        setIsScreenshareActive(true);
      } else if (
        state === 'failed' ||
        state === 'disconnected' ||
        state === 'closed'
      ) {
        setIsScreenshareActive(false);
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
  }, [screensharePcRef]);

  // Track which input has its FX (shader panel) open
  const [openFxInputId, setOpenFxInputId] = useState<string | null>(null);
  useEffect(() => {
    if (!openFxInputId) return;
    // Close FX panel if the input disappears
    if (!inputs.some((i) => i.inputId === openFxInputId)) {
      setOpenFxInputId(null);
    }
  }, [inputs, openFxInputId]);

  // Loading states for Quick Actions buttons
  const [loadingActions, setLoadingActions] = useState<{
    addLogos: boolean;
    addTeam: boolean;
    removeAll: boolean;
  }>({
    addLogos: false,
    addTeam: false,
    removeAll: false,
  });

  // Hide FX panel when any tour starts
  useEffect(() => {
    const deletingRef = { current: false };
    const onTourStart = (_e: Event) => {
      setOpenFxInputId(null);
      try {
        if (deletingRef.current) return;
        const currentInputs = inputsRef.current || [];
        if (currentInputs.length <= 4) return;
        deletingRef.current = true;
        (async () => {
          try {
            const extras = currentInputs.slice(4);
            for (const input of extras) {
              const session = loadWhipSession();
              const isSavedInSession =
                (session &&
                  session.roomId === roomId &&
                  session.inputId === input.inputId) ||
                loadLastWhipInputId(roomId) === input.inputId;
              const isWhipCandidate =
                (input.inputId && input.inputId.indexOf('whip') > 0) ||
                isSavedInSession;
              if (isWhipCandidate) {
                try {
                  stopCameraAndConnection(cameraPcRef, cameraStreamRef);
                  stopCameraAndConnection(
                    screensharePcRef,
                    screenshareStreamRef,
                  );
                } catch {}
                try {
                  clearWhipSessionFor(roomId, input.inputId);
                } catch {}
                if (activeCameraInputId === input.inputId) {
                  setActiveCameraInputId(null);
                  setIsCameraActive(false);
                }
                if (activeScreenshareInputId === input.inputId) {
                  setActiveScreenshareInputId(null);
                  setIsScreenshareActive(false);
                }
              }
              try {
                await removeInput(roomId, input.inputId);
              } catch (err) {
                console.warn('Failed to remove extra input during tour start', {
                  inputId: input.inputId,
                  err,
                });
              }
            }
          } finally {
            await handleRefreshState();
            deletingRef.current = false;
          }
        })();
      } catch {}
    };
    window.addEventListener('smelter:tour:start', onTourStart);
    return () => {
      window.removeEventListener('smelter:tour:start', onTourStart);
    };
  }, []);

  return (
    <motion.div
      {...(fadeIn as any)}
      className='flex flex-col flex-1 min-h-0 gap-1 rounded-xl bg-black-90 border border-black-50 pt-6 shadow-sm'>
      <video id='local-preview' muted playsInline autoPlay className='hidden' />

      {(() => {
        const fxInput =
          openFxInputId && inputs.find((i) => i.inputId === openFxInputId)
            ? inputs.find((i) => i.inputId === openFxInputId)!
            : null;
        if (fxInput) {
          return (
            <Accordion
              title={fxInput.title}
              data-tour='fx-accordion-container'
              defaultOpen
              headerIcon={<ArrowLeft width={18} height={18} />}
              onHeaderClick={() => setOpenFxInputId(null)}>
              <div className='px-0 py-1'>
                <InputEntry
                  input={fxInput}
                  refreshState={handleRefreshState}
                  roomId={roomId}
                  availableShaders={availableShaders}
                  canRemove={inputs.length > 1}
                  canMoveUp={false}
                  canMoveDown={false}
                  pcRef={cameraPcRef}
                  streamRef={cameraStreamRef}
                  isFxOpen={true}
                  fxModeOnly={true}
                  onToggleFx={() => setOpenFxInputId(null)}
                  onWhipDisconnectedOrRemoved={(id) => {
                    if (activeCameraInputId === id) {
                      setActiveCameraInputId(null);
                      setIsCameraActive(false);
                    }
                    if (activeScreenshareInputId === id) {
                      setActiveScreenshareInputId(null);
                      setIsScreenshareActive(false);
                    }
                  }}
                />
              </div>
            </Accordion>
          );
        }
        return (
          <>
            {(() => {
              const tabs: { id: AddTab; label: string }[] = [
                { id: 'stream', label: 'Stream' },
                { id: 'mp4', label: 'MP4' },
                { id: 'image', label: 'Image' },
                { id: 'inputs', label: 'Inputs' },
              ];
              return (
                <Accordion
                  ref={addVideoAccordionRef}
                  title='Add Video'
                  defaultOpen
                  data-accordion='true'>
                  <div className=''>
                    <div className='flex gap-2 sm:gap-3 md:gap-4 lg:gap-4 xl:gap-4 2xl:gap-5 border-b border-[#414154] -mx-4 px-4 justify-center'>
                      {tabs.map((t) => {
                        const isActive = addInputActiveTab === t.id;
                        return (
                          <button
                            key={t.id}
                            className={`py-2 px-2 md:px-3 -mb-[1px] cursor-pointer text-base font-bold transition-colors ${
                              isActive
                                ? 'border-b-[3px] border-red-40 text-white-100'
                                : 'border-b-[3px] border-transparent text-white-75 hover:text-white-100'
                            }`}
                            onClick={() => setAddInputActiveTab(t.id)}>
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className='pt-3'>
                      {addInputActiveTab === 'stream' && (
                        <div>
                          <div className='flex gap-2 sm:gap-3 md:gap-4 lg:gap-4 xl:gap-4 2xl:gap-5 border-b border-[#414154] -mx-4 px-4 mb-3 justify-center'>
                            <button
                              className={`py-2 px-2 md:px-3 -mb-[1px] cursor-pointer text-sm font-bold transition-colors ${
                                streamActiveTab === 'twitch'
                                  ? 'border-b-[3px] border-red-40 text-white-100'
                                  : 'border-b-[3px] border-transparent text-white-75 hover:text-white-100'
                              }`}
                              onClick={() => setStreamActiveTab('twitch')}>
                              Twitch
                            </button>
                            <button
                              className={`py-2 px-2 md:px-3 -mb-[1px] cursor-pointer text-sm font-bold transition-colors ${
                                streamActiveTab === 'kick'
                                  ? 'border-b-[3px] border-red-40 text-white-100'
                                  : 'border-b-[3px] border-transparent text-white-75 hover:text-white-100'
                              }`}
                              onClick={() => setStreamActiveTab('kick')}>
                              Kick
                            </button>
                          </div>
                          {streamActiveTab === 'twitch' && (
                            <div data-tour='twitch-add-input-form-container'>
                              <TwitchAddInputForm
                                inputs={inputs}
                                roomId={roomId}
                                refreshState={handleRefreshState}
                              />
                            </div>
                          )}
                          {streamActiveTab === 'kick' && (
                            <div data-tour='kick-add-input-form-container'>
                              <KickAddInputForm
                                inputs={inputs}
                                roomId={roomId}
                                refreshState={handleRefreshState}
                              />
                            </div>
                          )}
                        </div>
                      )}
                      {addInputActiveTab === 'mp4' && (
                        <div data-tour='mp4-add-input-form-container'>
                          <Mp4AddInputForm
                            inputs={inputs}
                            roomId={roomId}
                            refreshState={handleRefreshState}
                          />
                        </div>
                      )}
                      {addInputActiveTab === 'image' && (
                        <div data-tour='image-add-input-form-container'>
                          <ImageAddInputForm
                            inputs={inputs}
                            roomId={roomId}
                            refreshState={handleRefreshState}
                          />
                        </div>
                      )}
                      {addInputActiveTab === 'inputs' && (
                        <div>
                          <div className='flex gap-2 sm:gap-3 md:gap-4 lg:gap-4 xl:gap-4 2xl:gap-5 border-b border-[#414154] -mx-4 px-4 mb-3 justify-center'>
                            <button
                              className={`py-2 px-2 md:px-3 -mb-[1px] cursor-pointer text-sm font-bold transition-colors ${
                                inputsActiveTab === 'camera'
                                  ? 'border-b-[3px] border-red-40 text-white-100'
                                  : 'border-b-[3px] border-transparent text-white-75 hover:text-white-100'
                              }`}
                              onClick={() => setInputsActiveTab('camera')}>
                              Camera
                            </button>
                            <button
                              className={`py-2 px-2 md:px-3 -mb-[1px] cursor-pointer text-sm font-bold transition-colors ${
                                inputsActiveTab === 'screenshare'
                                  ? 'border-b-[3px] border-red-40 text-white-100'
                                  : 'border-b-[3px] border-transparent text-white-75 hover:text-white-100'
                              }`}
                              onClick={() => setInputsActiveTab('screenshare')}>
                              Screenshare
                            </button>
                          </div>
                          {inputsActiveTab === 'camera' && (
                            <WHIPAddInputForm
                              inputs={inputs}
                              roomId={roomId}
                              refreshState={handleRefreshState}
                              userName={userName}
                              setUserName={setUserName}
                              pcRef={cameraPcRef}
                              streamRef={cameraStreamRef}
                              setActiveWhipInputId={setActiveCameraInputId}
                              setIsWhipActive={setIsCameraActive}
                            />
                          )}
                          {inputsActiveTab === 'screenshare' && (
                            <ScreenshareAddInputForm
                              inputs={inputs}
                              roomId={roomId}
                              refreshState={handleRefreshState}
                              userName={userName}
                              setUserName={setUserName}
                              pcRef={screensharePcRef}
                              streamRef={screenshareStreamRef}
                              setActiveWhipInputId={setActiveScreenshareInputId}
                              setIsWhipActive={setIsScreenshareActive}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Accordion>
              );
            })()}
            {/* Streams list */}
            <Accordion
              title='Streams'
              defaultOpen
              data-tour='streams-list-container'>
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
                    renderItem={(item, index, orderedItems) => {
                      const input = inputs.find(
                        (input) => input.inputId === item.inputId,
                      );
                      const isFirst = index === 0;
                      const isLast = index === orderedItems.length - 1;
                      return (
                        <SortableItem key={item.inputId} id={item.id}>
                          {input && (
                            <InputEntry
                              input={input}
                              refreshState={handleRefreshState}
                              roomId={roomId}
                              availableShaders={availableShaders}
                              canRemove={inputs.length > 1}
                              canMoveUp={!isFirst}
                              canMoveDown={!isLast}
                              pcRef={cameraPcRef}
                              streamRef={cameraStreamRef}
                              isFxOpen={openFxInputId === input.inputId}
                              onToggleFx={() =>
                                setOpenFxInputId((prev) =>
                                  prev === input.inputId ? null : input.inputId,
                                )
                              }
                              onWhipDisconnectedOrRemoved={(id) => {
                                if (activeCameraInputId === id) {
                                  setActiveCameraInputId(null);
                                  setIsCameraActive(false);
                                }
                                if (activeScreenshareInputId === id) {
                                  setActiveScreenshareInputId(null);
                                  setIsScreenshareActive(false);
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
            <Accordion title='Quick Actions' defaultOpen data-accordion='true'>
              <div className='flex flex-col gap-3'>
                <Button
                  size='lg'
                  variant='default'
                  className='bg-purple-80 hover:bg-purple-100 text-white-100 font-semibold cursor-pointer px-4 py-0 h-[48px] sm:h-[52px] text-sm sm:text-base sm:px-7 transition-all'
                  disabled={loadingActions.addLogos}
                  onClick={async () => {
                    setLoadingActions((prev) => ({ ...prev, addLogos: true }));
                    try {
                      // Get all pictures
                      const pictures = await getPictureSuggestions();
                      // Filter logos
                      const logoImages = pictures.pictures.filter((p) =>
                        p.startsWith('logo_'),
                      );

                      // Add all logo images
                      for (const fileName of logoImages) {
                        try {
                          await addImageInput(roomId, fileName);
                        } catch (e) {
                          console.warn(`Failed to add image ${fileName}:`, e);
                        }
                      }

                      await refreshState();
                    } catch (e) {
                      console.error('Failed to add logos:', e);
                    } finally {
                      setLoadingActions((prev) => ({
                        ...prev,
                        addLogos: false,
                      }));
                    }
                  }}>
                  {loadingActions.addLogos ? (
                    <span className='flex items-center gap-2'>
                      <LoadingSpinner size='sm' variant='spinner' />
                      Adding...
                    </span>
                  ) : (
                    'Add Logos'
                  )}
                </Button>
                <Button
                  size='lg'
                  variant='default'
                  className='bg-purple-80 hover:bg-purple-100 text-white-100 font-semibold cursor-pointer px-4 py-0 h-[48px] sm:h-[52px] text-sm sm:text-base sm:px-7 transition-all'
                  disabled={loadingActions.addTeam}
                  onClick={async () => {
                    setLoadingActions((prev) => ({ ...prev, addTeam: true }));
                    try {
                      // Get all mp4s
                      const mp4s = await getMP4Suggestions();
                      // Filter team mp4s
                      const teamMp4s = mp4s.mp4s.filter((m) =>
                        m.startsWith('wrapped_'),
                      );

                      // Add all team mp4s
                      for (const fileName of teamMp4s) {
                        try {
                          await addMP4Input(roomId, fileName);
                        } catch (e) {
                          console.warn(`Failed to add mp4 ${fileName}:`, e);
                        }
                      }

                      await refreshState();
                    } catch (e) {
                      console.error('Failed to add team:', e);
                    } finally {
                      setLoadingActions((prev) => ({
                        ...prev,
                        addTeam: false,
                      }));
                    }
                  }}>
                  {loadingActions.addTeam ? (
                    <span className='flex items-center gap-2'>
                      <LoadingSpinner size='sm' variant='spinner' />
                      Adding...
                    </span>
                  ) : (
                    'Add Team'
                  )}
                </Button>
                <Button
                  size='lg'
                  variant='default'
                  className='bg-purple-80 hover:bg-purple-100 text-white-100 font-semibold cursor-pointer px-4 py-0 h-[48px] sm:h-[52px] text-sm sm:text-base sm:px-7 transition-all'
                  disabled={loadingActions.removeAll}
                  onClick={async () => {
                    setLoadingActions((prev) => ({ ...prev, removeAll: true }));
                    try {
                      // Get all pictures
                      const pictures = await getPictureSuggestions();
                      // Find smelter logo
                      const smelterLogo = pictures.pictures.find(
                        (p) =>
                          p.toLowerCase().includes('smelter') &&
                          p.toLowerCase().includes('logo'),
                      );

                      // Add smelter logo first
                      if (smelterLogo) {
                        try {
                          await addImageInput(roomId, smelterLogo);
                        } catch (e) {
                          console.warn(
                            `Failed to add smelter logo ${smelterLogo}:`,
                            e,
                          );
                        }
                      }

                      // Remove all old inputs
                      const currentInputs = [...inputs];
                      for (const input of currentInputs) {
                        try {
                          await removeInput(roomId, input.inputId);
                        } catch (e) {
                          console.warn(
                            `Failed to remove input ${input.inputId}:`,
                            e,
                          );
                        }
                      }

                      await refreshState();
                    } catch (e) {
                      console.error('Failed to remove all:', e);
                    } finally {
                      setLoadingActions((prev) => ({
                        ...prev,
                        removeAll: false,
                      }));
                    }
                  }}>
                  {loadingActions.removeAll ? (
                    <span className='flex items-center gap-2'>
                      <LoadingSpinner size='sm' variant='spinner' />
                      Removing...
                    </span>
                  ) : (
                    'Remove All'
                  )}
                </Button>
              </div>
            </Accordion>
            {/* Layout selector */}
            <Accordion
              title='Layouts'
              defaultOpen
              data-tour='layout-selector-container'>
              <LayoutSelector
                changeLayout={changeLayout}
                activeLayoutId={roomState.layout}
                connectedStreamsLength={roomState.inputs.length}
              />
            </Accordion>
          </>
        );
      })()}
    </motion.div>
  );
}
