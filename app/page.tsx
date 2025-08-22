'use client';

import StatusLabel from '@/components/status-label';
import { motion } from 'framer-motion';
import { staggerContainer } from '@/utils/animations';
import { Button } from '@/components/ui/button';
import { createNewRoom, getRoomInfo } from '@/app/actions';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/spinner';
import { useState } from 'react';
import { toast } from 'react-toastify';

export default function Home() {
  const router = useRouter();
  const [loadingNew, setLoadingNew] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [roomIdOrUrl, setRoomIdOrUrl] = useState('');

  return (
    <motion.div
      variants={staggerContainer}
      className='h-screen flex flex-col p-2 py-4 md:p-4 bg-black-100'>
      <StatusLabel />

      <motion.div
        variants={staggerContainer}
        className='flex-1 flex justify-center min-h-0'>
        <motion.div
          className='flex flex-col min-h-0 h-full max-h-full text-center w-1/2 justify-self-center justify-center'
          layout>
          <Button
            size='lg'
            variant='outline'
            className='border-purple-40 text-purple-40 bg-transparent p-2 m-4'
            onClick={async () => {
              setLoadingNew(true);
              try {
                const room = await createNewRoom();
                router.push(`room/${room.roomId}`);
              } finally {
                setLoadingNew(false);
              }
            }}>
            Create a new room
            {loadingNew ? <LoadingSpinner size='sm' variant='spinner' /> : null}
          </Button>
          <p className='text-white text-[20px] m-2'>or</p>
          <div className='flex flex-row'>
            <input
              className='p-2 m-4 border-purple-40 border text-purple-20 bg-transparent rounded-md bg-purple-40/30 flex-1'
              placeholder='URL or Room UUID'
              onChange={(event) => setRoomIdOrUrl(event.target.value)}
            />
            <Button
              size='lg'
              variant='outline'
              className='border-purple-40 text-purple-40 bg-transparent m-4'
              onClick={async () => {
                setLoadingExisting(true);
                const roomId = getRoomIdFromUserEntry(roomIdOrUrl);
                try {
                  await getRoomInfo(roomId);
                } catch (err) {
                  toast.error(`Room ${roomId} does not exist.`);
                  return;
                } finally {
                  setLoadingExisting(false);
                }
                router.push(`room/${roomId}`);
              }}>
              Join existing
              {loadingExisting ? (
                <LoadingSpinner size='sm' variant='spinner' />
              ) : null}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function getRoomIdFromUserEntry(urlOrId: string): string {
  try {
    const url = URL.parse(urlOrId);
    const segments = url?.pathname.split('/');
    if (!segments || segments.length == 0) {
      return urlOrId;
    }
    const lastSegment = segments[segments?.length - 1];
    return lastSegment;
  } catch {
    return urlOrId;
  }
}
