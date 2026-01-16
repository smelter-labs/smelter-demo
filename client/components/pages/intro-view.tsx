'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

import StatusLabel from '@/components/ui/status-label';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/spinner';
import {
  createNewRoom,
  RegisterInputOptions,
  getTwitchSuggestions,
  getKickSuggestions,
  getAllRooms,
} from '@/app/actions/actions';
import Link from 'next/link';
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

function getBasePath(pathname: string): string {
  // Remove trailing slash if present
  let path = pathname.replace(/\/$/, '');
  // Remove /room or /room/[roomId] if present
  if (path.endsWith('/room')) {
    path = path.slice(0, -'/room'.length);
  } else if (/\/room\/[^/]+$/.test(path)) {
    path = path.replace(/\/room\/[^/]+$/, '');
  }
  // Remove leading slash for consistency in push
  if (path.startsWith('/')) path = path.slice(1);
  return path;
}

export default function IntroView() {
  const router = useRouter();
  const pathname = usePathname();
  const [loadingNew, setLoadingNew] = useState(false);

  // Suggestions state
  const [twitchSuggestions, setTwitchSuggestions] = useState<any[]>([]);
  const [kickSuggestions, setKickSuggestions] = useState<any[]>([]);

  // Active rooms state
  type Room = { roomId: string; createdAt?: number; isPublic?: boolean };
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  // Load suggestions on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [twitch, kick] = await Promise.all([
          getTwitchSuggestions(),
          getKickSuggestions(),
        ]);
        if (mounted) {
          setTwitchSuggestions(twitch.twitch || []);
          setKickSuggestions(kick.kick || []);
        }
      } catch (err) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Load rooms on mount and refresh every 5s
  useEffect(() => {
    let mounted = true;
    const fetchRooms = async () => {
      try {
        const roomsData = await getAllRooms();
        if (mounted) {
          setRooms(roomsData.rooms || roomsData || []);
        }
      } catch (err) {
        // ignore
      } finally {
        if (mounted) setLoadingRooms(false);
      }
    };
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const basePath = getBasePath(pathname);

  const getRoomRoute = (roomId: string) => {
    // If basePath is empty, just 'room/roomId'
    // Otherwise, 'basePath/room/roomId'
    return basePath ? `${basePath}/room/${roomId}` : `room/${roomId}`;
  };

  const handleCreateRoom = useCallback(async () => {
    setLoadingNew(true);
    try {
      let initInputs: RegisterInputOptions[] = [];
      const lowerPath = pathname.toLowerCase();
      if (lowerPath.includes('kick')) {
        // Use first two kick suggestions if available
        initInputs = (kickSuggestions.slice(0, 2) || []).map((s) => ({
          type: 'kick-channel',
          channelId: s.streamId,
        }));
      } else if (lowerPath.includes('twitch')) {
        // Use first two twitch suggestions if available
        initInputs = (twitchSuggestions.slice(0, 2) || []).map((s) => ({
          type: 'twitch-channel',
          channelId: s.streamId,
        }));
      } else {
        // No initial inputs
        initInputs = [];
      }
      const room = await createNewRoom(initInputs);
      let hash = '';
      if (typeof window !== 'undefined') {
        const h = (window.location.hash || '').toLowerCase();
        if (
          h.includes('tour-main') ||
          h.includes('tour-composing') ||
          h.includes('tour-shaders')
        ) {
          hash = h;
        }
      }
      router.push(getRoomRoute(room.roomId) + hash);
    } finally {
      setLoadingNew(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, basePath, pathname, twitchSuggestions, kickSuggestions]);

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

          {!loadingRooms && rooms.filter((r) => r.isPublic).length > 0 && (
            <div className='mt-8 text-center'>
              <h3 className='text-lg font-semibold text-white-100 mb-3'>
                Active Rooms
              </h3>
              <ul className='space-y-2'>
                {rooms
                  .filter((r) => r.isPublic)
                  .map((room) => (
                    <li key={room.roomId}>
                      <Link
                        href={getRoomRoute(room.roomId)}
                        className='flex items-center justify-between px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-white-100 text-sm'>
                        <span className='font-mono truncate'>
                          {room.roomId}
                        </span>
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
            </div>
          )}
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
