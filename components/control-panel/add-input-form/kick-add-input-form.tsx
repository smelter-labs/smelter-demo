import { addKickInput, getKickSuggestions, Input } from '@/app/actions/actions';
import { GenericAddInputForm } from './generic-add-input-form';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

// --- AddInputForm for Kick with suggestion logic ---
export function KickAddInputForm({
  inputs,
  roomId,
  refreshState,
}: {
  inputs: Input[];
  roomId: string;
  refreshState: () => Promise<void>;
}) {
  // Helper to extract Kick channel from URL or string
  function tryKickIdFromUrl(maybeUrl: string): string | undefined {
    try {
      const url = new URL(maybeUrl, 'https://dummy.base');
      if (['www.kick.com', 'kick.com'].includes(url.host)) {
        return url.pathname.replace(/^\/+|\/+$/g, '');
      }
    } catch {
      return;
    }
  }

  const [kickSuggestions, setKickSuggestions] = useState<
    Array<{
      streamId: string;
      displayName: string;
      title: string;
      category: string;
    }>
  >([]);

  const refreshSuggestions = useCallback(async () => {
    const result = await getKickSuggestions();
    setKickSuggestions(
      (result.kick || []).map((stream) => ({
        streamId: stream.streamId,
        displayName: stream.displayName,
        title: stream.title,
        category: stream.category,
      })),
    );
  }, []);

  useEffect(() => {
    void refreshSuggestions();
    console.log('refreshSuggestions');
    const interval = setInterval(refreshSuggestions, 30_000);
    return () => clearInterval(interval);
  }, [refreshSuggestions]);

  return (
    <GenericAddInputForm
      inputs={inputs}
      roomId={roomId}
      refreshState={refreshState}
      suggestions={kickSuggestions}
      filterSuggestions={(kickSuggestions, currentSuggestion, inputs) =>
        kickSuggestions
          .filter((suggestion) => {
            for (const input of inputs) {
              if ((input as any).kickChannelId === suggestion.streamId) {
                return false;
              }
            }
            return true;
          })
          .filter((suggestion) => {
            if (!currentSuggestion) return true;
            return (
              suggestion.streamId
                .toLowerCase()
                .includes(currentSuggestion.toLowerCase()) ||
              suggestion.title
                .toLowerCase()
                .includes(currentSuggestion.toLowerCase()) ||
              suggestion.displayName
                .toLowerCase()
                .includes(currentSuggestion.toLowerCase()) ||
              suggestion.category
                .toLowerCase()
                .includes(currentSuggestion.toLowerCase())
            );
          })
      }
      placeholder='Kick Channel ID or URL'
      onSubmit={async (value: string) => {
        const channelId = tryKickIdFromUrl(value) ?? value;
        try {
          const newInput = await addKickInput(roomId, channelId);
        } catch (err) {
          toast.error(`Failed to add "${channelId}" Kick.com stream.`);
          throw err;
        }
      }}
      renderSuggestion={(suggestion, idx, highlighted) => (
        <>
          <span className='font-bold text-white-80 break-words'>
            {suggestion.title}
          </span>
          <span className='font-semibold break-all'>
            [{suggestion.streamId}]
          </span>
          <span className='ml-2 text-white-60 block'>
            [Kick.com] {suggestion.category}
          </span>
          <br />
        </>
      )}
      getSuggestionValue={(suggestion) => suggestion.streamId}
      buttonText='Add input'
      loadingText='Add input'
      validateInput={undefined}
    />
  );
}
