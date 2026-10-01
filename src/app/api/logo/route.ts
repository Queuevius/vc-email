// PC-5 chunk 3 (30 September 2026): the logo above the "Adele" button.
// Anyone can read it. Only the admin login can change or remove it.
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/auth";
import { NextRequest } from "next/server";
import { getRedisClient } from "@/lib/redis";

const LOGO_KEY = "logo";
const MAX_CHARS = 700_000; // about 500 KB of picture
const ALLOWED = /^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/;

export const dynamic = "force-dynamic";

async function isAdminViewer(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "ADMIN";
}

export async function GET() {
  try {
    const redis = getRedisClient();
    const logo = redis ? await redis.get<string>(LOGO_KEY) : null;
    return Response.json(
      { logo: typeof logo === "string" ? logo : null },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Logo read failed:", err);
    return Response.json({ logo: null }, { headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdminViewer())) {
    return Response.json({ error: "Only the admin login can change the logo." }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const logo = typeof body.logo === "string" ? body.logo : "";
  if (logo.length > MAX_CHARS) {
    return Response.json({ error: "That picture is too big. Use one under 500 KB." }, { status: 400 });
  }
  if (!ALLOWED.test(logo)) {
    return Response.json(
      { error: "That file is not a picture this page can use. Use PNG, JPG, GIF, WEBP or SVG." },
      { status: 400 }
    );
  }
  const redis = getRedisClient();
  if (!redis) {
    return Response.json({ error: "The store for the logo is not set up." }, { status: 500 });
  }
  await redis.set(LOGO_KEY, logo);
  return Response.json({ success: true });
}

export async function DELETE() {
  if (!(await isAdminViewer())) {
    return Response.json({ error: "Only the admin login can remove the logo." }, { status: 403 });
  }
  const redis = getRedisClient();
  if (!redis) {
    return Response.json({ error: "The store for the logo is not set up." }, { status: 500 });
  }
  await redis.del(LOGO_KEY);
  return Response.json({ success: true });
}
