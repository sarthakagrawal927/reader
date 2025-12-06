import { NextRequest, NextResponse } from 'next/server';
import { createArticleRecord, fetchArticleSummaries } from '../../../lib/articles-service';
import { verifyAuthToken, createAuthRequiredResponse } from '../../../lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuthToken(request);
    if (!userId) {
      return createAuthRequiredResponse();
    }

    const projectId = request.nextUrl.searchParams.get('projectId') || undefined;
    const articles = await fetchArticleSummaries(projectId || undefined, userId);
    return NextResponse.json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await verifyAuthToken(request as NextRequest);
    if (!userId) {
      return createAuthRequiredResponse();
    }

    const body = await request.json();
    const { url, title, byline, content, projectId } = body || {};

    if (!url || !content) {
      return NextResponse.json({ error: 'URL and content are required' }, { status: 400 });
    }

    const id = await createArticleRecord({ url, title, byline, content, projectId, userId });
    return NextResponse.json({ id });
  } catch (error) {
    console.error('Error creating article:', error);
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
  }
}
