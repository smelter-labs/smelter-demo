import { addInput, Input, InputSuggestions } from '@/app/actions';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/spinner';

export default function AddInputForm({
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
      className='flex flex-row w-full gap-2 sm:gap-3 items-center'
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
        className='p-2 border-purple-40 border text-purple-20 bg-transparent rounded-md flex-1 min-w-0 text-sm sm:text-base
          sm:p-2 sm:mr-3 mr-2
          '
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
        size='lg'
        variant='default'
        className='bg-purple-80 hover:bg-purple-100 text-white-100 font-bold cursor-pointer px-3 py-2 text-sm sm:text-base sm:px-6 sm:py-3 transition-all'
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
