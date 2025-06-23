import OutputStream from '@/app/components/OutputStream';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fadeInUp } from '@/utils/animations';
import { motion } from 'framer-motion';
import { VideoOff } from 'lucide-react';

export default function VideoPreview() {
  const activeStream = true;
  return (
    <motion.div className='col-span-3' {...(fadeInUp as any)}>
      <Card className='h-full flex flex-col bg-black-90 border-black-50'>
        <CardHeader className='pb-3'>
          <CardTitle className='text-sm font-medium text-white-75'>
            Live Preview
          </CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col'>
          <div className='flex-1 rounded border flex items-center justify-center border-black-50 bg-black-75'>
            {activeStream ? (
              <div>
                <OutputStream />
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
