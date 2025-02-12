import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title');
    if (!title) {
      return NextResponse.json({ success: false, error: 'Missing title parameter' }, { status: 400 });
    }

    const apiUrl = `https://www.ecfr.gov/api/versioner/v1/versions/title-${title}.json`;
    const response = await fetch(apiUrl, {
      headers: {
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching version data: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error in /titles/version route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
