'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';

import StatusLabel from '@/components/ui/status-label';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/spinner';
import { createNewRoom, getAllRooms } from '@/app/actions/actions';
import { staggerContainer } from '@/utils/animations';

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

type Room = {
  roomId: string;
  createdAt?: number;
};

export default function RoomsView() {
  const router = useRouter();
  const [loadingNew, setLoadingNew] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getAllRooms();
        if (mounted) {
          setRooms(data.rooms || data || []);
        }
      } catch (err) {
        console.error('Failed to fetch rooms:', err);
      } finally {
        if (mounted) setLoadingRooms(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCreateRoom = useCallback(async () => {
    setLoadingNew(true);
    try {
      const room = await createNewRoom([]);
      router.push(`/rooms/room/${room.roomId}`);
    } finally {
      setLoadingNew(false);
    }
  }, [router]);

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

          <div className='mt-8 text-center'>
            <h3 className='text-lg font-semibold text-white-100 mb-3'>
              Active Rooms
            </h3>
            {loadingRooms ? (
              <div className='flex justify-center py-4'>
                <LoadingSpinner size='sm' variant='spinner' />
              </div>
            ) : rooms.length === 0 ? (
              <p className='text-sm text-gray-400'>No active rooms</p>
            ) : (
              <ul className='space-y-2'>
                {rooms.map((room) => (
                  <li key={room.roomId}>
                    <Link
                      href={`/rooms/room/${room.roomId}`}
                      className='flex items-center justify-between px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-white-100 text-sm'>
                      <span className='font-mono truncate'>{room.roomId}</span>
                      {room.createdAt && (
                        <span className='text-xs text-gray-400 ml-4 whitespace-nowrap'>
                          {new Date(room.createdAt).toLocaleTimeString()} ·{' '}
                          {formatDuration(Date.now() - room.createdAt)}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
