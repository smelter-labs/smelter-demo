import { Input, Layout, RoomState, updateRoom } from '@/app/actions';
import { fadeIn } from '@/utils/animations';
import { motion } from 'framer-motion';
import InputEntry from '@/components/control-panel/input-entry';
import { useEffect, useState, useCallback, useRef } from 'react';
import { SortableList } from '@/components/control-panel/sortable-list/sortable-list';
import { SortableItem } from '@/components/control-panel/sortable-item/sortable-item';
import Accordion from '@/components/ui/accordion';
import LayoutSelector from '@/components/layout-selector';
import TwitchAddInputForm from './add-input-form/twitch-add-input-form';
import { Mp4AddInputForm } from './add-input-form/mp4-add-input-form';
import { KickAddInputForm } from './add-input-form/kick-add-input-form';
import { usePathname } from 'next/navigation';
import LoadingSpinner from '@/components/ui/spinner';

type ControlPanelProps = {
  roomId: string;
  roomState: RoomState;
  refreshState: () => Promise<void>;
};

export type InputWrapper = { id: number; inputId: string };

export default function ControlPanel({
  refreshState,
  roomId,
  roomState,
}: ControlPanelProps) {
  // Use a ref to always get the latest inputs in callbacks
  const inputsRef = useRef<Input[]>(roomState.inputs);
  const [inputs, setInputs] = useState<Input[]>(roomState.inputs);

  // Spinner state for streams accordion
  const [showStreamsSpinner, setShowStreamsSpinner] = useState(
    roomState.inputs.length === 0
  );
  const spinnerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get the current pathname to determine which add input forms to show
  const pathname = usePathname();
  const isKick = pathname?.toLowerCase().includes('kick');

  // Helper to wrap inputs with an id for sorting
  const getInputWrappers = useCallback(
    (inputsArg: Input[] = inputsRef.current): InputWrapper[] =>
      inputsArg.map((input, index) => ({
        id: index,
        inputId: input.inputId,
      })),
    [],
  );

  const [inputWrappers, setInputWrappers] = useState<InputWrapper[]>(() =>
    getInputWrappers(roomState.inputs),
  );

  // Keep inputWrappers in sync with inputs
  useEffect(() => {
    setInputWrappers(getInputWrappers(inputs));
    inputsRef.current = inputs;
  }, [inputs, getInputWrappers]);

  // Keep inputs in sync with roomState.inputs
  useEffect(() => {
    setInputs(roomState.inputs);
    inputsRef.current = roomState.inputs;
  }, [roomState.inputs]);

  // Spinner logic: show spinner for up to 10s or until at least one stream appears
  useEffect(() => {
    if (inputs.length === 0) {
      setShowStreamsSpinner(true);
      if (spinnerTimeoutRef.current) clearTimeout(spinnerTimeoutRef.current);
      spinnerTimeoutRef.current = setTimeout(() => {
        setShowStreamsSpinner(false);
      }, 10000);
    } else {
      setShowStreamsSpinner(false);
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
        spinnerTimeoutRef.current = null;
      }
    }
    // Clean up on unmount
    return () => {
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
        spinnerTimeoutRef.current = null;
      }
    };
  }, [inputs]);

  // Update the order in the backend
  const updateOrder = useCallback(
    async (newInputWrappers: InputWrapper[]) => {
      // Reorder the inputs array according to the new order
      const newOrderIds = newInputWrappers.map((item) => item.inputId);
      await updateRoom(roomId, {
        inputOrder: newOrderIds,
      });
    },
    [roomId, getInputWrappers],
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
    setInputWrappers(getInputWrappers(inputsRef.current));
    await refreshState();
  }, [getInputWrappers, refreshState]);

  return (
    <motion.div
      {...(fadeIn as any)}
      className='flex flex-col flex-1 min-h-0 gap-1 rounded-xl bg-black-90 border border-black-50 pt-6 shadow-sm'>
      {/* Show only one of Twitch or Kick add input forms based on pathname */}
      {!isKick && (
        <Accordion title='Add new Twitch stream' defaultOpen>
          <TwitchAddInputForm
            inputs={inputs}
            roomId={roomId}
            refreshState={handleRefreshState}
          />
        </Accordion>
      )}

      {isKick && (
        <Accordion title='Add new Kick Channel' defaultOpen>
          <KickAddInputForm
            inputs={inputs}
            roomId={roomId}
            refreshState={handleRefreshState}
          />
        </Accordion>
      )}

      <Accordion title='Add new MP4' defaultOpen>
        <Mp4AddInputForm
          inputs={inputs}
          roomId={roomId}
          refreshState={handleRefreshState}
        />
      </Accordion>

      <Accordion title='Streams' defaultOpen>
        <div className='flex-1 overflow-auto relative'>
          <div className='pointer-events-none absolute top-0 left-0 right-0 h-2 z-40' />
          {showStreamsSpinner ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner size="lg" variant="spinner" />
            </div>
          ) : (
            <SortableList
              items={inputWrappers}
              renderItem={(item) => {
                // Find the input by inputId in the current order
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
          )}
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
