/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Parse query parameters from the URL
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const title = searchParams.get('title');
  const section = searchParams.get('section');

  // Validate required parameters
  if (!date || !title || !section) {
    return NextResponse.json(
      { error: 'Missing required query parameters. Expected: date, title, section.' },
      { status: 400 }
    );
  }

  // Build the external API URL
  const externalUrl = `https://www.ecfr.gov/api/versioner/v1/full/${date}/title-${title}.xml?section=${section}`;

  try {
    // Call the external API with the appropriate header
    const externalResponse = await fetch(externalUrl, {
      headers: {
        accept: 'application/xml'
      }
    });

    if (!externalResponse.ok) {
      return NextResponse.json(
        { error: `External API responded with status ${externalResponse.status}` },
        { status: externalResponse.status }
      );
    }

    // Read the XML response as text
    const xmlData = await externalResponse.text();

    // Return the XML with the correct content type
    return new Response(xmlData, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' }
    });
  } catch (error: any) {
    console.error('Error fetching XML from external API:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
