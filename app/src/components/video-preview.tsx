import { COLORS, LAYOUT_CONFIGS } from '@/app/page';
import OutputStream from '@/app/components/OutputStream';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Mic,
  MicOff,
  Monitor,
  Grid3X3,
  Layers,
  LayoutGrid,
  Video,
  VideoOff,
} from 'lucide-react';

export default function VideoPreview() {
  const activeStream = true;
  return (
    <div className='col-span-3'>
      <Card
        className='h-full flex flex-col'
        style={{
          backgroundColor: COLORS.black90,
          borderColor: COLORS.black50,
        }}>
        <CardHeader className='pb-3'>
          <CardTitle
            className='text-sm font-medium'
            style={{ color: COLORS.white75 }}>
            Live Preview
          </CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col'>
          <div
            className='flex-1 rounded border flex items-center justify-center'
            style={{
              borderColor: COLORS.black50,
              backgroundColor: COLORS.black75,
            }}>
            {activeStream ? (
              <div>
                <OutputStream />
              </div>
            ) : (
              <div className='text-center'>
                <VideoOff
                  className='w-12 h-12 mx-auto mb-2'
                  style={{ color: COLORS.white25 }}
                />
                <p className='text-sm' style={{ color: COLORS.white25 }}>
                  No active stream
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
