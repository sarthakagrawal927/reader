import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';

const readabilityScriptPath = (() => {
  const scriptPath = join(
    process.cwd(),
    'node_modules',
    '@mozilla',
    'readability',
    'Readability.js'
  );

  if (!existsSync(scriptPath)) {
    throw new Error(`Readability script not found at ${scriptPath}`);
  }

  return scriptPath;
})();

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

// Fallback extraction method for serverless environments
async function extractWithFallback(targetUrl: string): Promise<ReadabilityArticle | null> {
  try {
    console.log('Attempting fallback extraction with axios + cheerio');
    
    // Fetch the HTML content
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });
    
    // Parse with cheerio
    const $ = cheerio.load(response.data);
    
    // Create a virtual DOM document for Readability
    const dom = new DOMParser().parseFromString(response.data, 'text/html');
    
    // Use Readability directly
    const reader = new Readability(dom);
    const article = reader.parse();
    
    return article ? {
      title: article.title || $('title').text() || '',
      content: article.content || '',
      byline: article.byline || null,
      siteName: article.siteName || null,
    } : null;
  } catch (error) {
    console.error('Fallback extraction failed:', error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const targetUrl = req.nextUrl.searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('URL parameter is required', { status: 400 });
  }

  let browser;
  try {
    // Configure browser launch for serverless environments
    const launchOptions = {
      // Use headless mode for serverless
      headless: true,
      // Configure for serverless environments
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    };

    // We still use Playwright to fetch the page content because it handles dynamic JS better than a simple fetch
    browser = await chromium.launch(launchOptions);
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

    await page.goto(targetUrl, { 
      waitUntil: 'domcontentloaded', 
      timeout: 45000 // Increased timeout for serverless environments
    });
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
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
    
    console.error('Playwright extraction failed, trying fallback:', error);
    
    // Try fallback extraction method
    const fallbackArticle = await extractWithFallback(targetUrl);
    
    if (fallbackArticle) {
      return NextResponse.json({
        snapshot: {
          title: fallbackArticle.title,
          content: fallbackArticle.content,
          byline: fallbackArticle.byline,
          siteName: fallbackArticle.siteName,
          url: targetUrl,
        },
        method: 'fallback'
      });
    }
    
    // If both methods fail, return error
    console.error('Both extraction methods failed');
    
    // Provide more detailed error information for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return new NextResponse(
      JSON.stringify({
        message: 'Failed to capture the website content using both Playwright and fallback method.',
        error: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
