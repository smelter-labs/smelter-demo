import { AvailableShader, Input } from '@/app/actions/actions';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/spinner';
import {
  X as XIcon,
  ToggleLeft,
  ToggleRight,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

interface ShaderPanelProps {
  input: Input;
  availableShaders: AvailableShader[];
  sliderValues: { [key: string]: number };
  paramLoading: { [shaderId: string]: string | null };
  shaderLoading: string | null;
  onShaderToggle: (shaderId: string) => void;
  onShaderRemove: (shaderId: string) => void;
  onSliderChange: (
    shaderId: string,
    paramName: string,
    newValue: number,
  ) => void;
  getShaderParamConfig: (
    shaderId: string,
    paramName: string,
  ) => { paramName: string; paramValue: number } | undefined;
  getShaderButtonClass: (enabled: boolean) => string;
  consolidated?: boolean;
}

export default function ShaderPanel({
  input,
  availableShaders,
  sliderValues,
  paramLoading,
  shaderLoading,
  onShaderToggle,
  onShaderRemove,
  onSliderChange,
  getShaderParamConfig,
  getShaderButtonClass,
  consolidated,
}: ShaderPanelProps) {
  const [openShaderId, setOpenShaderId] = useState<string | null>(null);

  if (consolidated) {
    return (
      <div
        className='mt-2 cursor-default'
        data-no-dnd
        data-tour='shader-params-container'>
        {availableShaders.map((shader) => {
          const enabled =
            input.shaders?.find((s) => s.shaderId === shader.id)?.enabled ??
            false;
          return (
            <div
              key={shader.id}
              className='mb-3 p-4 rounded-xl border-2 transition-all duration-300 bg-purple-100 border-[#414154] shadow-md'>
              <div className='flex items-center justify-between'>
                <div className='text-base font-semibold text-white-100 truncate'>
                  {shader.name}
                </div>
                <div className='flex items-center gap-2'>
                  {enabled ? (
                    <Button
                      data-no-dnd
                      size='sm'
                      variant='ghost'
                      className='h-8 w-8 p-2 rounded-md border-2 border-[#414154] bg-purple-100 hover:bg-purple-100/80 cursor-pointer'
                      aria-label='Remove shader'
                      onClick={() => onShaderRemove(shader.id)}>
                      <Trash2 className='text-white-100 size-5' />
                    </Button>
                  ) : (
                    <Button
                      data-no-dnd
                      size='sm'
                      variant='ghost'
                      className='h-8 px-3 rounded-md text-white-100 border-2 border-[#414154] bg-purple-100 hover:bg-purple-100/80 cursor-pointer'
                      aria-label='Enable shader'
                      onClick={() => onShaderToggle(shader.id)}>
                      Enable
                    </Button>
                  )}
                </div>
              </div>
              <div className='mt-2 text-xs text-white opacity-80'>
                {shader.description}
              </div>
              {enabled && shader.params && shader.params.length > 0 && (
                <div className='mt-3 space-y-5' data-no-dnd>
                  <div className='border-t border-purple-800 -mx-4 px-4 pt-3' />
                  {shader.params.map((param) => {
                    const paramConfig = getShaderParamConfig(
                      shader.id,
                      param.name,
                    );
                    const key = `${shader.id}:${param.name}`;
                    const paramValue =
                      key in sliderValues
                        ? sliderValues[key]
                        : (paramConfig?.paramValue ?? param.defaultValue ?? 0);
                    return (
                      <ShaderParamSlider
                        key={param.name}
                        param={param}
                        paramValue={paramValue}
                        loading={paramLoading[shader.id] === param.name}
                        onChange={(value) =>
                          onSliderChange(shader.id, param.name, value)
                        }
                        sliderClass={
                          'w-full h-2 rounded bg-purple-500/20 outline-none transition-all duration-300 shadow-inner ' +
                          'appearance-none focus:outline-none focus:ring-2 focus:ring-red-400'
                        }
                        accentColor='#ef4444'
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className='mt-2 cursor-default' data-no-dnd>
      {availableShaders.map((shader) => {
        const enabled =
          input.shaders?.find((s) => s.shaderId === shader.id)?.enabled ??
          false;
        return (
          <div
            key={shader.name}
            className={`mb-3 p-4 rounded-xl border transition-all duration-500
              ${
                enabled
                  ? 'bg-purple-900/90 border-purple-300 shadow-xl'
                  : 'bg-purple-900/70 border-purple-700 shadow-md'
              }
            `}>
            <div className='flex items-center justify-between mb-2'>
              <div>
                <h3 className='font-semibold text-white-100 text-lg drop-shadow-sm'>
                  {shader.name}
                </h3>
                <p className='text-xs text-white opacity-80'>
                  {shader.description}
                </p>
              </div>
              <div className='flex items-center gap-2'>
                {shader.params && shader.params.length > 0 && (
                  <Button
                    data-no-dnd
                    size='sm'
                    variant='ghost'
                    className='transition-all duration-300 ease-in-out h-8 w-8 p-2 cursor-pointer'
                    aria-label='Configure shader'
                    onClick={() => setOpenShaderId(shader.id)}>
                    <SlidersHorizontal className='text-purple-60 size-5' />
                  </Button>
                )}
                <Button
                  data-no-dnd
                  size='sm'
                  variant='ghost'
                  className='transition-all duration-300 ease-in-out h-8 w-8 p-2 cursor-pointer'
                  aria-label={enabled ? 'Disable shader' : 'Enable shader'}
                  disabled={shaderLoading === shader.id}
                  onClick={() => onShaderToggle(shader.id)}>
                  {shaderLoading === shader.id ? (
                    <LoadingSpinner size='sm' variant='spinner' />
                  ) : enabled ? (
                    <ToggleRight className='text-react-100 size-5' />
                  ) : (
                    <ToggleLeft className='text-purple-60 size-5' />
                  )}
                </Button>
                <Button
                  data-no-dnd
                  size='sm'
                  variant='ghost'
                  className='transition-all duration-300 ease-in-out h-8 w-8 p-2 cursor-pointer'
                  aria-label='Remove shader'
                  onClick={() => onShaderRemove(shader.id)}>
                  <XIcon className='text-red-40 size-5' />
                </Button>
              </div>
            </div>
            {/* Sliders moved to modal */}
          </div>
        );
      })}

      {openShaderId && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center'
          data-no-dnd
          onClick={() => setOpenShaderId(null)}>
          <div className='absolute inset-0 bg-black/60' />
          <div
            className='relative z-10 w-full max-w-xl mx-4 rounded-xl border border-purple-700 bg-black-90 shadow-xl'
            onClick={(e) => e.stopPropagation()}>
            <div className='flex items-center justify-between p-4 border-b border-purple-800'>
              <div className='text-white-100 font-medium'>
                {availableShaders.find((s) => s.id === openShaderId)?.name ||
                  'Shader configuration'}
              </div>
              <button
                className='h-8 w-8 p-2 text-white-80 hover:text-white-100'
                onClick={() => setOpenShaderId(null)}
                aria-label='Close modal'>
                <XIcon className='size-4' />
              </button>
            </div>
            <div
              className='max-h-[70vh] overflow-auto p-4 space-y-5'
              data-tour='shader-params-container'>
              {(() => {
                const shader = availableShaders.find(
                  (s) => s.id === openShaderId,
                );
                if (!shader || !shader.params || shader.params.length === 0) {
                  return (
                    <div className='text-sm text-white-80'>
                      No configurable parameters for this shader.
                    </div>
                  );
                }
                return shader.params.map((param) => {
                  const paramConfig = getShaderParamConfig(
                    shader.id,
                    param.name,
                  );
                  const key = `${shader.id}:${param.name}`;
                  const paramValue =
                    key in sliderValues
                      ? sliderValues[key]
                      : (paramConfig?.paramValue ?? param.defaultValue ?? 0);
                  return (
                    <ShaderParamSlider
                      key={param.name}
                      param={param}
                      paramValue={paramValue}
                      loading={paramLoading[shader.id] === param.name}
                      onChange={(value) =>
                        onSliderChange(shader.id, param.name, value)
                      }
                      sliderClass={
                        'w-full h-2 rounded bg-purple-400 outline-none transition-all duration-300 shadow-inner ' +
                        'appearance-none focus:outline-none focus:ring-2 focus:ring-purple-400'
                      }
                    />
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShaderParamSlider({
  param,
  paramValue,
  loading: _loading,
  onChange,
  sliderClass,
  accentColor,
}: {
  param: {
    name: string;
    minValue?: number;
    maxValue?: number;
    defaultValue?: number;
  };
  paramValue: number;
  loading: boolean;
  onChange: (value: number) => void;
  sliderClass: string;
  accentColor?: string;
}) {
  const min = param?.minValue ?? 0;
  const max = param?.maxValue ?? 1;
  const step = (max - min) / 100;

  return (
    <div data-no-dnd className='flex flex-col gap-2' key={param.name}>
      <label className='text-xs text-white-100 font-semibold flex justify-between items-center mb-1'>
        <span className='uppercase tracking-wide'>{param.name}</span>
        <span
          data-no-dnd
          className='ml-2 text-purple-200 font-mono text-sm px-2 py-0.5 rounded bg-purple-950/60 shadow-inner'>
          {typeof paramValue === 'number' ? paramValue.toFixed(2) : paramValue}
        </span>
      </label>
      <input
        data-no-dnd
        type='range'
        min={min}
        max={max}
        step={step}
        value={paramValue}
        onChange={(e) => onChange(Number(e.target.value))}
        className={sliderClass}
        style={{ accentColor: accentColor ?? '#a78bfa' }}
      />
    </div>
  );
}
