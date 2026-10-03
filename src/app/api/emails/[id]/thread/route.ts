import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/auth";
import { NextRequest } from "next/server";
import { EmailService } from "@/services/emailService";
import { loadYesList, isHeld } from "@/lib/consent";

// PC-6 chunk 4c (2 October 2026): the earlier messages in an email's
// conversation, oldest first. Consent rule: visitors get nothing for an
// email that is not public yet, and never see earlier messages that are not
// public yet. Tony's admin login sees everything, tagged.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = new EmailService();
    const email = await service.getEmailById(id);
    if (!email) return Response.json({ emails: [] }, { status: 404 });

    const viewer = await getServerSession(authOptions);
    const isAdmin = viewer?.user?.role === "ADMIN";
    let yes: Set<string> | null = null;
    try {
      yes = await loadYesList();
    } catch {
      yes = null;
    }
    if (!isAdmin && (!yes || isHeld(email, yes))) {
      return Response.json({ emails: [] }, { status: 404 });
    }

    const earlier = await service.getEarlierInConversation(email);
    const emails = earlier
      .map((e) => ({ ...e, held: yes ? isHeld(e, yes) : true }))
      .filter((e) => isAdmin || !e.held);
    return Response.json({ emails });
  } catch (error) {
    console.error("Error loading conversation:", error);
    return Response.json({ emails: [] }, { status: 500 });
  }
}
