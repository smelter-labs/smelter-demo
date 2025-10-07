import { InputSuggestions, RoomState } from '@/app/actions/actions';
import { useCallback, useEffect, useRef, useState } from 'react';
import AutoplayModal from '@/components/ui/autoplay-modal';
import { motion } from 'framer-motion';
import { staggerContainer } from '@/utils/animations';
import VideoPreview from '@/components/video-preview';
import ControlPanel from '@/components/control-panel/control-panel';

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
  const [showAutoplayPopup, setShowAutoplayPopup] = useState(false);
  const [played, setPlayed] = useState(false);

  const handleAutoplayPermission = useCallback((allow: boolean) => {
    if (allow) {
      videoRef.current?.play();
    }
    setShowAutoplayPopup(false);
  }, []);

  const setupVideoEventListeners = useCallback(() => {
    if (!videoRef.current) return;

    videoRef.current.onplay = () => {
      setPlayed(true);
    };
  }, []);

  useEffect(() => {
    setupVideoEventListeners();
  }, [setupVideoEventListeners]);

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
