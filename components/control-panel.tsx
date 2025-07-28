import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { StreamInfo } from '@/app/actions';
import { fadeIn } from '@/utils/animations';
import LoadingSpinner from '@/components/ui/spinner';
import { motion } from 'framer-motion';
import { CardHeader, CardTitle } from './ui/card';

export type ExtendedStreamInfo = StreamInfo & {
  isMuted: boolean;
  isConnected: boolean;
};

type ControlPanelProps = {
  availableStreams: ExtendedStreamInfo[];
  toggleStream: (streamId: string) => void;
  toggleStreamAudio: (streamId: string) => void;
};

export default function ControlPanel({
  availableStreams,
  toggleStream,
  toggleStreamAudio,
}: ControlPanelProps) {
  return (
    <motion.div
      {...(fadeIn as any)}
      className='flex flex-col flex-1 min-h-0 gap-1 rounded-xl bg-black-90 border border-black-50 pt-6 shadow-sm'>
      <CardHeader className='pb-3'>
        <CardTitle className='text-sm font-medium text-white-75'>
          Streams
        </CardTitle>
      </CardHeader>
      <div className='flex flex-col flex-1 overflow-hidden relative '>
        {availableStreams.length === 0 ? (
          <div className='flex flex-1 items-center justify-center'>
            <LoadingSpinner size='xl' variant='spinner' />
          </div>
        ) : (
          <div className='flex-1 overflow-auto pr-2'>
            <div className='pointer-events-none absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-black-75 to-transparent z-40' />
            <div className='pointer-events-none absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black-75 to-transparent z-40' />
            <div className='relative z-20 pt-2'>
              {availableStreams.map((stream) => (
                <div
                  key={stream.id}
                  className='p-2 mb-2 last:mb-0 rounded border bg-black-75 border-gray-500/50'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <div className='text-xs font-medium text-white-100'>
                        {stream.label}
                      </div>
                      <div className='text-xs text-white-50'>{stream.id}</div>
                    </div>
                    {stream.isConnected && (
                      <Button
                        size='sm'
                        variant='ghost'
                        className='transition-all duration-300 ease-in-out h-8 w-8 p-2 cursor-pointer'
                        onClick={() => toggleStreamAudio(stream.id)}>
                        {stream.isMuted ? (
                          <MicOff className='w-3 h-3 text-red-40' />
                        ) : (
                          <Mic className='w-3 h-3 text-green-60' />
                        )}
                      </Button>
                    )}
                  </div>
                  <Button
                    size='sm'
                    className={`w-full h-6 text-xs text-white-100 hover:opacity-55 cursor-pointer ${stream.isConnected ? 'bg-red-80 hover:bg-red-80' : 'bg-green-100 hover:bg-green-100'}`}
                    onClick={() => toggleStream(stream.id)}>
                    {stream.isConnected ? 'Disconnect' : 'Connect'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
