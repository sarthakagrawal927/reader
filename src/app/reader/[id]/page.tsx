import { dehydrate } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import ReaderClient from '../../../components/ReaderClient';
import { fetchArticleById } from '../../../lib/articles-service';
import { ReactQueryHydrate } from '../../../components/ReactQueryHydrate';
import { getQueryClient } from '../../../lib/get-query-client';

export const dynamic = 'force-dynamic';

export default async function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const queryClient = getQueryClient();

  const article = await fetchArticleById(id);
  if (!article) {
    notFound();
  }

  queryClient.setQueryData(['article', id], article);

  return (
    <ReactQueryHydrate state={dehydrate(queryClient)}>
      <ReaderClient articleId={id} />
    </ReactQueryHydrate>
  );
}
