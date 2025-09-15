'use client';

import { useState, ChangeEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

import StatusLabel from '@/components/ui/status-label';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/spinner';
import { createNewRoom, getRoomInfo } from '@/app/actions';
import { staggerContainer } from '@/utils/animations';

export default function Home() {
  const router = useRouter();
  const [loadingNew, setLoadingNew] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [roomIdOrUrl, setRoomIdOrUrl] = useState('');

  const handleCreateRoom = useCallback(async () => {
    setLoadingNew(true);
    try {
      const room = await createNewRoom();
      router.push(`room/${room.roomId}`);
    } finally {
      setLoadingNew(false);
    }
  }, [router]);

  const handleJoinRoom = useCallback(async () => {
    setLoadingExisting(true);
    const roomId = getRoomIdFromUserEntry(roomIdOrUrl);

    try {
      await getRoomInfo(roomId);
      router.push(`room/${roomId}`);
    } catch (err) {
      toast.error(`Room ${roomId} does not exist.`);
    } finally {
      setLoadingExisting(false);
    }
  }, [roomIdOrUrl, router]);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setRoomIdOrUrl(event.target.value);
    },
    [],
  );

  const isJoinDisabled = roomIdOrUrl.trim() === '' || loadingExisting;

  return (
    <motion.div
      variants={staggerContainer}
      className='h-screen flex flex-col p-2 py-4 md:p-4 bg-black-100'>
      <motion.div
        variants={staggerContainer}
        className='flex-1 flex justify-center min-h-0 h-full items-center'>
        <motion.div
          className='border-1 rounded-xl border-gray-400 text-center justify-center items-center w-[600px] p-8 shadow-xl/25 shadow-white-100'
          layout>
          <div>
            <StatusLabel />
          </div>

          <div className='text-white-100 justify-center'>
            <h2 className='text-3xl font-bold w-full'>Try Live Demo</h2>
            <p className='text-sm line-clamp-3 mt-6'>
              Try our low-latency video toolkit – perfect for streaming,
              broadcasting and video conferencing.
            </p>
          </div>

          <div className='mt-6'>
            <Button
              size='lg'
              variant='default'
              className='text-white-100 font-bold w-full bg-red-40 border-0 hover:bg-red-60 cursor-pointer'
              onClick={handleCreateRoom}
              disabled={loadingNew}>
              Let&apos;s go!
              {loadingNew && <LoadingSpinner size='sm' variant='spinner' />}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function getRoomIdFromUserEntry(urlOrId: string): string {
  try {
    const url = new URL(urlOrId);
    const segments = url.pathname.split('/').filter(Boolean);
    return segments.length > 0 ? segments[segments.length - 1] : urlOrId;
  } catch {
    return urlOrId;
  }
}
