'use client';

import { StreamOptions } from '@/app/actions';
import { useState } from 'react';
import LayoutSelector from '@/components/layout-selector';
import ControlPanel, { ExtendedStreamInfo } from '@/components/control-panel';
import VideoPreview from '@/components/video-preview';
import StatusLabel from '@/components/status-label';

export const COLORS = {
  black100: '#161127',
  black90: '#161127E6',
  black75: '#161127BF',
  black50: '#16112780',
  black25: '#16112740',
  white100: '#FFFFFFFF',
  white75: '#FFFFFFBF',
  white50: '#FFFFFF80',
  white25: '#FFFFFF40',
  red100: '#86081E',
  red80: '#BF0D2A',
  red60: '#EF193E',
  red40: '#F24664',
  red20: '#F78D9E',
  red0: '#FBC6CF',
  purple100: '#302555',
  purple80: '#493880',
  purple60: '#624BAA',
  purple40: '#8471C1',
  purple20: '#C2B1E0',
  gray50: '#424242',
  green100: '#0C662F',
  green60: '#3DA362',
  green20: '#A4D7AF',
  react100: '#61DAFB',
} as const;

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
  const [activeLayoutId, setActiveLayoutId] = useState('single');
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
    <div
      className='h-screen flex flex-col p-4'
      style={{ backgroundColor: COLORS.black100 }}>
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
