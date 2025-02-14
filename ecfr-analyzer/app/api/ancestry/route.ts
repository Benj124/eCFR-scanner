import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters from the request URL
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');      // e.g. "2015-12-18"
    const title = searchParams.get('title');    // e.g. "1"
    const section = searchParams.get('section'); // e.g. "10.2"

    // Validate required parameters
    if (!date || !title || !section) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required query parameters: date, title, or section.',
        },
        { status: 400 }
      );
    }

    // Construct the eCFR API endpoint
    // Example: https://www.ecfr.gov/api/versioner/v1/ancestry/2015-12-18/title-1.json?section=10.2
    const ecfrApiUrl = `https://www.ecfr.gov/api/versioner/v1/ancestry/${date}/title-${title}.json?section=${encodeURIComponent(
      section
    )}`;

    // Fetch from the eCFR API
    const response = await fetch(ecfrApiUrl, {
      headers: { accept: 'application/json' },
    });

    // If eCFR responds with a non-OK status, return an error
    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Error fetching ancestry data from eCFR: ${response.statusText}`,
        },
        { status: response.status }
      );
    }

    // Parse and return the JSON data
    const data = await response.json();
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Unknown error' },
      { status: 500 }
    );
  }
}
