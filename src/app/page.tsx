import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import HomeClient from "../components/HomeClient";
import { fetchArticleSummaries } from "../lib/articles-service";

export default async function Page() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['articles'],
    queryFn: fetchArticleSummaries,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomeClient />
    </HydrationBoundary>
  );
}
