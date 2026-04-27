import { NextResponse } from "next/server";
import { scraperClient } from "@/lib/scraper";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("requestId");

    if (!requestId) {
      return NextResponse.json(
        { error: "requestId is required." },
        { status: 400 }
      );
    }

    const data = await scraperClient.checkStatus(requestId);
    
    // Check if both are DONE or just return the current status
    const isDone = data.android_status === "DONE" && data.ios_status === "DONE";
    
    const responseData = {
      ...data,
      isDone,
      android_url: isDone ? `${scraperClient.baseURL}/demo/download/${requestId}/ANDROID` : null,
      ios_url: isDone ? `${scraperClient.baseURL}/demo/download/${requestId}/IOS` : null,
    };

    return NextResponse.json({ success: true, data: responseData });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to check status" },
      { status: 500 }
    );
  }
}
