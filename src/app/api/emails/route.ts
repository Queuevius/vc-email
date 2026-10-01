import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/auth";
import { EmailService, isAllowedMailbox } from "@/services/emailService";
import { NextRequest } from "next/server";
import { canPerformAction } from "@/lib/permissions";

// PC-4 chunk 2: one page of 30 at a time; ?page=2 gives the next 30.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mailbox = searchParams.get("mailbox") || "INBOX";
    // PC-4: only Inbox and Sent can be read from the page
    if (!isAllowedMailbox(mailbox)) {
      return Response.json({ error: "Folder not available" }, { status: 400 });
    }
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

    const emailService = new EmailService();
    const result = await emailService.getEmailPage(mailbox, page);

    return Response.json(result);
  } catch (error) {
    console.error("Error fetching emails:", error);
    return Response.json(
      { error: "Could not reach the mailbox right now. No mail is lost. Try Refresh in a minute." },
      { status: 502 }
    );
  }
}


export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to delete emails (admin only)
    if (!canPerformAction(session.user, "delete_email")) {
      return Response.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const emailIds = body.emailIds || [];

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return Response.json(
        { error: "Invalid request. emailIds array is required." },
        { status: 400 }
      );
    }

    const emailService = new EmailService();
    const result = await emailService.deleteEmails(emailIds);

    return Response.json({
      success: true,
      deleted: result.success,
      failed: result.failed,
      errors: result.errors.length > 0 ? result.errors : undefined,
      message: `Successfully deleted ${result.success} email(s)${result.failed > 0 ? `. ${result.failed} failed.` : ""}`,
    });
  } catch (error: any) {
    console.error("Error deleting emails:", error);
    return Response.json(
      { error: "Failed to delete emails", details: error.message },
      { status: 500 }
    );
  }
}
