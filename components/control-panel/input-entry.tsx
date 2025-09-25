import { useState } from 'react';
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
  const muted = input.volume === 0;

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
      console.log(newShadersConfig);
      await updateInput(roomId, input.inputId, {
        shaders: newShadersConfig,
        volume: input.volume,
      });
      await refreshState();
    } finally {
      setShaderLoading(null);
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
      className='transition-all duration-300 ease-in-out h-8 w-8 p-2 cursor-pointer'
      aria-label='Show sliders'
      onClick={handleSlidersToggle}>
      <SlidersHorizontal className='w-3 h-3 text-purple-60' />
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

  return (
    <div
      key={input.inputId}
      className='p-2 mb-2 last:mb-0 rounded-md bg-purple-100 border-2 border-[#414154] '>
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
      {showSliders && (
        <div className='mt-2'>
          {availableShaders?.map((shader) => {
            const enabled = isShaderEnabled(shader.id);
            return (
              <div key={shader.name} className='mb-3 p-2 rounded bg-purple-80'>
                <div className='flex items-center justify-between'>
                  <div>
                    <h3 className='font-semibold'>{shader.name}</h3>
                    <p className='text-xs text-white-80'>
                      {shader.description}
                    </p>
                  </div>
                  <Button
                    data-no-dnd
                    size='sm'
                    variant={enabled ? 'default' : 'outline'}
                    className={`ml-4 cursor-pointer ${enabled ? 'bg-green-60 text-white-100' : ''}`}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
