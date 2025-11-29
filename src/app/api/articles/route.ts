import { NextResponse } from 'next/server';
import { createArticleRecord, fetchArticleSummaries } from '../../../lib/articles-service';

export async function GET() {
  try {
    const articles = await fetchArticleSummaries();
    return NextResponse.json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, title, byline, content } = body || {};

    if (!url || !content) {
      return NextResponse.json({ error: 'URL and content are required' }, { status: 400 });
    }

    const id = await createArticleRecord({ url, title, byline, content });
    return NextResponse.json({ id });
  } catch (error) {
    console.error('Error creating article:', error);
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
  }
}
