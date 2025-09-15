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
import AddInputForm from '@/components/control-panel/add-input-form';
import { useEffect, useState } from 'react';
import { SortableList } from '@/components/control-panel/sortable-list/sortable-list';
import { SortableItem } from '@/components/control-panel/sortable-item/sortable-item';
import Accordion from '@/components/ui/accordion';
import LayoutSelector from '@/components/layout-selector';

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
  const [inputs, setInputs] = useState(roomState.inputs);
  // Helper to wrap inputs with an id for sorting
  const getInputWrappers = (): InputWrapper[] => {
    return inputs.map((input: Input, index: number) => ({
      id: index,
      inputId: input.inputId,
    }));
  };

  const [inputWrappers, setInputWrappers] =
    useState<InputWrapper[]>(getInputWrappers);

  // Keep inputWrappers in sync with inputs
  useEffect(() => {
    setInputWrappers(getInputWrappers());
  }, [inputs.length, inputs]);

  useEffect(() => {
    setInputs(roomState.inputs);
  }, [roomState.inputs, roomState.inputs.length]);

  // Update the order in the backend
  const updateOrder = async (newInputWrappers: InputWrapper[]) => {
    let newInputs = [];
    newInputs = newInputWrappers.map((inputWrapper) => {
      return (
        inputs.find((input) => input.inputId === inputWrapper.inputId) ?? null
      );
    });
    // @ts-ignore
    setInputs(newInputs);
    setInputWrappers(getInputWrappers());
    await updateRoom(roomId, {
      inputOrder: newInputWrappers.map((item) => item.inputId),
    });
  };

  const changeLayout = async (layout: Layout) => {
    await updateRoom(roomId, {
      layout,
    });
    await refreshState();
  };

  // Refresh state handler
  const handleRefreshState = async () => {
    setInputWrappers(getInputWrappers());
    await refreshState();
  };

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

      <Accordion title='Streams' defaultOpen>
        <div className='flex-1 overflow-auto pr-2 relative'>
          <div className='pointer-events-none absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black-75 to-transparent z-40' />
          <SortableList
            items={inputWrappers}
            renderItem={(item) => {
              const inputIndex = inputs.findIndex(
                (input) => input.inputId === item.inputId,
              );
              return (
                <SortableItem id={item.id}>
                  {inputIndex !== -1 && (
                    <InputEntry
                      input={inputs[inputIndex]}
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
