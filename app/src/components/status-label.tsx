import { StreamOptions } from '@/app/actions';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export default function StatusLabel({
  smelterState,
}: {
  smelterState: StreamOptions;
}) {
  return (
    <div className='flex items-center justify-between mb-4'>
      <Image
        src='smelter-logo.svg'
        alt={'Smelter logo'}
        width={162.5}
        height={21.25}
      />
      <div className='flex items-center gap-4'>
        <Badge
          variant='outline'
          className='border-purple-40 text-purple-40 bg-transparent'>
          {smelterState.connectedStreamIds.length} streams connected
        </Badge>
      </div>
    </div>
  );
}
