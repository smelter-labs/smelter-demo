import { AvailableShader, Input } from '@/app/actions/actions';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/spinner';

interface ShaderPanelProps {
  input: Input;
  availableShaders: AvailableShader[];
  sliderValues: { [key: string]: number };
  paramLoading: { [shaderId: string]: string | null };
  shaderLoading: string | null;
  onShaderToggle: (shaderId: string) => void;
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
}

export default function ShaderPanel({
  input,
  availableShaders,
  sliderValues,
  paramLoading,
  shaderLoading,
  onShaderToggle,
  onSliderChange,
  getShaderParamConfig,
  getShaderButtonClass,
}: ShaderPanelProps) {
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
              <Button
                data-no-dnd
                size='sm'
                variant='ghost'
                className={getShaderButtonClass(enabled)}
                disabled={shaderLoading === shader.id}
                onClick={() => onShaderToggle(shader.id)}>
                {shaderLoading === shader.id ? (
                  <LoadingSpinner size='sm' variant='spinner' />
                ) : enabled ? (
                  'Disable'
                ) : (
                  'Enable'
                )}
              </Button>
            </div>
            {enabled && shader.params && shader.params.length > 0 && (
              <div
                className='mt-4 space-y-5'
                data-no-dnd
                data-tour='shader-params-container'>
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
                        'w-full h-2 rounded bg-purple-400 outline-none transition-all duration-300 shadow-inner ' +
                        'appearance-none focus:outline-none focus:ring-2 focus:ring-purple-400'
                      }
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

function ShaderParamSlider({
  param,
  paramValue,
  loading,
  onChange,
  sliderClass,
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
        disabled={loading}
        onChange={(e) => onChange(Number(e.target.value))}
        className={sliderClass}
        style={{ accentColor: '#a78bfa' }}
      />
    </div>
  );
}
