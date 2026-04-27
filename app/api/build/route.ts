import { NextResponse } from "next/server";
import { scraperClient } from "@/lib/scraper";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { appName, websiteUrl } = body;

    if (!appName || !websiteUrl) {
      return NextResponse.json(
        { error: "appName and websiteUrl are required." },
        { status: 400 }
      );
    }

    const result = await scraperClient.buildApp({ appName, websiteUrl });
    
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to initiate build" },
      { status: 500 }
    );
  }
}
