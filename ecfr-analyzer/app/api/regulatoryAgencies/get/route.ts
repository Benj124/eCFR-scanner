import { NextResponse } from 'next/server';

/**
 * GET /api/regulatoryAgencies/get
 * 
 * Fetches the list of all top-level agencies (with children) from eCFR.
 */
export async function GET() {
  const ECFR_AGENCIES_URL = 'https://www.ecfr.gov/api/admin/v1/agencies.json';
  
  try {
    const res = await fetch(ECFR_AGENCIES_URL);

    if (!res.ok) {
      throw new Error(`Failed to fetch agencies: ${res.statusText}`);
    }

    const data = await res.json();

    // data structure example:
    // {
    //   "agencies": [
    //       {
    //         "name": "Administrative Conference of the United States",
    //         "short_name": "ACUS",
    //         "display_name": "Administrative Conference of the United States",
    //         ...
    //         "children": [...]
    //       }
    //       ...
    //   ]
    // }

    return NextResponse.json({ success: true, data });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Error fetching agencies:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
