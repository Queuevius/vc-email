import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/auth";
import { EmailService } from "@/services/emailService";
import { NextRequest } from "next/server";
import { canPerformAction } from "@/lib/permissions";
import { extractAddresses, ownAddresses, loadYesList, noteForText, noteForHtml } from "@/lib/consent";

// PC-6 chunk 4b: Vercel takes at most 4.5 MB per request, so files sent from
// the page are capped at 4 MB in total (Tony's choice). Bigger files go as a
// Google Drive link.
const MAX_ATTACH_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !canPerformAction(session.user, "send_email")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const emailService = new EmailService();
    // PC-6 chunk 4b: an email with files arrives as a form; without, as JSON.
    let to: string | undefined, cc: string | undefined, bcc: string | undefined;
    let subject: string | undefined, text: string | undefined, html: string | undefined;
    let replyTo: string | undefined; // PC-6 chunk 4c
    const attachments: { filename: string; content: Buffer; contentType: string }[] = [];
    if ((req.headers.get("content-type") || "").includes("multipart/form-data")) {
      const form = await req.formData();
      const field = (k: string): string | undefined => {
        const v = form.get(k);
        return typeof v === "string" && v ? v : undefined;
      };
      to = field("to");
      cc = field("cc");
      bcc = field("bcc");
      subject = field("subject");
      text = field("text");
      html = field("html");
      replyTo = field("replyTo");
      let total = 0;
      for (const item of form.getAll("attachments")) {
        if (typeof item === "string") continue;
        const content = Buffer.from(await item.arrayBuffer());
        total += content.length;
        attachments.push({ filename: item.name || "attachment", content, contentType: item.type || "application/octet-stream" });
      }
      if (total + (html ? html.length : 0) > MAX_ATTACH_BYTES) {
        return Response.json({ error: "Files and pictures are over 4 MB in total. Share big files as a Google Drive link instead." }, { status: 400 });
      }
    } else {
      const body = await req.json();
      ({ to, cc, bcc, subject, text, html, replyTo } = body);
    }

    if (!to || !subject) {
      return Response.json({ error: "Missing required fields: 'to' and 'subject' are required" }, { status: 400 });
    }

    // Always send from a single configured address + display name
    const senderEmail = process.env.EMAIL_FROM || "VC@Needpedia.org";
    const senderName = "Needpedia Volunteer Coordination"; // PC-6: Tony, 2 Oct 2026
    
    if (!senderEmail) {
      return Response.json({ error: "Missing sender email address" }, { status: 400 });
    }

    // PC-5 consent: Tony's note and a personal yes link go on every email sent
    // to someone who has not said yes. If the list cannot be read, everyone
    // gets the note.
    const own = ownAddresses();
    const recipients = extractAddresses(to, cc, bcc).filter((a) => !own.has(a));
    let notYes = recipients;
    try {
      const yes = await loadYesList();
      notYes = recipients.filter((a) => !yes.has(a));
    } catch (err) {
      console.error("Consent list unavailable; adding the note for every recipient:", err);
    }
    let finalText: string | undefined = text;
    let finalHtml: string | undefined = html;
    if (notYes.length > 0) {
      finalText = (text || "") + noteForText(notYes);
      if (html) finalHtml = html + noteForHtml(notYes);
    }

    // PC-6 chunk 4c: a reply carries the hidden links that tie it to the
    // email it answers, so every mail program shows them as one conversation.
    let inReplyTo: string | undefined;
    let references: string[] | undefined;
    if (replyTo) {
      const original = await emailService.getEmailById(replyTo);
      if (original?.messageId && !original.messageId.startsWith("imap-")) {
        inReplyTo = original.messageId;
        references = [...(original.references || []), original.messageId].slice(-20);
      }
    }

    const result = await emailService.sendEmail(
      {
        from: senderEmail,
        fromName: senderName,
        to,
        cc,
        bcc,
        subject,
        text: finalText,
        html: finalHtml,
        attachments,
        inReplyTo,
        references,
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