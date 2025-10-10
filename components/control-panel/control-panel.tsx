import {
  Input,
  Layout,
  RoomState,
  updateRoom,
  getAvailableShaders,
  addCameraInput,
  sendWhipOffer,
} from '@/app/actions/actions';
import { fadeIn } from '@/utils/animations';
import { motion } from 'framer-motion';
import InputEntry from '@/components/control-panel/input-entry/input-entry';
import { useEffect, useState, useCallback, useRef } from 'react';
import { SortableList } from '@/components/control-panel/sortable-list/sortable-list';
import { SortableItem } from '@/components/control-panel/sortable-list/sortable-item';
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
type AddInputResposne = { inputId: string; bearerToken: string };

export type InputWrapper = { id: number; inputId: string };

export default function ControlPanel({
  refreshState,
  roomId,
  roomState,
}: ControlPanelProps) {
  // --- State and refs ---
  const inputsRef = useRef<Input[]>(roomState.inputs);
  const [inputs, setInputs] = useState<Input[]>(roomState.inputs);
  const everHadInputRef = useRef<boolean>(roomState.inputs.length > 0);

  const [showStreamsSpinner, setShowStreamsSpinner] = useState(
    roomState.inputs.length === 0,
  );
  const spinnerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const pathname = usePathname();
  const isKick = pathname?.toLowerCase().includes('kick');

  // --- Input wrappers for sortable list ---
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

  // --- Keep inputWrappers in sync with inputs ---
  useEffect(() => {
    setInputWrappers(getInputWrappers(inputs));
    inputsRef.current = inputs;
  }, [inputs, getInputWrappers]);

  // --- Keep inputs in sync with roomState.inputs ---
  useEffect(() => {
    setInputs(roomState.inputs);
    inputsRef.current = roomState.inputs;
  }, [roomState.inputs]);

  // --- Fetch available shaders and store in state ---
  const [availableShaders, setAvailableShaders] = useState<any[]>([]);
  useEffect(() => {
    let mounted = true;
    getAvailableShaders()
      .then((shaders) => {
        if (mounted) setAvailableShaders(shaders);
      })
      .catch(() => {
        if (mounted) setAvailableShaders([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // --- Spinner logic for streams section ---
  useEffect(() => {
    if (inputs.length > 0) {
      everHadInputRef.current = true;
    }

    if (everHadInputRef.current) {
      setShowStreamsSpinner(false);
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
        spinnerTimeoutRef.current = null;
      }
      return;
    }

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

    return () => {
      if (spinnerTimeoutRef.current) {
        clearTimeout(spinnerTimeoutRef.current);
        spinnerTimeoutRef.current = null;
      }
    };
  }, [inputs]);

  // --- Handlers ---
  const updateOrder = useCallback(
    async (newInputWrappers: InputWrapper[]) => {
      const newOrderIds = newInputWrappers.map((item) => item.inputId);
      await updateRoom(roomId, { inputOrder: newOrderIds });
    },
    [roomId],
  );

  const changeLayout = useCallback(
    async (layout: Layout) => {
      await updateRoom(roomId, { layout });
      await refreshState();
    },
    [roomId, refreshState],
  );

  const handleRefreshState = useCallback(async () => {
    setInputWrappers(getInputWrappers(inputsRef.current));
    await refreshState();
  }, [getInputWrappers, refreshState]);

  // --- Handler for adding WHIP input ---
  let stream: MediaStream;
  let pc: RTCPeerConnection;
  let offer: RTCSessionDescriptionInit;
  const [addingWhip, setAddingWhip] = useState(false);
  const handleAddWhip = useCallback(async () => {
    setAddingWhip(true);
    try {
      console.log('adding whip');
      const response: AddInputResposne = await addCameraInput(roomId);
      console.log('response', response);
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      console.log('stream', stream);
      pc = new RTCPeerConnection();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('offer', offer);

      const whipOfferResponse = await sendWhipOffer(
        response.inputId,
        response.bearerToken,
        offer.sdp!,
      );
      console.log('whipOfferResponse', whipOfferResponse);
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: whipOfferResponse.answer,
      });

      await handleRefreshState();
    } catch (e) {
      // Optionally handle error
    } finally {
      setAddingWhip(false);
    }
  }, [roomId, handleRefreshState]);

  // --- Render ---
  return (
    <motion.div
      {...(fadeIn as any)}
      className='flex flex-col flex-1 min-h-0 gap-1 rounded-xl bg-black-90 border border-black-50 pt-6 shadow-sm'>
      {/* Add input forms */}
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

      {/* Add new WHIP input */}
      <Accordion title='Add new WHIP input' defaultOpen>
        <div className='flex items-center justify-start p-2'>
          <button
            className='px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700 transition disabled:opacity-50'
            onClick={handleAddWhip}
            disabled={addingWhip}
            type='button'>
            {addingWhip ? (
              <span className='flex items-center gap-2'>
                <LoadingSpinner size='sm' variant='spinner' />
                Adding...
              </span>
            ) : (
              'Add WHIP input'
            )}
          </button>
        </div>
      </Accordion>

      {/* Streams list */}
      <Accordion title='Streams' defaultOpen>
        <div className='flex-1 overflow-auto relative'>
          <div className='pointer-events-none absolute top-0 left-0 right-0 h-2 z-40' />
          {showStreamsSpinner ? (
            <div className='flex items-center justify-center h-32'>
              <LoadingSpinner size='lg' variant='spinner' />
            </div>
          ) : (
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
                        availableShaders={availableShaders}
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

      {/* Layout selector */}
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
