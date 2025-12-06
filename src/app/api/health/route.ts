import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test basic functionality
    const testUrl = 'https://example.com';
    
    return NextResponse.json({
      status: 'healthy',
      message: 'Extraction service is operational',
      testUrl,
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        playwrightBrowsersPath: process.env.PLAYWRIGHT_BROWSERS_PATH,
        hasFirebaseServiceAccount: !!(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT_PATH),
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}