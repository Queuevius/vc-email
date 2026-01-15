import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/auth";
import { EmailService } from "@/services/emailService";
import { NextRequest } from "next/server";
import { canPerformAction } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !canPerformAction(session.user, "send_email")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.email) {
      return Response.json({ error: "User email not found" }, { status: 400 });
    }

    const emailService = new EmailService();
    const body = await req.json();

    const { from, to, cc, bcc, subject, text, html } = body;

    if (!to || !subject) {
      return Response.json({ error: "Missing required fields: 'to' and 'subject' are required" }, { status: 400 });
    }

    // Use the 'from' field from the request, or fall back to the authenticated user's email
    const senderEmail = from || session.user.email;
    
    if (!senderEmail) {
      return Response.json({ error: "Missing sender email address" }, { status: 400 });
    }

    const result = await emailService.sendEmail(
      {
        from: senderEmail,
        to,
        cc,
        bcc,
        subject,
        text,
        html,
      },
      session.user.id
    );

    return Response.json({ 
      success: true, 
      emailId: result.id,
      messageId: result.messageId,
      message: "Email sent successfully"
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    
    // Return more specific error messages
    const errorMessage = error.message || "Failed to send email";
    const statusCode = errorMessage.includes("Unauthorized") ? 401 :
                      errorMessage.includes("Missing") || errorMessage.includes("Invalid") ? 400 : 500;
    
    return Response.json({ 
      error: errorMessage,
      success: false
    }, { status: statusCode });
  }
}