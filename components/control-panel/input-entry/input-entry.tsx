import { useState, useRef, useCallback } from 'react';
import {
  AvailableShader,
  connectInput,
  disconnectInput,
  Input,
  removeInput,
  updateInput,
} from '@/app/actions/actions';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, X, SlidersHorizontal } from 'lucide-react';
import LoadingSpinner from '@/components/ui/spinner';
import ShaderPanel from './shader-panel';
import { stopCameraAndConnection } from '../whip-input/utils/preview';
import {
  clearWhipSessionFor,
  loadLastWhipInputId,
  loadWhipSession,
} from '../whip-input/utils/whip-storage';

import { useDriverTourControls } from '@/components/tour/DriverTourContext';

interface InputEntryProps {
  roomId: string;
  input: Input;
  refreshState: () => Promise<void>;
  availableShaders?: AvailableShader[];
  pcRef?: React.MutableRefObject<RTCPeerConnection | null>;
  streamRef?: React.MutableRefObject<MediaStream | null>;
  onWhipDisconnectedOrRemoved?: (inputId: string) => void;
}

function StatusButton({
  input,
  loading,
  showSliders,
  onClick,
}: {
  input: Input;
  loading: boolean;
  showSliders: boolean;
  onClick: () => void;
}) {
  const getStatusLabel = () => {
    if (loading) {
      return <LoadingSpinner size='sm' variant='spinner' />;
    }
    if (showSliders) {
      return (
        <span className='flex items-center'>
          <SlidersHorizontal className='mr-1 text-purple-60' />
          Hide FX
        </span>
      );
    }
    return (
      <span className='flex items-center'>
        <SlidersHorizontal className='mr-1 text-purple-60' />
        Show FX
      </span>
    );
  };

  const getStatusColor = () => {
    if (showSliders) return 'bg-purple-60 hover:bg-purple-60';
    return 'bg-gray-800 hover:bg-purple-60';
  };

  return (
    <Button
      data-no-dnd
      size='sm'
      style={{ width: '100%' }}
      className={`text-xs text-white-100 hover:opacity-75 cursor-pointer ${getStatusColor()} transition-all duration-200`}
      onClick={onClick}>
      {getStatusLabel()}
    </Button>
  );
}

function MuteButton({
  muted,
  disabled,
  onClick,
}: {
  muted: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  if (disabled) return null;
  return (
    <Button
      data-no-dnd
      size='sm'
      variant='ghost'
      className='transition-all duration-300 ease-in-out h-8 w-8 p-2 cursor-pointer'
      onClick={onClick}>
      {muted ? (
        <MicOff className=' text-red-40 size-5' />
      ) : (
        <Mic className=' text-green-60 size-5' />
      )}
    </Button>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      data-no-dnd
      size='sm'
      variant='ghost'
      className='transition-all duration-300 ease-in-out h-6 w-6 p-2 cursor-pointer'
      onClick={onClick}>
      <X className=' text-red-40 size-5' />
    </Button>
  );
}

export default function InputEntry({
  roomId,
  input,
  refreshState,
  availableShaders = [],
  pcRef,
  streamRef,
  onWhipDisconnectedOrRemoved,
}: InputEntryProps) {
  const [connectionStateLoading, setConnectionStateLoading] = useState(false);
  const [showSliders, setShowSliders] = useState(false);
  const [shaderLoading, setShaderLoading] = useState<string | null>(null);
  const [paramLoading, setParamLoading] = useState<{
    [shaderId: string]: string | null;
  }>({});
  const muted = input.volume === 0;

  const isWhipInput = input.type === 'whip';

  const lastParamChangeRef = useRef<{ [key: string]: number }>({});
  const [sliderValues, setSliderValues] = useState<{ [key: string]: number }>(
    {},
  );
  const sliderTimers = useRef<{
    [key: string]: NodeJS.Timeout | number | null;
  }>({});

  availableShaders.forEach((availableShader) => {
    if (!input.shaders) {
      input.shaders = [];
    }
    if (!input.shaders.find((s) => s.shaderId === availableShader.id)) {
      input.shaders.push({
        shaderName: availableShader.name,
        shaderId: availableShader.id,
        enabled: false,
        params:
          availableShader.params?.map((param) => ({
            paramName: param.name,
            paramValue: param.defaultValue ?? 0,
          })) || [],
      });
    }
  });

  const handleMuteToggle = useCallback(async () => {
    await updateInput(roomId, input.inputId, {
      volume: muted ? 1 : 0,
      shaders: input.shaders,
    });
    await refreshState();
  }, [roomId, input, muted, refreshState]);

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

  const { nextIf: roomTourNextIf } = useDriverTourControls('room');
  const { nextIf: shadersTourNextIf } = useDriverTourControls('shaders');

  const handleSlidersToggle = useCallback(() => {
    shadersTourNextIf(0);
    setShowSliders((prev) => !prev);
  }, [shadersTourNextIf]);

  const handleShaderToggle = useCallback(
    async (shaderId: string) => {
      if (!input.shaders) return;
      setShaderLoading(shaderId);
      try {
        const newShadersConfig = input.shaders.map((shader) =>
          shader.shaderId === shaderId
            ? { ...shader, enabled: !shader.enabled }
            : shader,
        );
        shadersTourNextIf(1);
        await updateInput(roomId, input.inputId, {
          shaders: newShadersConfig,
          volume: input.volume,
        });
        await refreshState();
      } finally {
        setShaderLoading(null);
      }
    },
    [roomId, input, refreshState, roomTourNextIf],
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // paramLoading is handled in handleSliderChange
      }
    },
    [roomId, input, refreshState],
  );

  const getSourceStateColor = () => {
    if (input.sourceState === 'live') return 'bg-green-60';
    if (input.sourceState === 'offline') return 'bg-red-60';
    return 'bg-gray-500';
  };

  const getSourceStateLabel = () => {
    if (input.sourceState === 'live') return 'Live';
    if (input.sourceState === 'offline') return 'Offline';
    return 'Unknown';
  };

  const getShaderParamConfig = useCallback(
    (shaderId: string, paramName: string) => {
      const shader = input.shaders?.find((s) => s.shaderId === shaderId);
      return shader?.params.find((p) => p.paramName === paramName);
    },
    [input.shaders],
  );

  const getShaderButtonClass = (enabled: boolean) => {
    return (
      'ml-4 cursor-pointer transition-all duration-300 rounded ' +
      (enabled
        ? 'bg-gray-800 text-gray-100 hover:bg-gray-700 shadow-md scale-105'
        : 'bg-gray-200 text-gray-900 hover:bg-gray-300')
    );
  };

  const shaderPanelBase =
    'transition-all duration-1500 ease-in-out transform origin-top overflow-hidden';
  const shaderPanelShow = '';
  const shaderPanelHide = 'pointer-events-none  duration-1500';

  return (
    <>
      <div
        key={input.inputId}
        className='p-2 mb-2 last:mb-0 rounded-md bg-purple-100 border-2 border-[#414154]'>
        <div className='flex items-center mb-3'>
          <span
            className={`inline-block w-3 h-3 rounded-full mr-2 ${getSourceStateColor()}`}
            aria-label={getSourceStateLabel()}
          />
          <div className='text-s font-medium text-white-100 truncate'>
            {input.title}
          </div>
        </div>
        <div className='flex flex-row items-center'>
          <div className='flex-1 flex'>
            <StatusButton
              input={input}
              loading={connectionStateLoading}
              showSliders={showSliders}
              onClick={handleSlidersToggle}
            />
          </div>
          <div className='flex flex-row items-center justify-end flex-1 gap-1'>
            <MuteButton
              muted={muted}
              disabled={input.sourceState === 'offline'}
              onClick={handleMuteToggle}
            />
            {/* <Button
            data-no-dnd
            size='sm'
            variant='ghost'
            className={`transition-all duration-300 ease-in-out h-8 w-8 p-2 cursor-pointer`}
            aria-label={input.status === 'connected' ? 'Disconnect' : 'Connect'}
            disabled={connectionStateLoading}
            onClick={handleConnectionToggle}
          >
            {connectionStateLoading ? (
              <LoadingSpinner size="sm" variant="spinner" />
            ) : (
              input.status === 'connected'
                ? <span className='text-red-80 font-bold'>•</span>
                : <span className='text-green-100 font-bold'>•</span>
            )}
          </Button> */}
            <DeleteButton onClick={handleDelete} />
          </div>
        </div>
        <div
          className={
            shaderPanelBase +
            ' ' +
            (showSliders ? shaderPanelShow : shaderPanelHide)
          }
          aria-hidden={!showSliders}
          style={{
            maxHeight: showSliders ? '500px' : 0,
            height: showSliders ? '100%' : 0,
            transitionProperty: 'opacity, transform, height, max-height',
          }}>
          <ShaderPanel
            input={input}
            availableShaders={availableShaders}
            sliderValues={sliderValues}
            paramLoading={paramLoading}
            shaderLoading={shaderLoading}
            onShaderToggle={handleShaderToggle}
            onSliderChange={handleSliderChange}
            getShaderParamConfig={getShaderParamConfig}
            getShaderButtonClass={getShaderButtonClass}
          />
        </div>
      </div>
    </>
  );
}
