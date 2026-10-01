import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/auth";
import { EmailService, isAllowedMailbox } from "@/services/emailService";
import { NextRequest } from "next/server";
import { canPerformAction } from "@/lib/permissions";
import { loadYesList, isHeld } from "@/lib/consent";

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

    // PC-5 consent: visitors get only emails everyone on them said yes to.
    // Tony's admin login gets all of them, held ones tagged.
    let yes: Set<string>;
    try {
      yes = await loadYesList();
    } catch (err) {
      console.error("Consent list unavailable:", err);
      return Response.json(
        { error: "Could not check who has said yes, so nothing is shown. Try again in a minute." },
        { status: 502 }
      );
    }
    const viewer = await getServerSession(authOptions);
    const isAdminViewer = viewer?.user?.role === "ADMIN";
    const marked = result.emails.map((e) => ({ ...e, held: isHeld(e, yes) }));
    const emails = isAdminViewer ? marked : marked.filter((e) => !e.held);

    return Response.json({ ...result, emails });
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
