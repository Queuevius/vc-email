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

        // Fetch context emails if requested OR fetch latest emails if none specified
        let contextEmails: Email[] = [];
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        if (contextEmailIds.length > 0) {
            // Specific emails requested
            if (userId) {
                const allEmails = await emailService.getUserEmails(userId);
                contextEmails = allEmails.filter(e => contextEmailIds.includes(e.id));
            }
        } else if (userId) {
            // No specific emails, fetch latest 20 as default context
            console.log("No specific context emails, fetching latest 20 for AI context");
            contextEmails = await emailService.fetchEmailsFromIMAP({ limit: 20 });
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
