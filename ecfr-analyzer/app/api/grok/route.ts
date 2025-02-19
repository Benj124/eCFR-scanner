import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("Grok API Request Body:", body);

    if (!process.env.GROK_API_KEY) {
      throw new Error("GROK_API_KEY is not defined in environment variables");
    }

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        ...body,
        model: "grok-2-latest", // Default model from curl example
        stream: false, // Match curl example
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Grok API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Grok API Response:", data);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /api/grok:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";