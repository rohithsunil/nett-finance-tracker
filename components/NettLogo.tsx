import Image from 'next/image';

export default function NettLogo({ large = false, priority = false }: { large?: boolean; priority?: boolean }) {
  return <div className={`brand-mark ${large ? 'large' : ''}`} aria-label="Nett">
    <Image src="/icons/nett-lotus-512.png" alt="Nett lotus" fill sizes={large ? '48px' : '34px'} priority={priority} />
  </div>;
}
