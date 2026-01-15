import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/auth";
import { EmailService } from "@/services/emailService";
import { NextRequest } from "next/server";
import { canPerformAction } from "@/lib/permissions";

/**
 * POST /api/emails/fetch
 * Fetches emails from IMAP server
 * Requires ADMIN role
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only authorized users can trigger email fetching
    if (!canPerformAction(session?.user, "fetch_email")) {
      return Response.json(
        { error: "Unauthorized. Access required." },
        { status: 401 }
      );
    }

    const emailService = new EmailService();

    // Optional: Allow custom limit via request body
    const body = await req.json().catch(() => ({}));
    const limit = body.limit;

    // Fetch emails from IMAP
    const emails = await emailService.fetchEmailsFromIMAP({ limit });

    return Response.json({
      success: true,
      fetched: emails.length,
      message: `Successfully fetched ${emails.length} email(s)`,
    });
  } catch (error: any) {
    console.error("Error fetching emails from IMAP:", error);
    return Response.json(
      { error: "Failed to fetch emails from IMAP", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/emails/fetch
 * Returns IMAP configuration status (without exposing credentials)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if IMAP is configured
    const isConfigured = !!(
      process.env.IMAP_HOST &&
      process.env.IMAP_USER &&
      process.env.IMAP_PASSWORD
    );

    return Response.json({
      configured: isConfigured,
      host: process.env.IMAP_HOST ? "***" : null,
      port: process.env.IMAP_PORT || 993,
      mailbox: process.env.IMAP_MAILBOX || "INBOX",
      markAsSeen: process.env.IMAP_MARK_AS_SEEN === "true",
      fetchLimit: process.env.IMAP_FETCH_LIMIT || 50,
    });
  } catch (error: any) {
    console.error("Error checking IMAP configuration:", error);
    return Response.json(
      { error: "Failed to check IMAP configuration" },
      { status: 500 }
    );
  }
}




