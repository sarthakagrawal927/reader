import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const testUrl = req.nextUrl.searchParams.get('url') || 'https://example.com';
  
  try {
    // Test the extraction service
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/snapshot?url=${encodeURIComponent(testUrl)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      status: 'success',
      testUrl,
      result: {
        hasSnapshot: !!data.snapshot,
        title: data.snapshot?.title,
        contentLength: data.snapshot?.content?.length || 0,
        method: data.method || 'playwright',
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      testUrl,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}