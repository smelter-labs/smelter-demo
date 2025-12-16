import OutputStream from '@/components/output-stream';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Share2 } from 'lucide-react';
import { fadeInUp } from '@/utils/animations';
import { motion } from 'framer-motion';
import { VideoOff } from 'lucide-react';
import { RefObject } from 'react';

export default function VideoPreview({
  whepUrl,
  videoRef,
  tryToPlay,
  roomId,
}: {
  whepUrl: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  tryToPlay?(): void;
  roomId?: string;
}) {
  const activeStream = true;

  return (
    <motion.div
      className='col-span-1 xl:col-span-3 sticky top-0 self-start z-10 w-full'
      {...(fadeInUp as any)}>
      <Card className='flex flex-col bg-black-90 border-0'>
        <CardContent className='flex flex-col'>
          <div className='w-full max-w-[1920px] mx-auto'>
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
            {roomId && (
              <div className='mt-3 flex justify-end'>
                <Button
                  size='lg'
                  asChild
                  variant='outline'
                  className='text-black'>
                  <Link
                    href={`/room-preview/${roomId}`}
                    target='_blank'
                    rel='noopener noreferrer'>
                    <Share2 className='w-4 h-4' />
                    Prove Me
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
