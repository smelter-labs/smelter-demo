import {
  Input,
  InputSuggestions,
  Layout,
  RoomState,
  updateRoom,
} from '@/app/actions';
import { fadeIn } from '@/utils/animations';
import { motion } from 'framer-motion';
import InputEntry from '@/components/control-panel/input-entry';
import AddInputForm, {
  AddMP4InputForm,
} from '@/components/control-panel/add-input-form';
import { useEffect, useState, useCallback } from 'react';
import { SortableList } from '@/components/control-panel/sortable-list/sortable-list';
import { SortableItem } from '@/components/control-panel/sortable-item/sortable-item';
import Accordion from '@/components/ui/accordion';
import LayoutSelector from '@/components/layout-selector';
import { addMP4Input } from '@/app/actions';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/spinner';

type ControlPanelProps = {
  roomId: string;
  roomState: RoomState;
  suggestions: InputSuggestions;
  refreshState: () => Promise<void>;
};

export type InputWrapper = { id: number; inputId: string };

export default function ControlPanel({
  refreshState,
  roomId,
  roomState,
  suggestions,
}: ControlPanelProps) {
  const [inputs, setInputs] = useState<Input[]>(roomState.inputs);

  // Helper to wrap inputs with an id for sorting
  const getInputWrappers = useCallback(
    (inputsArg: Input[] = inputs): InputWrapper[] =>
      inputsArg.map((input, index) => ({
        id: index,
        inputId: input.inputId,
      })),
    [inputs],
  );

  const [inputWrappers, setInputWrappers] = useState<InputWrapper[]>(() =>
    getInputWrappers(roomState.inputs),
  );

  // Keep inputWrappers in sync with inputs
  useEffect(() => {
    setInputWrappers(getInputWrappers(inputs));
  }, [inputs, getInputWrappers]);

  // Keep inputs in sync with roomState.inputs
  useEffect(() => {
    setInputs(roomState.inputs);
  }, [roomState.inputs]);

  // Update the order in the backend
  const updateOrder = useCallback(
    async (newInputWrappers: InputWrapper[]) => {
      const newInputs = newInputWrappers
        .map((inputWrapper) =>
          inputs.find((input) => input.inputId === inputWrapper.inputId),
        )
        .filter(Boolean) as Input[];
      setInputs(newInputs);
      setInputWrappers(getInputWrappers(newInputs));
      await updateRoom(roomId, {
        inputOrder: newInputWrappers.map((item) => item.inputId),
      });
    },
    [inputs, roomId, getInputWrappers],
  );

  const changeLayout = useCallback(
    async (layout: Layout) => {
      await updateRoom(roomId, { layout });
      await refreshState();
    },
    [roomId, refreshState],
  );

  // Refresh state handler
  const handleRefreshState = useCallback(async () => {
    setInputWrappers(getInputWrappers(inputs));
    await refreshState();
  }, [getInputWrappers, inputs, refreshState]);

  // AddMP4Button: just a button, no input
  function AddMP4Button({
    roomId,
    refreshState,
  }: {
    roomId: string;
    refreshState: () => Promise<void>;
  }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAdd = async () => {
      setError(null);
      setLoading(true);
      try {
        await addMP4Input(roomId, 'random');
        await refreshState();
      } catch (err) {
        setError('Failed to add MP4. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className='flex flex-col gap-1 w-full'>
        <div className='flex gap-2 items-center w-full'>
          <Button
            type='button'
            size='lg'
            variant='default'
            className='bg-purple-80 hover:bg-purple-100 text-white-100 font-semibold cursor-pointer px-3 py-2 text-sm sm:text-base sm:px-6 sm:py-3 transition-all'
            disabled={loading}
            tabIndex={0}
            onClick={handleAdd}>
            {loading ? (
              <LoadingSpinner size='sm' variant='spinner' />
            ) : (
              'Add MP4'
            )}
          </Button>
        </div>
        {error && <div className='text-red-400 text-xs mt-1 px-1'>{error}</div>}
      </div>
    );
  }

  return (
    <motion.div
      {...(fadeIn as any)}
      className='flex flex-col flex-1 min-h-0 gap-1 rounded-xl bg-black-90 border border-black-50 pt-6 shadow-sm'>
      <Accordion title='Add new Twitch stream' defaultOpen>
        <AddInputForm
          inputs={inputs}
          suggestions={suggestions}
          roomId={roomId}
          refreshState={handleRefreshState}
        />
      </Accordion>

      <Accordion title='Add new MP4' defaultOpen>
        <AddMP4InputForm
          inputs={inputs}
          roomId={roomId}
          refreshState={handleRefreshState}
        />
      </Accordion>

      <Accordion title='Streams' defaultOpen>
        <div className='flex-1 overflow-auto relative'>
          <div className='pointer-events-none absolute top-0 left-0 right-0 h-2 z-40' />
          <SortableList
            items={inputWrappers}
            renderItem={(item) => {
              const input = inputs.find(
                (input) => input.inputId === item.inputId,
              );
              return (
                <SortableItem id={item.id}>
                  {input && (
                    <InputEntry
                      input={input}
                      refreshState={handleRefreshState}
                      roomId={roomId}
                    />
                  )}
                </SortableItem>
              );
            }}
            onOrderChange={updateOrder}
          />
        </div>
      </Accordion>

      <Accordion title='Layouts' defaultOpen>
        <LayoutSelector
          changeLayout={changeLayout}
          activeLayoutId={roomState.layout}
          connectedStreamsLength={roomState.inputs.length}
        />
      </Accordion>
    </motion.div>
  );
}
