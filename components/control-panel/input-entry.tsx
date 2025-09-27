import { useState, useRef } from 'react';
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

interface InputEntryProps {
  roomId: string;
  input: Input;
  refreshState: () => Promise<void>;
  availableShaders?: AvailableShader[];
}

export default function InputEntry({
  roomId,
  input,
  refreshState,
  availableShaders,
}: InputEntryProps) {
  const [connectionStateLoading, setConnectionStateLoading] = useState(false);
  const [showSliders, setShowSliders] = useState(false);
  const [shaderLoading, setShaderLoading] = useState<string | null>(null);
  const [paramLoading, setParamLoading] = useState<{
    [shaderId: string]: string | null;
  }>({});
  const muted = input.volume === 0;

  // Ref to keep track of last param change time per shader/param
  const lastParamChangeRef = useRef<{ [key: string]: number }>({});

  // For debounced slider UI: store local values and timers per shader/param
  const [sliderValues, setSliderValues] = useState<{ [key: string]: number }>(
    {},
  );
  const sliderTimers = useRef<{
    [key: string]: NodeJS.Timeout | number | null;
  }>({});

  const handleMuteToggle = async () => {
    await updateInput(roomId, input.inputId, {
      volume: muted ? 1 : 0,
      shaders: input.shaders,
    });
    await refreshState();
  };

  const handleDelete = async () => {
    await removeInput(roomId, input.inputId);
    await refreshState();
  };

  const handleConnectionToggle = async () => {
    setConnectionStateLoading(true);
    try {
      if (input.status === 'connected') {
        await disconnectInput(roomId, input.inputId);
        input.status = 'disconnected';
      } else if (input.status === 'disconnected') {
        await connectInput(roomId, input.inputId);
        input.status = 'connected';
      }
      await refreshState();
    } finally {
      setConnectionStateLoading(false);
    }
  };

  // Ensure shadersConfig is initialized and all available shaders are present
  availableShaders?.forEach((availableShader) => {
    if (!input.shaders) {
      input.shaders = [];
    }
    if (!input.shaders?.find((s) => s.shaderId === availableShader.id)) {
      input.shaders?.push({
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

  const handleSlidersToggle = () => {
    setShowSliders((prev) => !prev);
  };

  const handleShaderToggle = async (shaderId: string) => {
    if (!input.shaders) return;
    setShaderLoading(shaderId);
    try {
      // Find the shader config and toggle its enabled state
      const newShadersConfig = input.shaders.map((shader) =>
        shader.shaderId === shaderId
          ? { ...shader, enabled: !shader.enabled }
          : shader,
      );
      await updateInput(roomId, input.inputId, {
        shaders: newShadersConfig,
        volume: input.volume,
      });
      await refreshState();
    } finally {
      setShaderLoading(null);
    }
  };

  // Debounced parameter change: only update after 500ms of no changes
  const handleSliderChange = (
    shaderId: string,
    paramName: string,
    newValue: number,
  ) => {
    const key = `${shaderId}:${paramName}`;
    setSliderValues((prev) => ({
      ...prev,
      [key]: newValue,
    }));

    // Clear any existing timer
    if (sliderTimers.current[key]) {
      clearTimeout(sliderTimers.current[key] as number);
    }

    sliderTimers.current[key] = setTimeout(async () => {
      setParamLoading((prev) => ({ ...prev, [shaderId]: paramName }));
      try {
        await handleParamChange(shaderId, paramName, newValue);
      } finally {
        setParamLoading((prev) => ({ ...prev, [shaderId]: null }));
        // After update, clear the local slider value so UI syncs with input.shaders
        setSliderValues((prev) => {
          const newVals = { ...prev };
          delete newVals[key];
          return newVals;
        });
      }
    }, 500);
  };

  // handle parameter slider change with at least 100ms break between requests per shader/param
  const handleParamChange = async (
    shaderId: string,
    paramName: string,
    newValue: number,
  ) => {
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
  };

  const renderMuteButton = () =>
    input.sourceState !== 'offline' && (
      <Button
        data-no-dnd
        size='sm'
        variant='ghost'
        className='transition-all duration-300 ease-in-out h-8 w-8 p-2 cursor-pointer'
        onClick={handleMuteToggle}>
        {muted ? (
          <MicOff className='w-3 h-3 text-red-40' />
        ) : (
          <Mic className='w-3 h-3 text-green-60' />
        )}
      </Button>
    );

  const renderDeleteButton = () => (
    <Button
      data-no-dnd
      size='sm'
      variant='ghost'
      className='transition-all duration-300 ease-in-out h-8 w-8 p-2 cursor-pointer'
      onClick={handleDelete}>
      <X className='w-3 h-3 text-red-40' />
    </Button>
  );

  const renderSlidersButton = () => (
    <Button
      data-no-dnd
      size='sm'
      variant='ghost'
      className={`transition-all duration-300 ease-in-out h-8 w-8 p-2 cursor-pointer ${
        showSliders ? 'text-red-40' : ''
      }`}
      aria-label='Show sliders'
      onClick={handleSlidersToggle}>
      <SlidersHorizontal
        className={`w-3 h-3 ${showSliders ? 'text-red-40' : 'text-purple-60'}`}
      />
    </Button>
  );

  const getStatusLabel = () => {
    if (input.status === 'pending' || connectionStateLoading) {
      return <LoadingSpinner size='sm' variant='spinner' />;
    }
    if (input.status === 'connected') return 'Disconnect';
    if (input.status === 'disconnected') return 'Connect';
    return 'unknown';
  };

  const getStatusColor = () => {
    if (input.status === 'connected') return 'bg-red-80 hover:bg-red-80';
    if (input.status === 'disconnected')
      return 'bg-green-100 hover:bg-green-100';
    return '';
  };

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

  // Helper to get enabled state for a shader
  const isShaderEnabled = (shaderId: string) => {
    return (
      input.shaders?.find((s) => s.shaderId === shaderId)?.enabled ?? false
    );
  };

  // Helper to get shader config for a shaderId
  const getShaderConfig = (shaderId: string) => {
    return input.shaders?.find((s) => s.shaderId === shaderId);
  };

  // Helper to get param config for a shaderId and paramName
  const getShaderParamConfig = (shaderId: string, paramName: string) => {
    const shader = getShaderConfig(shaderId);
    return shader?.params.find((p) => p.paramName === paramName);
  };

  // Helper to get param definition from availableShaders
  const getShaderParamDef = (shaderId: string, paramName: string) => {
    const shader = availableShaders?.find((s) => s.id === shaderId);
    return shader?.params?.find((p) => p.name === paramName);
  };

  // Animation classes for showing/hiding shaders config
  const shaderPanelBase =
    'transition-all duration-500 ease-in-out transform origin-top';
  const shaderPanelShow = 'opacity-100 scale-100 translate-y-0';
  const shaderPanelHide =
    'opacity-0 scale-95 -translate-y-2 pointer-events-none';

  // Flat slider styles (no gradients, simple)
  const sliderClass =
    'w-full h-2 rounded bg-purple-400 outline-none transition-all duration-300 shadow-inner ' +
    'appearance-none focus:outline-none focus:ring-2 focus:ring-purple-400 ' +
    'slider-flat';

  // Add custom styles for the slider thumb and track (flat, no gradients)
  const sliderFlatStyles = (
    <style>
      {`
      input[type="range"].slider-flat::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #a78bfa;
        box-shadow: 0 1px 4px 0 #7c3aed33;
        border: 2px solid #fff;
        transition: background 0.2s, box-shadow 0.2s;
        cursor: pointer;
      }
      input[type="range"].slider-flat:focus::-webkit-slider-thumb {
        background: #c4b5fd;
        box-shadow: 0 2px 8px 0 #a78bfa55;
      }
      input[type="range"].slider-flat::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #a78bfa;
        box-shadow: 0 1px 4px 0 #7c3aed33;
        border: 2px solid #fff;
        transition: background 0.2s, box-shadow 0.2s;
        cursor: pointer;
      }
      input[type="range"].slider-flat:focus::-moz-range-thumb {
        background: #c4b5fd;
        box-shadow: 0 2px 8px 0 #a78bfa55;
      }
      input[type="range"].slider-flat::-ms-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #a78bfa;
        box-shadow: 0 1px 4px 0 #7c3aed33;
        border: 2px solid #fff;
        transition: background 0.2s, box-shadow 0.2s;
        cursor: pointer;
      }
      input[type="range"].slider-flat:focus::-ms-thumb {
        background: #c4b5fd;
        box-shadow: 0 2px 8px 0 #a78bfa55;
      }
      input[type="range"].slider-flat::-webkit-slider-runnable-track {
        height: 8px;
        border-radius: 8px;
        background: #a78bfa;
      }
      input[type="range"].slider-flat:focus::-webkit-slider-runnable-track {
        background: #c4b5fd;
      }
      input[type="range"].slider-flat::-ms-fill-lower {
        background: #a78bfa;
        border-radius: 8px;
      }
      input[type="range"].slider-flat::-ms-fill-upper {
        background: #a78bfa;
        border-radius: 8px;
      }
      input[type="range"].slider-flat:focus::-ms-fill-lower {
        background: #c4b5fd;
      }
      input[type="range"].slider-flat:focus::-ms-fill-upper {
        background: #c4b5fd;
      }
      input[type="range"].slider-flat::-moz-range-track {
        height: 8px;
        border-radius: 8px;
        background: #a78bfa;
      }
      input[type="range"].slider-flat:focus::-moz-range-track {
        background: #c4b5fd;
      }
      input[type="range"].slider-flat::-ms-tooltip {
        display: none;
      }
      `}
    </style>
  );

  // Custom classes for shader enable/disable button
  // Enable: bg-gray-200 text-gray-900, Disable: bg-gray-800 text-gray-100
  // Both: transition, rounded, shadow, etc.
  const getShaderButtonClass = (enabled: boolean) => {
    return (
      'ml-4 cursor-pointer transition-all duration-300 rounded ' +
      (enabled
        ? 'bg-gray-800 text-gray-100 hover:bg-gray-700 shadow-md scale-105'
        : 'bg-gray-200 text-gray-900 hover:bg-gray-300')
    );
  };

  return (
    <div
      key={input.inputId}
      className='p-2 mb-2 last:mb-0 rounded-md bg-purple-100 border-2 border-[#414154]'>
      {sliderFlatStyles}
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
          <Button
            data-no-dnd
            size='sm'
            style={{ width: '100%' }}
            className={`text-xs text-white-100 hover:opacity-55 cursor-pointer ${getStatusColor()}`}
            onClick={handleConnectionToggle}>
            {getStatusLabel()}
          </Button>
        </div>
        <div className='flex flex-row items-center justify-end flex-1 gap-1'>
          {renderMuteButton()}
          {renderSlidersButton()}
          {renderDeleteButton()}
        </div>
      </div>
      {/* Animated shaders panel */}
      <div
        className={
          shaderPanelBase +
          ' ' +
          (showSliders ? shaderPanelShow : shaderPanelHide)
        }
        style={{
          maxHeight: showSliders ? 1000 : 0,
          transitionProperty: 'opacity, transform, max-height',
        }}>
        {showSliders && (
          <div className='mt-2'>
            {availableShaders?.map((shader) => {
              const enabled = isShaderEnabled(shader.id);
              const shaderConfig = getShaderConfig(shader.id);
              return (
                <div
                  key={shader.name}
                  className='mb-3 p-4 rounded-xl bg-purple-900/80 border border-purple-400 shadow-lg transition-all duration-500'
                  style={{
                    color: '#fff',
                    boxShadow: enabled
                      ? '0 4px 24px 0 #a78bfa55'
                      : '0 2px 8px 0 #7c3aed33',
                    borderColor: enabled ? '#a78bfa' : '#7c3aed',
                  }}>
                  <div className='flex items-center justify-between mb-2'>
                    <div>
                      <h3 className='font-semibold text-white-100 text-lg drop-shadow-sm'>
                        {shader.name}
                      </h3>
                      <p className='text-xs text-white-80 opacity-80'>
                        {shader.description}
                      </p>
                    </div>
                    <Button
                      data-no-dnd
                      size='sm'
                      variant='ghost'
                      className={getShaderButtonClass(enabled)}
                      disabled={shaderLoading === shader.id}
                      onClick={() => handleShaderToggle(shader.id)}>
                      {shaderLoading === shader.id ? (
                        <LoadingSpinner size='sm' variant='spinner' />
                      ) : enabled ? (
                        'Disable'
                      ) : (
                        'Enable'
                      )}
                    </Button>
                  </div>
                  {/* Sliders for shader parameters */}
                  {enabled && shader.params && shader.params.length > 0 && (
                    <div className='mt-4 space-y-5' data-no-dnd>
                      {shader.params.map((param) => {
                        // Get current value from input.shaders
                        const paramConfig = getShaderParamConfig(
                          shader.id,
                          param.name,
                        );
                        const key = `${shader.id}:${param.name}`;
                        // Use local slider value if present, else use paramValue from input.shaders
                        const paramValue =
                          key in sliderValues
                            ? sliderValues[key]
                            : (paramConfig?.paramValue ??
                              param.defaultValue ??
                              0);
                        const paramDef = getShaderParamDef(
                          shader.id,
                          param.name,
                        );
                        const min = paramDef?.minValue ?? 0;
                        const max = paramDef?.maxValue ?? 1;
                        const step = (max - min) / 100;
                        return (
                          <div
                            data-no-dnd
                            key={param.name}
                            className='flex flex-col gap-2'>
                            <label className='text-xs text-white-100 font-semibold flex justify-between items-center mb-1'>
                              <span className='uppercase tracking-wide'>
                                {param.name}
                              </span>
                              <span
                                data-no-dnd
                                className='ml-2 text-purple-200 font-mono text-sm px-2 py-0.5 rounded bg-purple-900/60 shadow-inner'>
                                {typeof paramValue === 'number'
                                  ? paramValue.toFixed(2)
                                  : paramValue}
                              </span>
                            </label>
                            <input
                              data-no-dnd
                              type='range'
                              min={min}
                              max={max}
                              step={step}
                              value={paramValue}
                              disabled={paramLoading[shader.id] === param.name}
                              onChange={(e) => {
                                const value = Number(e.target.value);
                                handleSliderChange(
                                  shader.id,
                                  param.name,
                                  value,
                                );
                              }}
                              className={sliderClass}
                              style={{
                                accentColor: '#a78bfa',
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
