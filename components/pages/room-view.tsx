import { RoomState } from '@/app/actions/actions';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AutoplayModal from '@/components/ui/autoplay-modal';
import { motion } from 'framer-motion';
import { staggerContainer } from '@/utils/animations';
import VideoPreview from '@/components/video-preview';
import ControlPanel from '@/components/control-panel/control-panel';
import { useDriverTourControls } from '@/components/tour/DriverTourContext';
import { usePathname } from 'next/navigation';

interface RoomViewProps {
  roomId: string;
  roomState: RoomState;
  refreshState: () => Promise<void>;
}

export default function RoomView({
  roomId,
  roomState,
  refreshState,
}: RoomViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [showAutoplayPopup, setShowAutoplayPopup] = useState(true);
  const [played, setPlayed] = useState(false);
  const pathname = usePathname();
  const isKick = pathname?.toLowerCase().includes('kick');
  const { start: startRoomTour } = useDriverTourControls('room');

  const handleAutoplayPermission = useCallback((allow: boolean) => {
    if (allow) {
      console.log('Playing video');
      videoRef.current?.play();
    }
    setShowAutoplayPopup(false);
  }, []);

  const setupVideoEventListeners = useCallback(() => {
    if (!videoRef.current) {
      console.log('No video element found');
      return;
    }

    videoRef.current.onplay = () => {
      console.log('Video played');
      setPlayed(true);
    };
  }, []);

  useEffect(() => {
    setupVideoEventListeners();
  }, [setupVideoEventListeners]);

  // Auto-start the room tour only on first site visit (skip Kick variant and on mobile)
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (isKick) return;
      if (window.matchMedia('(max-width: 767px)').matches) return; // don't show on mobile
      const STORAGE_KEY = 'smelter:tour:room:first-visit:v1';
      const seen = window.localStorage.getItem(STORAGE_KEY) === '1';
      if (seen) return;
      // Delay slightly to ensure DOM targets are present
      const t = window.setTimeout(() => {
        startRoomTour?.();
        window.localStorage.setItem(STORAGE_KEY, '1');
      }, 500);
      return () => window.clearTimeout(t);
    } catch {
      // ignore storage errors
    }
  }, [isKick, startRoomTour]);

  useEffect(() => {
    const attemptAutoplay = async () => {
      if (!videoRef.current) return;
      try {
        await videoRef.current.play();
      } catch (error) {
        console.log('Autoplay error:', error);
        setShowAutoplayPopup(true);
      }
    };
    attemptAutoplay();
  }, []);

  return (
    <>
      {showAutoplayPopup && !played && (
        <AutoplayModal
          onAllow={() => handleAutoplayPermission(true)}
          onDeny={() => handleAutoplayPermission(false)}
        />
      )}

      <motion.div
        variants={staggerContainer}
        className='flex-1 md:grid grid-cols-1 gap-0 xl:grid-cols-4 xl:gap-4 min-h-0'>
        <VideoPreview videoRef={videoRef} whepUrl={roomState.whepUrl} />
        <motion.div className='flex flex-col xl:gap-4 min-h-0 h-full max-h-full'>
          <ControlPanel
            roomState={roomState}
            roomId={roomId}
            refreshState={refreshState}
          />
        </motion.div>
      </motion.div>
    </>
  );
}
