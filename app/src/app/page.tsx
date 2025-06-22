'use client';

import {
  addStream,
  Layout,
  removeStream,
  selectAudioStream,
  StreamOptions,
  updateLayout,
} from '@/app/actions';
import { useState } from 'react';
import LayoutSelector from '@/components/layout-selector';
import ControlPanel, { ExtendedStreamInfo } from '@/components/control-panel';
import VideoPreview from '@/components/video-preview';
import StatusLabel from '@/components/status-label';
import { motion } from 'framer-motion';
import { staggerContainer } from '@/utils/animations';

// Mock stream data
const AVAILABLE_STREAMS = [
  { id: 'stream-1', label: 'Camera 1' },
  { id: 'stream-2', label: 'Screen Share' },
  { id: 'stream-3', label: 'Camera 2' },
  { id: 'stream-4', label: 'Mobile Feed' },
  { id: 'stream-5', label: 'External Input' },
];

export default function Home() {
  // const [layoutIndex, setLayout] = useState(0);
  const [activeLayoutId, setActiveLayoutId] = useState<Layout>(
    'secondary-in-corner',
  );
  const [smelterState, setSmelterState] = useState<StreamOptions>({
    availableStreams: [...AVAILABLE_STREAMS],
    connectedStreamIds: [],
    layout: 'grid',
    audioStreamId: undefined,
  });

  const changeLayout = async (layoutId: Layout) => {
    console.log('TEST');
    setActiveLayoutId(layoutId);

    // await updateLayout(LayoutValues[newLayout]);
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
    setSmelterState((prev) => {
      return { ...prev, audioStreamId: isMuted ? streamId : undefined };
    });

    await selectAudioStream(isMuted ? streamId : '');
  };

  // const refreshState = async () => {
  //   const state = await getSmelterState();
  //   console.log(state);
  //   setSmelterState(state);
  // };

  // useEffect(() => {
  //   const timeout = setInterval(refreshState, 5000);
  //   return () => clearInterval(timeout);
  // }, []);

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
        <VideoPreview />

        <motion.div className='flex flex-col gap-4 min-h-0' layout>
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
