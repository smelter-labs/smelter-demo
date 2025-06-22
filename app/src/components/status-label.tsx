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
import LayoutSelector from '@/components/layout-selector';
import ControlPanel from '@/components/control-panel';
import VideoPreview from '@/components/video-preview';
import { COLORS } from '@/app/page';

export default function StatusLabel({
  smelterState,
}: {
  smelterState: StreamOptions;
}) {
  return (
    <div className='flex items-center justify-between mb-4'>
      <h1 className='text-xl font-semibold' style={{ color: COLORS.white100 }}>
        Stream Composition Studio
      </h1>
      <div className='flex items-center gap-4'>
        <Badge
          variant='outline'
          style={{
            borderColor: COLORS.purple40,
            color: COLORS.purple40,
            backgroundColor: 'transparent',
          }}>
          {smelterState.connectedStreamIds.length} streams connected
        </Badge>
        {/* {smelterState.connectedStreamIds.length !== 0 && (
            <Badge
              style={{
                backgroundColor: COLORS.green100,
                color: COLORS.white100,
              }}>
              Live: {activeStream.name}
            </Badge>
          )} */}
      </div>
    </div>
  );
}
