import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/auth";
import { EmailService } from "@/services/emailService";
import { NextRequest } from "next/server";
import { canPerformAction } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const emailService = new EmailService();

    // For guests (no session), show latest announcements
    if (!session) {
      const guestEmails = await emailService.getGuestEmails();
      return Response.json({ emails: guestEmails });
    }

    const emails = await emailService.getUserEmails(session.user.id);

    return Response.json({ emails });
  } catch (error) {
    console.error("Error fetching emails:", error);
    return Response.json({ error: "Failed to fetch emails" }, { status: 500 });
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