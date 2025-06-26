import { restartService, StreamOptions } from '@/app/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoaderCircle } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function StatusLabel({
  smelterState,
}: {
  smelterState: StreamOptions;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <div className='flex items-center justify-between mb-4 px-4 py-2'>
      <Image
        src='smelter-logo.svg'
        alt={'Smelter logo'}
        width={162.5 / 1.2}
        height={21.25 / 1.2}
      />
      <div className='flex items-center gap-4'>
        <Button
          size='sm'
          variant='outline'
          className='border border-red-500 text-red-500 bg-transparent hover:bg-primary hover:text-red-200'
          onClick={async () => {
            setLoading(true);
            try {
              await restartService();
              router.refresh();
            } finally {
              setLoading(false);
            }
          }}>
          Restart service
          {loading ? <LoaderCircle /> : null}
        </Button>
        <Badge
          variant='outline'
          className='border-purple-40 text-purple-40 bg-transparent'>
          {smelterState.connectedStreamIds.length} streams connected
        </Badge>
      </div>
    </div>
  );
}
