import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff } from 'lucide-react';
import { StreamInfo } from '@/app/actions';

export type ExtendedStreamInfo = StreamInfo & {
  isMuted: boolean;
  isConnected: boolean;
};

export default function ControlPanel({
  availableStreams,
}: {
  availableStreams: ExtendedStreamInfo[];
}) {
  return (
    <Card className='flex-1 flex flex-col min-h-0 bg-black-90 border-black-50'>
      <CardHeader className='pb-3'>
        <CardTitle className='text-sm font-medium text-white-75'>
          Streams
        </CardTitle>
      </CardHeader>
      <CardContent className='flex-1 overflow-y-auto'>
        <div className='space-y-2'>
          {availableStreams.map((stream) => (
            <div
              key={stream.id}
              className={`p-2 rounded border bg-black-75 ${stream.isConnected && !stream.isMuted ? 'border-green-600' : 'border-gray-500'}`}>
              <div className='flex items-center justify-between mb-2'>
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
                    className='h-6 w-6 p-0'
                    // onClick={() => toggleMute(stream.id)}
                  >
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
                className={`w-full h-6 text-xs text-white-100 ${stream.isConnected ? 'bg-red-80' : 'bg-green-100'}`}
                // onClick={() => toggleConnection(stream.id)}
              >
                {stream.isConnected ? 'Disconnect' : 'Connect'}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
