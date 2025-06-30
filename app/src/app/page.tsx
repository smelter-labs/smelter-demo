'use client';

import {
  addStream,
  getSmelterState,
  Layout,
  removeStream,
  selectAudioStream,
  StreamOptions,
  updateLayout,
} from '@/app/actions';
import { useEffect, useRef, useState } from 'react';
import LayoutSelector from '@/components/layout-selector';
import ControlPanel, { ExtendedStreamInfo } from '@/components/control-panel';
import VideoPreview from '@/components/video-preview';
import StatusLabel from '@/components/status-label';
import { motion } from 'framer-motion';
import { staggerContainer } from '@/utils/animations';

export default function Home() {
  const [activeLayoutId, setActiveLayoutId] = useState<Layout>('grid');
  const [smelterState, setSmelterState] = useState<StreamOptions>({
    availableStreams: [],
    connectedStreamIds: [],
    layout: 'grid',
    audioStreamId: undefined,
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const changeLayout = async (layoutId: Layout) => {
    setActiveLayoutId(layoutId);

    await updateLayout(layoutId);
  };

  const toggleStream = async (streamId: string) => {
    setSmelterState((prev) => {
      const isConnected = prev.connectedStreamIds.includes(streamId);
      const newConnectedStreamIds = isConnected
        ? prev.connectedStreamIds.filter((id) => id !== streamId)
        : [...prev.connectedStreamIds, streamId];

      return { ...prev, connectedStreamIds: newConnectedStreamIds };
    });

    if (smelterState.connectedStreamIds.includes(streamId)) {
      await removeStream(streamId);
    } else {
      await addStream(streamId);
    }
  };

  const toggleStreamAudio = async (streamId: string) => {
    const isMuted = smelterState.audioStreamId !== streamId;
    const allStreamsMuted = !smelterState.audioStreamId;
    const videoPlayer = document.getElementById(
      'videoPlayer',
    ) as HTMLVideoElement;

    if (allStreamsMuted && videoRef.current) {
      videoRef.current.muted = !isMuted;
    }

    setSmelterState((prev) => {
      return { ...prev, audioStreamId: isMuted ? streamId : undefined };
    });

    await selectAudioStream(isMuted ? streamId : '');
  };

  const refreshState = async () => {
    const state = await getSmelterState();
    console.log(state);
    setSmelterState(state);
    setActiveLayoutId(state.layout);
  };

  useEffect(() => {
    const timeout = setInterval(refreshState, 5000);
    return () => clearInterval(timeout);
  }, []);

  const availableStreams = smelterState.availableStreams.map(
    (stream) =>
      ({
        ...stream,
        isMuted: smelterState.audioStreamId !== stream.id,
        isConnected: smelterState.connectedStreamIds.includes(stream.id),
      }) as ExtendedStreamInfo,
  );

  return (
    <motion.div
      variants={staggerContainer}
      className='h-screen flex flex-col p-2 py-4 md:p-4 bg-black-100'>
      <StatusLabel smelterState={smelterState} />

      <motion.div
        variants={staggerContainer}
        className='flex-1 md:grid grid-cols-4 gap-4 min-h-0'>
        <VideoPreview videoRef={videoRef} />

        <motion.div
          className='flex flex-col gap-4 min-h-0 h-full max-h-full'
          layout>
          <ControlPanel
            availableStreams={availableStreams}
            toggleStream={toggleStream}
            toggleStreamAudio={toggleStreamAudio}
          />
          <LayoutSelector
            changeLayout={changeLayout}
            activeLayoutId={activeLayoutId}
            connectedStreamsLength={smelterState.connectedStreamIds.length}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
