import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Grid3X3, Layers, LayoutGrid, LucideIcon, Square } from 'lucide-react';

export type Layout =
  | 'grid'
  | 'primary-on-left'
  | 'primary-on-top'
  | 'secondary-in-corner';

type LayoutConfig = {
  id: Layout;
  name: string;
  icon: LucideIcon;
  maxStreams: number;
};

export const LAYOUT_CONFIGS = [
  { id: 'grid', name: 'Grid', icon: Grid3X3, maxStreams: 4 },
  {
    id: 'primary-on-left',
    name: 'Primary Left',
    icon: LayoutGrid,
    maxStreams: 4,
  },
  { id: 'primary-on-top', name: 'Primary Top', icon: Square, maxStreams: 4 },
  {
    id: 'secondary-in-corner',
    name: 'Corner PiP',
    icon: Layers,
    maxStreams: 4,
  },
] as const satisfies LayoutConfig[];

type LayoutSelectorProps = {
  changeLayout: (layout: Layout) => void;
  activeLayoutId: string;
  connectedStreamsLength: number;
};

export default function LayoutSelector({
  changeLayout,
  activeLayoutId,
  connectedStreamsLength,
}: LayoutSelectorProps) {
  const renderLayoutPreview = (layoutId: string) => {
    const config = LAYOUT_CONFIGS.find((l) => l.id === layoutId);
    if (!config) return null;

    const streamCount = Math.min(connectedStreamsLength, config.maxStreams);

    switch (layoutId) {
      case 'grid':
        return (
          <div className='w-full h-full grid grid-cols-2 gap-0.5'>
            {Array.from({ length: Math.min(4, streamCount) }).map((_, i) => (
              <div
                key={i}
                className='rounded-md border border-white-25 bg-purple-40'
              />
            ))}
            {Array.from({ length: 4 - Math.min(4, streamCount) }).map(
              (_, i) => (
                <div
                  key={`empty-${i}`}
                  className='rounded-md border border-dashed border-white-25'
                />
              ),
            )}
          </div>
        );
      case 'primary-on-left':
        return (
          <div className='w-full h-full flex gap-0.5'>
            <div
              className={`w-2/3 rounded-md border border-white-25 ${streamCount > 0 ? 'bg-purple-40' : 'bg-transparent'}`}
            />
            <div className='w-1/3 flex flex-col gap-0.5'>
              {Array.from({
                length: Math.min(3, Math.max(0, streamCount - 1)),
              }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-md border border-white-25 bg-purple-40`}
                />
              ))}
              {Array.from({
                length: 3 - Math.min(3, Math.max(0, streamCount - 1)),
              }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className='flex-1 rounded-md border border-dashed border-white-25'
                />
              ))}
            </div>
          </div>
        );
      case 'primary-on-top':
        return (
          <div className='w-full h-full flex flex-col gap-0.5'>
            <div
              className={`h-2/3 rounded-md border border-white-25 ${streamCount > 0 ? 'bg-purple-40' : 'bg-transparent'}`}
            />
            <div className='h-1/3 flex gap-0.5'>
              {Array.from({
                length: Math.min(3, Math.max(0, streamCount - 1)),
              }).map((_, i) => (
                <div
                  key={i}
                  className='flex-1 rounded-md border border-white-25 bg-purple-40'
                />
              ))}
              {Array.from({
                length: 3 - Math.min(3, Math.max(0, streamCount - 1)),
              }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className='flex-1 rounded-md border border-dashed border-white-25'
                />
              ))}
            </div>
          </div>
        );
      case 'secondary-in-corner':
        return (
          <div className='w-full h-full relative'>
            <div
              className={`w-full h-full rounded-md border border-white-25 ${streamCount > 0 ? 'bg-purple-40' : 'bg-transparent'}`}
            />
            {streamCount > 1 && (
              <div className='absolute top-0.5 right-0.5 w-1/4 h-1/4 rounded-md border border-white-25 bg-purple-40' />
            )}
            {streamCount > 2 && (
              <div className='absolute bottom-0.5 right-0.5 w-1/4 h-1/4 rounded-md border border-white-25 bg-purple-40' />
            )}
            {streamCount > 3 && (
              <div className='absolute bottom-0.5 left-0.5 w-1/4 h-1/4 rounded-md border border-white-25 bg-purple-40' />
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className='bg-black-90 border-black-50'>
      <CardHeader className='pb-3'>
        <CardTitle className='text-sm font-medium text-white-75'>
          Layout
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-2 gap-2'>
          {LAYOUT_CONFIGS.map((layout) => {
            const Icon = layout.icon;
            const isActive = activeLayoutId === layout.id;
            return (
              <button
                key={layout.id}
                onClick={() => changeLayout(layout.id)}
                className={`p-2 rounded-md border transition-colors cursor-pointer ${isActive ? 'bg-purple-100 border-purple-60' : 'bg-black-75 border-black-50'}`}>
                <div className='aspect-video mb-1 text-xs'>
                  {renderLayoutPreview(layout.id)}
                </div>
                <div className='flex items-center justify-center gap-1'>
                  <Icon className='w-3 h-3 text-white-75' />
                  <span className='text-xs text-white-75'>{layout.name}</span>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
