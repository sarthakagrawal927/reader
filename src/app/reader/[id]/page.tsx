import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import ReaderClient from "../../../components/ReaderClient";
import { fetchArticleById } from "../../../lib/articles-service";

export default async function ReaderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const queryClient = new QueryClient();

  const article = await fetchArticleById(id);
  if (!article) {
    notFound();
  }

  queryClient.setQueryData(['article', id], article);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ReaderClient articleId={id} />
    </HydrationBoundary>
  );
}
