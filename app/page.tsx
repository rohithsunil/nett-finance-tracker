import { redirect } from 'next/navigation';
import AuthenticatedNettPage from '@/components/AuthenticatedNettPage';

type HomeProps = {
  searchParams: Promise<{ code?: string; next?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  if (params.code) {
    const callbackParams = new URLSearchParams({ code: params.code });
    if (params.next?.startsWith('/') && !params.next.startsWith('//')) callbackParams.set('next', params.next);
    redirect(`/auth/callback?${callbackParams.toString()}`);
  }

  return <AuthenticatedNettPage tab="home" />;
}
