import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters from the request URL
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const title = searchParams.get('title');

    if (!date || !title) {
      return NextResponse.json(
        { success: false, error: 'Please provide both "date" and "title" query parameters.' },
        { status: 400 }
      );
    }

    // Construct the eCFR API URL
    const ecfrApiUrl = `https://www.ecfr.gov/api/versioner/v1/structure/${date}/title-${title}.json`;

    // Fetch data from eCFR
    const response = await fetch(ecfrApiUrl, {
      headers: { accept: 'application/json' },
    });

    // If eCFR responds with an error code
    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Error fetching data from eCFR: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Parse JSON body
    const data = await response.json();

    // Return the data to the client
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Unknown error' },
      { status: 500 }
    );
  }
}
