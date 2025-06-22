'use client';

import { Layout, StreamOptions } from '@/app/actions';
import { useState } from 'react';
import LayoutSelector from '@/components/layout-selector';
import ControlPanel, { ExtendedStreamInfo } from '@/components/control-panel';
import VideoPreview from '@/components/video-preview';
import StatusLabel from '@/components/status-label';

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
    <div className='h-screen flex flex-col p-4 bg-black-100'>
      <StatusLabel smelterState={smelterState} />

      <div className='flex-1 grid grid-cols-4 gap-4 min-h-0'>
        <VideoPreview />

        <div className='flex flex-col gap-4 min-h-0'>
          <ControlPanel availableStreams={availableStreams} />
          <LayoutSelector
            changeLayout={changeLayout}
            activeLayoutId={activeLayoutId}
            connectedStreamsLength={smelterState.connectedStreamIds.length}
          />
        </div>
      </div>
    </div>
  );
}
