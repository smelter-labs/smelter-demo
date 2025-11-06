import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fadeIn2 } from '@/utils/animations';
import { motion } from 'framer-motion';
import { Grid3X3, Layers, LayoutGrid, LucideIcon, Square } from 'lucide-react';

export type Layout =
  | 'grid'
  | 'primary-on-left'
  | 'primary-on-top'
  | 'picture-in-picture';

type LayoutConfig = {
  id: Layout;
  name: string;
  icon: LucideIcon;
  maxStreams: number;
};

export const LAYOUT_CONFIGS = [
  {
    id: 'primary-on-left',
    name: 'Primary Left',
    icon: LayoutGrid,
    maxStreams: 4,
  },
  { id: 'grid', name: 'Grid', icon: Grid3X3, maxStreams: 4 },
  { id: 'primary-on-top', name: 'Primary Top', icon: Square, maxStreams: 4 },
  {
    id: 'picture-in-picture',
    name: 'Picture in Picture',
    icon: LayoutGrid,
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
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`transition-all duration-300 ease-in-out rounded-sm
                              ${i < streamCount ? 'bg-purple-80 border border-white-25' : 'border border-dashed border-white-25'}`}
              />
            ))}
          </div>
        );
      case 'primary-on-left':
        return (
          <div className='w-full h-full flex gap-0.5'>
            <div
              className={`transition-all duration-300 ease-in-out w-2/3 rounded-md border border-white-25 ${streamCount > 0 ? 'bg-purple-80' : 'bg-transparent'}`}
            />
            <div className='w-1/3 flex flex-col gap-0.5'>
              {Array.from({ length: 3 }).map((_, i) => {
                const isActive = i < streamCount - 1;
                return (
                  <div
                    key={i}
                    className={`transition-all duration-300 ease-in-out flex-1 rounded-sm border ${isActive ? 'border-white-25 bg-purple-80' : 'border-dashed border-white-25'}`}
                  />
                );
              })}
            </div>
          </div>
        );
      case 'primary-on-top':
        return (
          <div className='w-full h-full flex flex-col gap-0.5'>
            <div
              className={`transition-all duration-300 ease-in-out h-2/3 rounded-md border border-white-25 ${streamCount > 0 ? 'bg-purple-80' : 'bg-transparent'}`}
            />
            <div className='h-1/3 flex gap-0.5'>
              {Array.from({ length: 3 }).map((_, i) => {
                const isActive = i < Math.max(0, streamCount - 1);
                return (
                  <div
                    key={i}
                    className={`transition-all duration-300 ease-in-out flex-1 rounded-sm border ${isActive ? 'border-white-25 bg-purple-80' : 'border-dashed border-white-25'}`}
                  />
                );
              })}
            </div>
          </div>
        );
      case 'picture-in-picture':
        return (
          <div className='w-full h-full relative'>
            <div
              className={`transition-all duration-300 ease-in-out w-full h-full rounded-md border border-white-25 ${streamCount > 0 ? 'bg-purple-80' : 'bg-transparent'}`}
            />
            {Array.from({ length: Math.max(0, streamCount - 1) }).map(
              (_, idx) => {
                return (
                  <div
                    key={idx}
                    className='transition-all duration-300 ease-in-out absolute border border-white-25 bg-purple-80 rounded-xs'
                    style={{
                      top: `${0.5 + idx * 1.7}rem`,
                      right: '0.5rem',
                      width: '25%',
                      height: '25%',
                      zIndex: 10 + idx,
                    }}></div>
                );
              },
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      {...(fadeIn2 as any)}
      className='text-card-foreground flex-col gap-1 rounded-xl border py-6 shadow-sm flex flex-1 bg-black-90 border-black-50'>
      <div>
        <div className='grid grid-cols-2 gap-2'>
          {LAYOUT_CONFIGS.map((layout) => {
            const Icon = layout.icon;
            const isActive = activeLayoutId === layout.id;
            return (
              <button
                key={layout.id}
                onClick={() => changeLayout(layout.id)}
                className={`duration-300 ease-in-out p-2 rounded-md border transition-colors cursor-pointer ${isActive ? 'bg-purple-100 border-purple-60' : 'bg-black-75 border-black-50 hover:bg-purple-100/50'}`}>
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
      </div>
    </motion.div>
  );
}
