import Image from 'next/image';
import Link from 'next/link';

export default function StatusLabel() {
  return (
    <div className='flex items-center justify-between mb-4 px-4 py-2'>
      <Link href='/'>
        <Image
          src='/smelter-logo.svg'
          alt={'Smelter logo'}
          width={162.5 / 1.2}
          height={21.25 / 1.2}
        />
      </Link>
    </div>
  );
}
