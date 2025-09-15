import { useState } from 'react';
import {
  connectInput,
  disconnectInput,
  Input,
  removeInput,
  updateInput,
} from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, X } from 'lucide-react';
import LoadingSpinner from '@/components/ui/spinner';

interface InputEntryProps {
  roomId: string;
  input: Input;
  refreshState: () => Promise<void>;
}

export default function InputEntry({
  roomId,
  input,
  refreshState,
}: InputEntryProps) {
  const [connectionStateLoading, setConnectionStateLoading] = useState(false);
  const muted = input.volume === 0;

  const handleMuteToggle = async () => {
    await updateInput(roomId, input.inputId, { volume: muted ? 1 : 0 });
    await refreshState();
  };

  const handleDelete = async () => {
    console.log('remove input');
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

  const renderMuteButton = () =>
    input.sourceState !== 'offline' && (
      <Button
        data-no-dnd
        size="sm"
        variant="ghost"
        className="transition-all duration-300 ease-in-out h-8 w-8 p-2 cursor-pointer"
        onClick={handleMuteToggle}
      >
        {muted ? (
          <MicOff className="w-3 h-3 text-red-40" />
        ) : (
          <Mic className="w-3 h-3 text-green-60" />
        )}
      </Button>
    );

  const renderDeleteButton = () => (
    <Button
      data-no-dnd
      size="sm"
      variant="ghost"
      className="transition-all duration-300 ease-in-out h-8 w-8 p-2 cursor-pointer"
      onClick={handleDelete}
    >
      <X className="w-3 h-3 text-red-40" />
    </Button>
  );

  const getStatusLabel = () => {
    if (input.status === 'pending' || connectionStateLoading) {
      return <LoadingSpinner size="sm" variant="spinner" />;
    }
    if (input.status === 'connected') return 'Disconnect';
    if (input.status === 'disconnected') return 'Connect';
    return 'unknown';
  };

  const getStatusColor = () => {
    if (input.status === 'connected') return 'bg-red-80 hover:bg-red-80';
    if (input.status === 'disconnected') return 'bg-green-100 hover:bg-green-100';
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

  return (
    <div
      key={input.inputId}
      className="p-2 mb-2 last:mb-0 rounded-md bg-transparent border-2 border-gray-700"
    >
      <div className="flex items-center mb-3">
        <span
          className={`inline-block w-3 h-3 rounded-full mr-2 ${getSourceStateColor()}`}
          aria-label={getSourceStateLabel()}
        />
        <div className="text-s font-medium text-white-100 truncate">
          {input.title}
        </div>
      </div>
      <div className="flex flex-row items-center">
        <div className="flex-1 flex">
          <Button
            data-no-dnd
            size="sm"
            style={{ width: '100%' }}
            className={`text-xs text-white-100 hover:opacity-55 cursor-pointer ${getStatusColor()}`}
            onClick={handleConnectionToggle}
          >
            {getStatusLabel()}
          </Button>
        </div>
        <div className="flex flex-row items-center justify-end flex-1 gap-1">
          {renderMuteButton()}
          {renderDeleteButton()}
        </div>
      </div>
    </div>
  );
}
