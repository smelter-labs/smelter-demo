'use client';

import {
  addStream,
  getSmelterState,
  removeStream,
  selectAudioStream,
  StreamOptions,
  updateLayout,
} from '@/app/actions';
import OutputStream from '@/app/components/OutputStream';
import { useEffect, useState } from 'react';

const LayoutValues = [
  'grid',
  'primary-on-left',
  'primary-on-top',
  'secondary-in-corner',
] as const;

export default function Home() {
  const [layoutIndex, setLayout] = useState(0);
  const [smelterState, setSmelterState] = useState<StreamOptions>({
    availableStreams: [],
    connectedStreamIds: [],
    layout: 'grid',
  });
  const changeLayout = async () => {
    const newLayout = (layoutIndex + 1) % LayoutValues.length;
    setLayout(newLayout);
    await updateLayout(LayoutValues[newLayout]);
  };

  const refreshState = async () => {
    const state = await getSmelterState();
    console.log(state);
    setSmelterState(state);
  };

  useEffect(() => {
    const timeout = setInterval(refreshState, 5000);
    return () => clearInterval(timeout);
  }, []);

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <OutputStream />
        <div className="flex row">
          <p className="text-lg m-2 p-2">
            Change layout (current: {LayoutValues[layoutIndex]}):
          </p>
          <button
            onClick={() => changeLayout().then(refreshState)}
            className="btn bg-blue-500 m-2  p-2 text-white"
          >
            next layout: (
            {LayoutValues[(layoutIndex + 1) % LayoutValues.length]})
          </button>
        </div>

        {smelterState.availableStreams
          .filter(
            (stream) => !smelterState.connectedStreamIds.includes(stream.id),
          )
          .map((stream) => (
            <div className="flex row" key={stream.id}>
              <p className="text-lg m-2 p-2">{stream.label}</p>
              <button
                onClick={() => addStream(stream.id).then(refreshState)}
                className="btn border border-2 text-green-500 border-green m-2 p-2"
              >
                connect
              </button>
            </div>
          ))}
        {smelterState.availableStreams
          .filter((stream) =>
            smelterState.connectedStreamIds.includes(stream.id),
          )
          .map((stream) => (
            <div className="flex row" key={stream.id}>
              <p className="text-lg m-2 p-2">{stream.label}</p>
              <button
                onClick={() => removeStream(stream.id).then(refreshState)}
                key={stream.id}
                className="btn border border-2 border-red m-2  p-2"
              >
                disconnect
              </button>
              <button
                onClick={() =>
                  selectAudioStream(
                    stream.id === smelterState.audioStreamId
                      ? undefined
                      : stream.id,
                  ).then(refreshState)
                }
                className={
                  stream.id === smelterState.audioStreamId
                    ? 'btn bg-red-500 m-2 p-2 text-white'
                    : 'btn bg-green-500 m-2 p-2 text-white'
                }
              >
                {stream.id === smelterState.audioStreamId ? 'mute' : 'unmute'}
              </button>
            </div>
          ))}
      </main>
    </div>
  );
}
