import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/auth";
import { NextRequest } from "next/server";
import { AIService, ChatMessage } from "@/lib/ai";
import { GuidescriptService } from "@/lib/guidescript";
import { EmailService } from "@/services/emailService";
import { canPerformAction } from "@/lib/permissions";
import { Email } from "@/types/email";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return Response.json({ error: "Unauthorized: You must be logged in to use the AI assistant" }, { status: 401 });
        }

        // Check permissions
        if (!canPerformAction(session.user, "search_emails")) { // Using search_emails as proxy for using AI
            return Response.json({ error: "Unauthorized: Insufficient permissions (Role: " + session.user.role + ")" }, { status: 403 });
        }

        const body = await req.json();
        const messages: ChatMessage[] = body.messages;
        const contextEmailIds: string[] = body.contextEmailIds || [];

        if (!messages || !Array.isArray(messages)) {
            return Response.json({ error: "Messages array is required" }, { status: 400 });
        }

        // Initialize services
        const aiService = new AIService();
        const guidescriptService = new GuidescriptService();
        const emailService = new EmailService();

        // Fetch guidescript
        const guidescript = await guidescriptService.getGuidescript();

        // Fetch context emails if requested
        let contextEmails: Email[] = [];
        if (contextEmailIds.length > 0) {
            // Just fetch all emails for now and filter (inefficient but works for small scale)
            // Ideally EmailService should have getEmailsByIds
            const allEmails = await emailService.getUserEmails(session.user.id);
            contextEmails = allEmails.filter(e => contextEmailIds.includes(e.id));
        }

        // Call AI Service
        const response = await aiService.chat(
            messages,
            { emails: contextEmails },
            guidescript
        );

        return Response.json({
            role: "assistant",
            content: response
        });

    } catch (error: any) {
        console.error("AI Chat API Error:", error);
        return Response.json(
            { error: error.message || "Failed to process AI request" },
            { status: 500 }
        );
    }
}
