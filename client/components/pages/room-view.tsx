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
  const [isAutoTourStarting, setIsAutoTourStarting] = useState(false);
  const pathname = usePathname();
  const isKick = pathname?.toLowerCase().includes('kick');
  const { start: startRoomTour } = useDriverTourControls('room');

  const handleAutoplayPermission = useCallback((allow: boolean) => {
    if (allow) {
      videoRef.current?.play();
    }
    setShowAutoplayPopup(false);
  }, []);

  const setupVideoEventListeners = useCallback(() => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.onplay = () => {
      setPlayed(true);
    };
  }, []);

  useEffect(() => {
    setupVideoEventListeners();
  }, [setupVideoEventListeners]);

  // Check if tour is auto-starting via hash
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const h = (window.location.hash || '').toLowerCase();
    if (
      h.includes('tour-main') ||
      h.includes('tour-composing') ||
      h.includes('tour-shaders')
    ) {
      setIsAutoTourStarting(true);
      setShowAutoplayPopup(false);
    }
  }, []);

  // Auto-start the room tour only on first site visit (skip Kick variant and on mobile)
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (isKick) return;
      if (window.matchMedia('(max-width: 767px)').matches) return; // don't show on mobile
      const STORAGE_KEY = 'smelter:tour:room:first-visit:v1';
      const seen = window.localStorage.getItem(STORAGE_KEY) === '1';
      if (seen) return;
      // If auto-starting tour, don't show autoplay modal
      setIsAutoTourStarting(true);
      setShowAutoplayPopup(false);
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
        // Only show autoplay popup if tour is not auto-starting
        if (!isAutoTourStarting) {
          setShowAutoplayPopup(true);
        }
      }
    };
    attemptAutoplay();
  }, [isAutoTourStarting]);

  return (
    <>
      {showAutoplayPopup && !played && !isAutoTourStarting && (
        <AutoplayModal
          onAllow={() => handleAutoplayPermission(true)}
          onDeny={() => handleAutoplayPermission(false)}
        />
      )}

      <motion.div
        variants={staggerContainer}
        className='flex-1 grid grid-cols-1 grid-rows-[auto,1fr] gap-0 xl:grid-cols-4 xl:grid-rows-none xl:gap-4 min-h-0 h-full items-start overflow-hidden'>
        <VideoPreview
          videoRef={videoRef}
          whepUrl={roomState.whepUrl}
          roomId={roomId}
        />
        <motion.div className='col-span-1 w-full flex flex-col xl:gap-4 min-h-0 h-full max-h-full justify-start overflow-y-auto overflow-x-hidden md:pr-4 control-panel-container'>
          <div className='control-panel-wrapper'>
            <ControlPanel
              roomState={roomState}
              roomId={roomId}
              refreshState={refreshState}
            />
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
