import OutputStream from '@/components/output-stream';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fadeInUp } from '@/utils/animations';
import { motion } from 'framer-motion';
import { VideoOff } from 'lucide-react';
import { RefObject } from 'react';

export default function VideoPreview({
  whepUrl,
  videoRef,
  tryToPlay,
}: {
  whepUrl: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  tryToPlay?(): void;
}) {
  const activeStream = true;

  return (
    <motion.div
      className='col-span-3 xl:sticky xl:top-0 self-start'
      {...(fadeInUp as any)}>
      <Card className='flex flex-col bg-black-90 border-0'>
        <CardContent className='flex flex-col'>
          <div className='rounded flex items-center justify-center bg-black-75'>
            {activeStream ? (
              <div>
                <OutputStream videoRef={videoRef} whepUrl={whepUrl} />
              </div>
            ) : (
              <div className='text-center'>
                <VideoOff className='w-12 h-12 mx-auto mb-2 text-white-25' />
                <p className='text-sm text-white-25'>No active stream</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
