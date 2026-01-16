import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  AvailableShader,
  connectInput,
  disconnectInput,
  Input,
  removeInput,
  updateInput,
} from '@/app/actions/actions';
import { Button } from '@/components/ui/button';
import { Type, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import ShaderPanel from './shader-panel';
import { StatusButton } from './status-button';
import { MuteButton } from './mute-button';
import { DeleteButton } from './delete-button';
import { AddShaderModal } from './add-shader-modal';
import {
  getSourceStateColor,
  getSourceStateLabel,
  getShaderButtonClass,
} from './utils';
import { handleShaderDrop, handleShaderDragOver } from './shader-drop-handler';
import { stopCameraAndConnection } from '../whip-input/utils/preview';
import {
  clearWhipSessionFor,
  loadLastWhipInputId,
  loadWhipSession,
} from '../whip-input/utils/whip-storage';
import { useDriverTourControls } from '@/components/tour/DriverTourContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface InputEntryProps {
  roomId: string;
  input: Input;
  refreshState: () => Promise<void>;
  availableShaders?: AvailableShader[];
  canRemove?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  pcRef?: React.MutableRefObject<RTCPeerConnection | null>;
  streamRef?: React.MutableRefObject<MediaStream | null>;
  onWhipDisconnectedOrRemoved?: (inputId: string) => void;
  isFxOpen?: boolean;
  onToggleFx?: () => void;
  fxModeOnly?: boolean;
  showGrip?: boolean;
}

export default function InputEntry({
  roomId,
  input,
  refreshState,
  availableShaders = [],
  canRemove = true,
  canMoveUp = true,
  canMoveDown = true,
  pcRef,
  streamRef,
  onWhipDisconnectedOrRemoved,
  isFxOpen,
  onToggleFx,
  fxModeOnly,
  showGrip = true,
}: InputEntryProps) {
  const [connectionStateLoading, setConnectionStateLoading] = useState(false);
  const [showSliders, setShowSliders] = useState(false);
  const [shaderLoading, setShaderLoading] = useState<string | null>(null);
  const [paramLoading, setParamLoading] = useState<{
    [shaderId: string]: string | null;
  }>({});
  const [isAddShaderModalOpen, setIsAddShaderModalOpen] = useState(false);
  const isMobile = useIsMobile();
  const muted = input.volume === 0;
  const showTitle = input.showTitle !== false;

  const isWhipInput = input.type === 'whip';

  const [isComposingTourActive, setIsComposingTourActive] = useState(false);
  useEffect(() => {
    const onStart = (e: any) => {
      try {
        if (e?.detail?.id === 'composing') setIsComposingTourActive(true);
      } catch {}
    };
    const onStop = (e: any) => {
      try {
        if (e?.detail?.id === 'composing') setIsComposingTourActive(false);
      } catch {}
    };
    window.addEventListener('smelter:tour:start', onStart);
    window.addEventListener('smelter:tour:stop', onStop);
    return () => {
      window.removeEventListener('smelter:tour:start', onStart);
      window.removeEventListener('smelter:tour:stop', onStop);
    };
  }, []);

  const lastParamChangeRef = useRef<{ [key: string]: number }>({});
  const [sliderValues, setSliderValues] = useState<{ [key: string]: number }>(
    {},
  );
  const sliderTimers = useRef<{
    [key: string]: NodeJS.Timeout | number | null;
  }>({});

  const effectiveShowSliders =
    typeof isFxOpen === 'boolean' ? isFxOpen : showSliders;

  const visibleShaders = useMemo(
    () =>
      availableShaders.filter((availableShader) =>
        (input.shaders || []).some((s) => s.shaderId === availableShader.id),
      ),
    [availableShaders, input.shaders],
  );

  const addedShaderIds = useMemo(
    () => new Set((input.shaders || []).map((s) => s.shaderId)),
    [input.shaders],
  );

  const handleMuteToggle = useCallback(async () => {
    await updateInput(roomId, input.inputId, {
      volume: muted ? 1 : 0,
      shaders: input.shaders,
    });
    await refreshState();
  }, [roomId, input, muted, refreshState]);

  const handleShowTitleToggle = useCallback(async () => {
    await updateInput(roomId, input.inputId, {
      showTitle: !showTitle,
      shaders: input.shaders,
      volume: input.volume,
    });
    await refreshState();
  }, [roomId, input, showTitle, refreshState]);

  const handleDelete = useCallback(async () => {
    const session = loadWhipSession();
    const isSavedInSession =
      (session &&
        session.roomId === roomId &&
        session.inputId === input.inputId) ||
      loadLastWhipInputId(roomId) === input.inputId;
    const isWhipCandidate =
      input.inputId.indexOf('whip') > 0 || isSavedInSession;
    if (isWhipCandidate && pcRef && streamRef) {
      stopCameraAndConnection(pcRef, streamRef);
    }

    if (isWhipCandidate) {
      try {
        clearWhipSessionFor(roomId, input.inputId);
      } catch {}
      try {
        onWhipDisconnectedOrRemoved?.(input.inputId);
      } catch {}
    }
    await removeInput(roomId, input.inputId);
    await refreshState();
  }, [
    roomId,
    input,
    refreshState,
    pcRef,
    streamRef,
    onWhipDisconnectedOrRemoved,
  ]);

  const handleConnectionToggle = useCallback(async () => {
    setConnectionStateLoading(true);
    try {
      if (input.status === 'connected') {
        if (isWhipInput && pcRef && streamRef) {
          stopCameraAndConnection(pcRef, streamRef);
        }
        await disconnectInput(roomId, input.inputId);
        if (isWhipInput) {
          try {
            onWhipDisconnectedOrRemoved?.(input.inputId);
          } catch {}
        }
      } else if (input.status === 'disconnected') {
        await connectInput(roomId, input.inputId);
      }
      await refreshState();
    } finally {
      setConnectionStateLoading(false);
    }
  }, [
    roomId,
    input,
    refreshState,
    isWhipInput,
    pcRef,
    streamRef,
    onWhipDisconnectedOrRemoved,
  ]);

  const { nextIf: shadersTourNextIf } = useDriverTourControls('shaders');

  const handleSlidersToggle = useCallback(() => {
    setTimeout(() => shadersTourNextIf(0), 50);
    if (onToggleFx) {
      onToggleFx();
    } else {
      setShowSliders((prev) => !prev);
    }
  }, [shadersTourNextIf, onToggleFx]);

  const handleShaderToggle = useCallback(
    async (shaderId: string) => {
      setShaderLoading(shaderId);
      try {
        const existing = (input.shaders || []).find(
          (s) => s.shaderId === shaderId,
        );
        let newShadersConfig: NonNullable<Input['shaders']>;
        if (!existing) {
          const shaderDef = availableShaders.find((s) => s.id === shaderId);
          if (!shaderDef) {
            setShaderLoading(null);
            return;
          }
          newShadersConfig = [
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
        } else {
          newShadersConfig = (input.shaders || []).map((shader) =>
            shader.shaderId === shaderId
              ? { ...shader, enabled: !shader.enabled }
              : shader,
          );
        }
        setTimeout(() => shadersTourNextIf(1), 500);
        await updateInput(roomId, input.inputId, {
          shaders: newShadersConfig,
          volume: input.volume,
        });
        await refreshState();
      } finally {
        setShaderLoading(null);
      }
    },
    [roomId, input, refreshState, shadersTourNextIf],
  );

  const handleSliderChange = useCallback(
    (shaderId: string, paramName: string, newValue: number) => {
      const key = `${shaderId}:${paramName}`;
      setSliderValues((prev) => ({
        ...prev,
        [key]: newValue,
      }));

      if (sliderTimers.current[key]) {
        clearTimeout(sliderTimers.current[key] as number);
      }

      sliderTimers.current[key] = setTimeout(async () => {
        setParamLoading((prev) => ({ ...prev, [shaderId]: paramName }));
        try {
          await handleParamChange(shaderId, paramName, newValue);
        } finally {
          setParamLoading((prev) => ({ ...prev, [shaderId]: null }));
          setSliderValues((prev) => {
            const newVals = { ...prev };
            delete newVals[key];
            return newVals;
          });
        }
      }, 500);
    },
    [roomId, input, refreshState],
  );

  const handleParamChange = useCallback(
    async (shaderId: string, paramName: string, newValue: number) => {
      if (!input.shaders) return;
      const key = `${shaderId}:${paramName}`;
      const now = Date.now();
      const last = lastParamChangeRef.current[key] || 0;
      const elapsed = now - last;
      const wait = elapsed < 5 ? 5 - elapsed : 0;
      try {
        if (wait > 0) {
          await new Promise((resolve) => setTimeout(resolve, wait));
        }
        lastParamChangeRef.current[key] = Date.now();
        const newShadersConfig = input.shaders.map((shader) => {
          if (shader.shaderId !== shaderId) return shader;
          return {
            ...shader,
            params: shader.params.map((param) =>
              param.paramName === paramName
                ? { ...param, paramValue: newValue }
                : param,
            ),
          };
        });
        await updateInput(roomId, input.inputId, {
          shaders: newShadersConfig,
          volume: input.volume,
        });
        await refreshState();
      } finally {
      }
    },
    [roomId, input, refreshState],
  );

  const getShaderParamConfig = useCallback(
    (shaderId: string, paramName: string) => {
      const shader = input.shaders?.find((s) => s.shaderId === shaderId);
      return shader?.params.find((p) => p.paramName === paramName);
    },
    [input.shaders],
  );

  const shaderPanelBase =
    'transition-all duration-1500 ease-in-out transform origin-top overflow-hidden';
  const shaderPanelShow = '';
  const shaderPanelHide = 'pointer-events-none  duration-1500';

  const ensureFxOpen = useCallback(() => {
    if (typeof isFxOpen === 'boolean') {
      if (!isFxOpen) {
        onToggleFx?.();
      }
    } else {
      setShowSliders(true);
    }
  }, [isFxOpen, onToggleFx]);

  const addShaderConfig = useCallback(
    async (shaderId: string) => {
      const shaderDef = availableShaders.find((s) => s.id === shaderId);
      if (!shaderDef) return;
      const already = input.shaders?.find((s) => s.shaderId === shaderId);
      const newConfig = already
        ? input.shaders?.map((s) =>
            s.shaderId === shaderId ? { ...s, enabled: true } : s,
          )
        : [
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
      setShaderLoading(shaderId);
      try {
        await updateInput(roomId, input.inputId, {
          shaders: newConfig,
          volume: input.volume,
        });
        await refreshState();
        ensureFxOpen();
      } finally {
        setShaderLoading(null);
      }
    },
    [availableShaders, input, roomId, refreshState, ensureFxOpen],
  );

  const handleShaderRemove = useCallback(
    async (shaderId: string) => {
      const newConfig = (input.shaders || []).filter(
        (s) => s.shaderId !== shaderId,
      );
      setShaderLoading(shaderId);
      try {
        await updateInput(roomId, input.inputId, {
          shaders: newConfig,
          volume: input.volume,
        });
        await refreshState();
      } finally {
        setShaderLoading(null);
      }
    },
    [input, roomId, refreshState],
  );

  if (fxModeOnly && effectiveShowSliders) {
    const shadersForPanel = availableShaders;
    return (
      <>
        <div
          aria-hidden={!effectiveShowSliders}
          onDragOver={handleShaderDragOver}
          onDrop={(e) =>
            handleShaderDrop({
              e,
              input,
              availableShaders,
              onShaderToggle: handleShaderToggle,
              onAddShader: addShaderConfig,
            })
          }>
          <ShaderPanel
            input={input}
            availableShaders={shadersForPanel}
            sliderValues={sliderValues}
            paramLoading={paramLoading}
            shaderLoading={shaderLoading}
            onShaderToggle={handleShaderToggle}
            onShaderRemove={handleShaderRemove}
            onSliderChange={handleSliderChange}
            getShaderParamConfig={getShaderParamConfig}
            getShaderButtonClass={getShaderButtonClass}
            consolidated={true}
          />
        </div>

        <AddShaderModal
          isOpen={isAddShaderModalOpen}
          onClose={() => setIsAddShaderModalOpen(false)}
          availableShaders={availableShaders}
          addedShaderIds={addedShaderIds}
          onAddShader={addShaderConfig}
        />
      </>
    );
  }

  return (
    <>
      <div
        key={input.inputId}
        className='group relative p-2 mb-2 last:mb-0 rounded-md bg-[#1F1834] border-2 border-[#322D43] overflow-hidden'>
        {!isMobile && showGrip && (
          <div className='absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none'>
            <GripVertical className='w-5 h-5 text-white-60' />
          </div>
        )}
        <div className='flex items-center mb-3 md:pl-7'>
          <span
            className={`inline-block w-3 h-3 rounded-full mr-2 ${getSourceStateColor(input)}`}
            aria-label={getSourceStateLabel(input)}
          />
          <div className='text-s font-medium text-white-100 truncate'>
            {input.title}
          </div>
        </div>
        <div className='flex flex-row items-center min-w-0'>
          <div className='flex-1 flex md:pl-7 min-w-0'>
            {(() => {
              const installedCountForHide = (input.shaders || []).length;
              const hideAddEffectsButton =
                isComposingTourActive &&
                !effectiveShowSliders &&
                installedCountForHide === 0;
              if (hideAddEffectsButton) return null;
              return (
                <StatusButton
                  input={input}
                  loading={connectionStateLoading}
                  showSliders={effectiveShowSliders}
                  onClick={handleSlidersToggle}
                />
              );
            })()}
          </div>
          <div className='flex flex-row items-center justify-end flex-1 gap-0.5 pr-1'>
            <Button
              data-no-dnd
              size='sm'
              variant='ghost'
              className={`transition-all duration-300 ease-in-out h-7 w-7 p-1.5 cursor-pointer ${
                canMoveUp
                  ? 'text-white-100 hover:text-white-100'
                  : 'text-white-60'
              }`}
              disabled={!canMoveUp}
              aria-label='Move up'
              onClick={() => {
                try {
                  window.dispatchEvent(
                    new CustomEvent('smelter:inputs:move', {
                      detail: {
                        roomId,
                        inputId: input.inputId,
                        direction: 'up',
                      },
                    }),
                  );
                } catch {}
              }}>
              <ChevronUp className='size-5' strokeWidth={3} />
            </Button>
            <Button
              data-no-dnd
              size='sm'
              variant='ghost'
              className={`transition-all duration-300 ease-in-out h-7 w-7 p-1.5 cursor-pointer ${
                canMoveDown
                  ? 'text-white-100 hover:text-white-100'
                  : 'text-white-60'
              }`}
              disabled={!canMoveDown}
              aria-label='Move down'
              onClick={() => {
                try {
                  window.dispatchEvent(
                    new CustomEvent('smelter:inputs:move', {
                      detail: {
                        roomId,
                        inputId: input.inputId,
                        direction: 'down',
                      },
                    }),
                  );
                } catch {}
              }}>
              <ChevronDown className='size-5' strokeWidth={3} />
            </Button>
            <Button
              data-no-dnd
              size='sm'
              variant='ghost'
              className='transition-all duration-300 ease-in-out h-7 w-7 p-1.5 cursor-pointer'
              onClick={handleShowTitleToggle}
              aria-label={showTitle ? 'Hide title' : 'Show title'}>
              <span className='relative inline-flex items-center justify-center'>
                <Type
                  className={`${showTitle ? 'text-react-100' : 'text-red-40'} size-5`}
                />
                {!showTitle && (
                  <span className='absolute inset-0 flex items-center justify-center pointer-events-none'>
                    <svg
                      width='20'
                      height='20'
                      viewBox='0 0 20 20'
                      fill='none'
                      className='text-red-40'>
                      <line
                        x1='4'
                        y1='4'
                        x2='16'
                        y2='16'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                      />
                    </svg>
                  </span>
                )}
              </span>
            </Button>
            <MuteButton
              muted={muted}
              disabled={input.sourceState === 'offline'}
              onClick={handleMuteToggle}
            />
            {canRemove && <DeleteButton onClick={handleDelete} />}
          </div>
        </div>
        <div
          className={
            shaderPanelBase +
            ' ' +
            (effectiveShowSliders ? shaderPanelShow : shaderPanelHide)
          }
          aria-hidden={!effectiveShowSliders}
          style={{
            maxHeight: effectiveShowSliders ? '500px' : 0,
            height: effectiveShowSliders ? '100%' : 0,
            transitionProperty: 'opacity, transform, height, max-height',
          }}
          onDragOver={handleShaderDragOver}
          onDrop={(e) =>
            handleShaderDrop({
              e,
              input,
              availableShaders,
              onShaderToggle: handleShaderToggle,
              onAddShader: addShaderConfig,
            })
          }>
          {(() => {
            const shadersForPanel = effectiveShowSliders
              ? availableShaders
              : visibleShaders;
            return (
              <ShaderPanel
                input={input}
                availableShaders={shadersForPanel}
                sliderValues={sliderValues}
                paramLoading={paramLoading}
                shaderLoading={shaderLoading}
                onShaderToggle={handleShaderToggle}
                onShaderRemove={handleShaderRemove}
                onSliderChange={handleSliderChange}
                getShaderParamConfig={getShaderParamConfig}
                getShaderButtonClass={getShaderButtonClass}
                consolidated={effectiveShowSliders}
              />
            );
          })()}
        </div>
      </div>

      <AddShaderModal
        isOpen={isAddShaderModalOpen}
        onClose={() => setIsAddShaderModalOpen(false)}
        availableShaders={availableShaders}
        addedShaderIds={addedShaderIds}
        onAddShader={addShaderConfig}
      />
    </>
  );
}
