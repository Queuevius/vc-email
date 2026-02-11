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

        // Fetch context emails if requested
        let contextEmails: Email[] = [];
        if (contextEmailIds.length > 0) {
            // Only attempt to fetch emails if we have a way to identify the user (session)
            // or if the application is intended to show public emails.
            // For now, we'll try to get the session if it exists.
            const session = await getServerSession(authOptions);
            const userId = session?.user?.id;

            if (userId) {
                const allEmails = await emailService.getUserEmails(userId);
                contextEmails = allEmails.filter(e => contextEmailIds.includes(e.id));
            }
            // If no user session, contextEmails remains empty (guest behavior)
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
