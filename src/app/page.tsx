import { redirect } from 'next/navigation';
import { dehydrate } from '@tanstack/react-query';
import HomeClient from '../components/HomeClient';
import { fetchArticleSummaries, fetchProjects } from '../lib/articles-service';
import { ReactQueryHydrate } from '../components/ReactQueryHydrate';
import { getQueryClient } from '../lib/get-query-client';
import { getCurrentUser } from '../lib/auth-server';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['articles'],
    queryFn: () => fetchArticleSummaries(user.uid),
  });
  await queryClient.prefetchQuery({
    queryKey: ['projects'],
    queryFn: () => fetchProjects(user.uid),
  });

  return (
    <ReactQueryHydrate state={dehydrate(queryClient)}>
      <HomeClient />
    </ReactQueryHydrate>
  );
}
