import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const readabilityScriptPath = require.resolve('@mozilla/readability/Readability.js');

type ReadabilityArticle = {
  title: string;
  content: string;
  byline: string | null;
  siteName: string | null;
};

type ReadabilityWindow = Window &
  typeof globalThis & {
    Readability?: new (doc: Document) => { parse(): ReadabilityArticle | null };
  };

export async function GET(req: NextRequest) {
  const targetUrl = req.nextUrl.searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('URL parameter is required', { status: 400 });
  }

  let browser;
  try {
    // We still use Playwright to fetch the page content because it handles dynamic JS better than a simple fetch
    browser = await chromium.launch();
    const page = await browser.newPage();

    // Block resources to speed up loading
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.addScriptTag({ path: readabilityScriptPath });

    const article = await page.evaluate<ReadabilityArticle | null>(() => {
      const Reader = (window as ReadabilityWindow).Readability;
      if (!Reader) {
        return null;
      }
      const reader = new Reader(document);
      const result = reader.parse();
      return result
        ? {
            title: result.title ?? '',
            content: result.content ?? '',
            byline: result.byline ?? null,
            siteName: result.siteName ?? null,
          }
        : null;
    });

    if (!article) {
      throw new Error('Failed to parse article content');
    }

    await browser.close();

    return NextResponse.json({
      snapshot: {
        title: article.title,
        content: article.content,
        byline: article.byline,
        siteName: article.siteName,
        url: targetUrl,
      },
    });
  } catch (error: unknown) {
    if (browser) {
      await browser.close();
    }
    console.error('Snapshot error:', error);
    return new NextResponse(
      JSON.stringify({
        message: 'Failed to capture the website content.',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
