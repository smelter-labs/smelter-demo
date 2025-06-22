import { COLORS } from '@/app/page';
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
    <Card
      className='flex-1 flex flex-col min-h-0'
      style={{
        backgroundColor: COLORS.black90,
        borderColor: COLORS.black50,
      }}>
      <CardHeader className='pb-3'>
        <CardTitle
          className='text-sm font-medium'
          style={{ color: COLORS.white75 }}>
          Streams
        </CardTitle>
      </CardHeader>
      <CardContent className='flex-1 overflow-y-auto'>
        <div className='space-y-2'>
          {availableStreams.map((stream) => (
            <div
              key={stream.id}
              className='p-2 rounded border'
              style={{
                backgroundColor: COLORS.black75,
                borderColor:
                  stream.isConnected && !stream.isMuted
                    ? COLORS.green60
                    : COLORS.black50,
              }}>
              <div className='flex items-center justify-between mb-2'>
                <div>
                  <div
                    className='text-xs font-medium'
                    style={{ color: COLORS.white100 }}>
                    {stream.label}
                  </div>
                  <div className='text-xs' style={{ color: COLORS.white50 }}>
                    {stream.id}
                  </div>
                </div>
                {stream.isConnected && (
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-6 w-6 p-0'
                    // onClick={() => toggleMute(stream.id)}
                  >
                    {stream.isMuted ? (
                      <MicOff
                        className='w-3 h-3'
                        style={{ color: COLORS.red40 }}
                      />
                    ) : (
                      <Mic
                        className='w-3 h-3'
                        style={{ color: COLORS.green60 }}
                      />
                    )}
                  </Button>
                )}
              </div>
              <Button
                size='sm'
                className='w-full h-6 text-xs'
                // onClick={() => toggleConnection(stream.id)}
                style={{
                  backgroundColor: stream.isConnected
                    ? COLORS.red80
                    : COLORS.green100,
                  color: COLORS.white100,
                  fontSize: '10px',
                }}>
                {stream.isConnected ? 'Disconnect' : 'Connect'}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
