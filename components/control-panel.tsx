import { Button } from '@/components/ui/button';
import { ArrowUp, Mic, MicOff, X } from 'lucide-react';
import {
  addInput,
  connectInput,
  disconnectInput,
  Input,
  InputSuggestions,
  removeInput,
  updateInput,
  updateRoom,
} from '@/app/actions';
import { fadeIn } from '@/utils/animations';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle } from './ui/card';
import { useState } from 'react';
import LoadingSpinner from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-toastify';

type ControlPanelProps = {
  roomId: string;
  inputs: Input[];
  suggestions: InputSuggestions;
  refreshState: () => Promise<void>;
};

export default function ControlPanel({
  refreshState,
  roomId,
  inputs,
  suggestions,
}: ControlPanelProps) {
  const moveInputToTheTop = async (inputId: string) => {
    const newInputOrder = [
      inputId,
      ...inputs.map((input) => input.inputId).filter((id) => id !== inputId),
    ];
    updateRoom(roomId, { inputOrder: newInputOrder });
  };
  return (
    <motion.div
      {...(fadeIn as any)}
      className='flex flex-col flex-1 min-h-0 gap-1 rounded-xl bg-black-90 border border-black-50 pt-6 shadow-sm'>
      <CardHeader className='pb-3'>
        <CardTitle className='text-sm font-medium text-white-75'>
          Streams
        </CardTitle>
      </CardHeader>
      <div className='flex flex-col flex-1 overflow-hidden relative '>
        <div className='flex-1 overflow-auto pr-2'>
          <div className='pointer-events-none absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black-75 to-transparent z-40' />
          <div className='pointer-events-none absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black-75 to-transparent z-40' />
          <div className='relative z-20 pt-2'>
            {inputs.map((input) => (
              <InputEntry
                key={input.inputId}
                input={input}
                refreshState={refreshState}
                roomId={roomId}
                moveInputToTheTop={moveInputToTheTop}
              />
            ))}
          </div>
        </div>
      </div>
      <div className='flex flex-col justify-content-stretch mt-4'>
        <p className='text-white m-2'>Add new Twitch stream:</p>
        <AddInputForm
          inputs={inputs}
          suggestions={suggestions}
          roomId={roomId}
          refreshState={refreshState}
        />
      </div>
    </motion.div>
  );
}

function InputEntry({
  roomId,
  input,
  refreshState,
  moveInputToTheTop,
}: {
  roomId: string;
  input: Input;
  refreshState: () => Promise<void>;
  moveInputToTheTop: (inputId: string) => Promise<void>;
}) {
  // TODO: add volume control
  const muted = input.volume === 0;
  const [connectionStateLoading, setConnectionStateLoading] = useState(false);

  const muteButton =
    input.sourceState !== 'offline' ? (
      <Button
        size='sm'
        variant='ghost'
        className='transition-all duration-300 ease-in-out h-8 w-8 p-2 cursor-pointer'
        onClick={async () => {
          await updateInput(roomId, input.inputId, {
            volume: muted ? 1 : 0,
          });
          await refreshState();
        }}>
        {muted ? (
          <MicOff className='w-3 h-3 text-red-40' />
        ) : (
          <Mic className='w-3 h-3 text-green-60' />
        )}
      </Button>
    ) : null;

  const deleteButton = (
    <Button
      size='sm'
      variant='ghost'
      className='transition-all duration-300 ease-in-out h-8 w-8 p-2 cursor-pointer'
      onClick={async () => {
        await removeInput(roomId, input.inputId);
        await refreshState();
      }}>
      <X className='w-3 h-3 text-red-40' />
    </Button>
  );

  const moveToTopButton = (
    <Button
      size='sm'
      variant='ghost'
      className='transition-all duration-300 ease-in-out h-8 w-8 p-2 cursor-pointer'
      onClick={async () => {
        await moveInputToTheTop(input.inputId);
        await refreshState();
      }}>
      <ArrowUp className='w-3 h-3 text-purple-20 border rounded' />
    </Button>
  );

  return (
    <div
      key={input.inputId}
      className='p-2 mb-2 last:mb-0 rounded border bg-black-75 border-gray-500/50'>
      <div className='flex flex-row items-center'>
        <div className='text-xs font-medium text-white-100 flex-1'>
          {input.title}
        </div>
        {muteButton}
        {moveToTopButton}
        {deleteButton}
      </div>
      {input.sourceState === 'live' ? (
        <Badge
          variant='outline'
          className='border-green-60 text-green-60 bg-transparent my-2'>
          Status: live
        </Badge>
      ) : input.sourceState === 'offline' ? (
        <Badge
          variant='outline'
          className='border-green-60 text-green-60 bg-transparent my-2'>
          Status: offline (remove input)
        </Badge>
      ) : null}
      <Button
        size='sm'
        className={`w-full h-6 text-xs text-white-100 hover:opacity-55 cursor-pointer ${input.status === 'connected' ? 'bg-red-80 hover:bg-red-80' : 'bg-green-100 hover:bg-green-100'}`}
        onClick={async () => {
          setConnectionStateLoading(true);
          try {
            if (input.status === 'connected') {
              await disconnectInput(roomId, input.inputId);
            } else if (input.status === 'disconnected') {
              await connectInput(roomId, input.inputId);
            }
            await refreshState();
          } finally {
            setConnectionStateLoading(false);
          }
        }}>
        {input.status === 'pending' || connectionStateLoading ? (
          <LoadingSpinner size='sm' variant='spinner' />
        ) : input.status === 'connected' ? (
          'Disconnect'
        ) : input.status === 'disconnected' ? (
          'Connect'
        ) : (
          'unknown'
        )}
      </Button>
    </div>
  );
}

function AddInputForm({
  inputs,
  suggestions,
  roomId,
  refreshState,
}: {
  inputs: Input[];
  suggestions: InputSuggestions;
  roomId: string;
  refreshState: () => Promise<void>;
}) {
  const [currentSuggestion, setCurrentSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <form
      className='flex'
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        const channelId =
          tryTwitchIdFromUrl(currentSuggestion) ?? currentSuggestion;
        try {
          await addInput(roomId, channelId);
          await refreshState();
          setCurrentSuggestion('');
        } catch (err) {
          toast.error(`Failed to add "${channelId}" Twitch.tv stream.`);
        } finally {
          setLoading(false);
        }
      }}>
      <input
        className='p-2 m-2 border-purple-40 border text-purple-20 bg-transparent rounded-md bg-purple-40/30 flex-1'
        list='suggestions'
        value={currentSuggestion}
        onChange={(event) => setCurrentSuggestion(event.target.value)}
        placeholder='Channel ID or URL'
      />
      <datalist id='suggestions'>
        {suggestions.twitch
          .filter((suggestion) => {
            for (const input of inputs) {
              if (input.twitchChannelId === suggestion.streamId) {
                return false;
              }
            }
            return true;
          })
          .map((suggestion) => (
            <option
              key={suggestion.streamId}
              value={suggestion.streamId}
              label={`[Twitch.tv] ${suggestion.title}`}
            />
          ))}
      </datalist>
      <Button
        size='sm'
        variant='default'
        className='transition-all duration-300 ease-in-out h-8 w-20 p-2 cursor-pointer m-4'
        type='submit'>
        {loading ? <LoadingSpinner size='sm' variant='spinner' /> : 'Add input'}
      </Button>
    </form>
  );
}

function tryTwitchIdFromUrl(maybeUrl: string): string | undefined {
  try {
    const url = URL.parse(maybeUrl);
    if (['www.twitch.tv', 'twitch.tv'].includes(url?.host ?? '')) {
      return url?.pathname.replaceAll('/', '');
    }
  } catch {
    return;
  }
}
