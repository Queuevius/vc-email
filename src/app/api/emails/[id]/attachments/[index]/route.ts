import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/auth";
import { NextRequest } from "next/server";
import { EmailService } from "@/services/emailService";
import { loadYesList, isHeld } from "@/lib/consent";

// PC-6 chunk 4b (2 October 2026): download one attached file.
// Consent rule: on an email that is not public yet, files are "not found"
// for everyone but Tony's admin login.
// Pictures and PDFs open in the browser; every other kind of file only
// downloads, so a file sent by a stranger can never run as part of the page.
// The file is sent in pieces, which lets files bigger than 4.5 MB through.
const SHOW_IN_BROWSER = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf"]);
const PIECE = 256 * 1024;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  const notFound = () => Response.json({ error: "Not found" }, { status: 404 });
  try {
    const { id, index } = await params;
    const n = parseInt(index, 10);
    const service = new EmailService();
    const email = await service.getEmailById(id);
    if (!email) return notFound();

    const viewer = await getServerSession(authOptions);
    if (viewer?.user?.role !== "ADMIN") {
      let held = true;
      try {
        held = isHeld(email, await loadYesList());
      } catch {
        held = true;
      }
      if (held) return notFound();
    }

    const att = await service.getAttachment(id, n);
    if (!att) return notFound();

    const type = (att.contentType || "").toLowerCase();
    const inBrowser = SHOW_IN_BROWSER.has(type);
    const plainName = att.filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
    const content = att.content;
    let offset = 0;
    const stream = new ReadableStream({
      pull(controller) {
        if (offset >= content.length) {
          controller.close();
          return;
        }
        controller.enqueue(new Uint8Array(content.subarray(offset, offset + PIECE)));
        offset += PIECE;
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": inBrowser ? type : "application/octet-stream",
        "Content-Disposition": `${inBrowser ? "inline" : "attachment"}; filename="${plainName}"; filename*=UTF-8''${encodeURIComponent(att.filename)}`,
        "Content-Length": String(content.length),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Error downloading attachment:", error);
    return notFound();
  }
}
