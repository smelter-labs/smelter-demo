'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import Link from 'next/link';

import {
  getInputSuggestions,
  getRoomInfo,
  InputSuggestions,
  RoomState,
} from '@/app/actions';
import LoadingSpinner from '@/components/ui/spinner';
import { WarningBanner } from '@/components/warning-banner';
import SmelterLogo from '@/components/ui/smelter-logo';
import { staggerContainer } from '@/utils/animations';
import RoomView from '@/components/room/room-view';

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
    if (!roomId) return;

    const state = await getRoomInfo(roomId as string);

    if (state === 'not-found') {
      toast.error('Room was closed, Redirecting ...');
      router.push('/');
    } else {
      setRoomState(state);
      setLoading(false);
    }
  }, [roomId, router]);

  const refreshSuggestions = useCallback(async () => {
    if (!roomId) return;

    const state = await getInputSuggestions();
    setSuggestions(state);
  }, [roomId]);

  useEffect(() => {
    void refreshState();
    const interval = setInterval(refreshState, 3_000);
    return () => clearInterval(interval);
  }, [refreshState]);

  useEffect(() => {
    void refreshSuggestions();
    const interval = setInterval(refreshSuggestions, 30_000);
    return () => clearInterval(interval);
  }, [refreshSuggestions]);

  return (
    <motion.div
      variants={staggerContainer}
      className='h-screen flex flex-col p-2 py-4 md:p-4 bg-black-100'>
      <SmelterLogo />

      {roomState.pendingDelete && (
        <Link href='/'>
          <WarningBanner>
            This room will be removed shortly, go to the main page and start a
            new one.
          </WarningBanner>
        </Link>
      )}
      {loading ? (
        <motion.div
          variants={staggerContainer}
          className='flex-1 grid min-h-0 justify-center content-center'>
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
