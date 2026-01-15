import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/auth";
import { EmailService } from "@/services/emailService";
import { NextRequest } from "next/server";
import { canPerformAction } from "@/lib/permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const emailService = new EmailService();
    const email = await emailService.getEmailById(id);

    if (!email) {
      return Response.json({ error: "Email not found" }, { status: 404 });
    }

    return Response.json({ email });
  } catch (error) {
    console.error("Error fetching email:", error);
    return Response.json({ error: "Failed to fetch email" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const emailService = new EmailService();
    const result = await emailService.deleteEmail(id);

    if (!result.success) {
      return Response.json(
        { error: result.error || "Failed to delete email" },
        { status: 500 }
      );
    }

    return Response.json({ success: true, message: "Email deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting email:", error);
    return Response.json(
      { error: "Failed to delete email", details: error.message },
      { status: 500 }
    );
  }
}