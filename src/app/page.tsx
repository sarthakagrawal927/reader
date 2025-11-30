import { dehydrate } from '@tanstack/react-query';
import HomeClient from '../components/HomeClient';
import { fetchArticleSummaries, fetchProjects } from '../lib/articles-service';
import { ReactQueryHydrate } from '../components/ReactQueryHydrate';
import { getQueryClient } from '../lib/get-query-client';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['articles'],
    queryFn: () => fetchArticleSummaries(),
  });
  await queryClient.prefetchQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });

  return (
    <ReactQueryHydrate state={dehydrate(queryClient)}>
      <HomeClient />
    </ReactQueryHydrate>
  );
}
