import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apiUrl = `https://www.ecfr.gov/api/search/v1/count?${searchParams.toString()}`;

    const response = await fetch(apiUrl, {
      headers: {
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching count: ${response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json({ success: true, data });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error in /count route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
