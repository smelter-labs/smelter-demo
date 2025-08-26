'use client';

import {
  getInputSuggestions,
  getRoomInfo,
  InputSuggestions,
  Layout,
  RoomState,
  updateRoom,
} from '@/app/actions';
import { useCallback, useEffect, useRef, useState } from 'react';
import ControlPanel from '@/components/control-panel';
import VideoPreview from '@/components/video-preview';
import StatusLabel from '@/components/status-label';
import { motion } from 'framer-motion';
import { staggerContainer } from '@/utils/animations';
import LayoutSelector from '@/components/layout-selector';
import { useParams, useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/spinner';
import { toast } from 'react-toastify';
import { WarningBanner } from '@/components/warning-banner';
import Link from 'next/link';

export default function RoomPage() {
  const router = useRouter();
  const { roomId } = useParams();
  const [loading, setLoading] = useState(true);
  const [roomState, setRoomState] = useState<RoomState>({
    inputs: [],
    layout: 'grid',
    whepUrl: '',
  });

  const [suggestions, setSuggestions] = useState<InputSuggestions>({
    twitch: [],
  });

  const refreshState = useCallback(async () => {
    if (!roomId) {
      return;
    }
    const state = await getRoomInfo(roomId as string);
    if (state == 'not-found') {
      toast.error('Room was closed, Redirecting ...');
      router.push('/');
    } else {
      setRoomState(state);
      setLoading(false);
    }
  }, [roomId, router]);

  useEffect(() => {
    void refreshState();
    const interval = setInterval(refreshState, 3_000);
    return () => clearInterval(interval);
  }, [refreshState]);

  useEffect(() => {
    const refresh = async () => {
      if (!roomId) {
        return;
      }
      const state = await getInputSuggestions();
      setSuggestions(state);
    };
    void refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [roomId]);

  return (
    <motion.div
      variants={staggerContainer}
      className='h-screen flex flex-col p-2 py-4 md:p-4 bg-black-100'>
      <StatusLabel />
      {roomState.pendingDelete && (
        <Link href='/'>
          <WarningBanner message='This room will be removed shortly, go to the main page and start a new one.' />
        </Link>
      )}
      {loading ? (
        <motion.div
          variants={staggerContainer}
          className='flex-1 md:grid  min-h-0 justify-center content-center'>
          <LoadingSpinner size='lg' variant='spinner' />
        </motion.div>
      ) : (
        <RoomView
          roomState={roomState}
          suggestions={suggestions}
          roomId={roomId as string}
          refreshState={refreshState}
        />
      )}
    </motion.div>
  );
}

function RoomView({
  roomId,
  roomState,
  suggestions,
  refreshState,
}: {
  roomId: string;
  roomState: RoomState;
  suggestions: InputSuggestions;
  refreshState: () => Promise<void>;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const changeLayout = async (layout: Layout) => {
    await updateRoom(roomId, {
      layout,
    });
    await refreshState();
  };

  return (
    <motion.div
      variants={staggerContainer}
      className='flex-1 md:grid grid-cols-4 gap-4 min-h-0'>
      <VideoPreview videoRef={videoRef} whepUrl={roomState.whepUrl} />

      <motion.div className='flex flex-col gap-4 min-h-0 h-full max-h-full'>
        <ControlPanel
          inputs={roomState.inputs}
          suggestions={suggestions}
          roomId={roomId}
          refreshState={refreshState}
        />
        <LayoutSelector
          changeLayout={changeLayout}
          activeLayoutId={roomState.layout}
          connectedStreamsLength={roomState.inputs.length}
        />
      </motion.div>
    </motion.div>
  );
}
