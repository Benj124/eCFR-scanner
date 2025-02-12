import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiUrl = 'https://www.ecfr.gov/api/versioner/v1/titles.json';
    const response = await fetch(apiUrl, {
      headers: {
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error fetching titles: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error in /titles route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
