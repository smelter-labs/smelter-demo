import Image from 'next/image';
import Link from 'next/link';

export default function SmelterLogo() {
  return (
    <Link href='/'>
      <Image
        src='/smelter-logo.svg'
        alt={'Smelter logo'}
        width={162.5 / 1.2}
        height={21.25 / 1.2}
      />
    </Link>
  );
}
