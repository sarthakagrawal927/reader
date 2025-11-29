import { NextRequest, NextResponse } from "next/server";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { chromium } from "playwright";

export async function GET(req: NextRequest) {
  const targetUrl = req.nextUrl.searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("URL parameter is required", { status: 400 });
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

    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    const html = await page.content();
    await browser.close();

    // Parse with JSDOM and Readability
    const doc = new JSDOM(html, { url: targetUrl });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();

    if (!article) {
      throw new Error("Failed to parse article content");
    }

    return NextResponse.json({ 
      snapshot: {
        title: article.title,
        content: article.content,
        byline: article.byline,
        siteName: article.siteName,
        url: targetUrl
      } 
    });
  } catch (error: any) {
    if (browser) {
      await browser.close();
    }
    console.error("Snapshot error:", error);
    return new NextResponse(
      JSON.stringify({
        message: "Failed to capture the website content.",
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
