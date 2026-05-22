import { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

export async function GET(request: Request) {
  // Simple security check using a CRON_SECRET header or query param
  const authHeader = request.headers.get("Authorization");
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  
  const expectedSecret = process.env.CRON_SECRET;
  
  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}` && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redis = getRedisClient();
  if (!redis) {
    return NextResponse.json({ error: "Redis not configured" }, { status: 500 });
  }

  try {
    const timestamp = new Date().toISOString();
    await redis.set("maintenance:last_ping", timestamp);
    return NextResponse.json({ success: true, timestamp });
  } catch (error: unknown) {
    console.error("Redis ping failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
