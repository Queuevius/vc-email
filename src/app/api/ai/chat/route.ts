import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/auth";
import { NextRequest } from "next/server";
import { AIService, ChatMessage } from "@/lib/ai";
import { GuidescriptService } from "@/lib/guidescript";
import { EmailService } from "@/services/emailService";
import { Email } from "@/types/email";

const URL_REGEX = /\bhttps?:\/\/[^\s)]+/gi;
const MAX_GUIDESCRIPT_LINKS = 4;
const LINK_FETCH_TIMEOUT_MS = 7000;
const MAX_SNIPPET_CHARS = 1200;

function extractUrls(text: string): string[] {
    const matches = text.match(URL_REGEX) || [];
    const cleaned = matches
        .map((url) => url.replace(/[),.;!?]+$/, ""))
        .filter((url) => {
            try {
                const parsed = new URL(url);
                return parsed.protocol === "http:" || parsed.protocol === "https:";
            } catch {
                return false;
            }
        });

    return Array.from(new Set(cleaned)).slice(0, MAX_GUIDESCRIPT_LINKS);
}

function stripHtmlToText(html: string): string {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/\s+/g, " ")
        .trim();
}

async function fetchLinkedSnippet(url: string): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LINK_FETCH_TIMEOUT_MS);

    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "NeedpediaAssistant/1.0 (+https://needpedia.com)",
                "Accept": "text/html, text/plain;q=0.9, */*;q=0.1",
            },
            cache: "no-store",
        });

        if (!res.ok) {
            return null;
        }

        const raw = await res.text();
        const text = stripHtmlToText(raw);
        if (!text) return null;

        return `Source URL: ${url}\nExcerpt: ${text.slice(0, MAX_SNIPPET_CHARS)}`;
    } catch (error) {
        console.warn("Failed to fetch linked KB content", { url, error });
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

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
        const guidescriptLinks = extractUrls(guidescript || "");
        const linkedSnippetsRaw = await Promise.all(guidescriptLinks.map(fetchLinkedSnippet));
        const linkedSnippets = linkedSnippetsRaw.filter((snippet): snippet is string => Boolean(snippet));

        // Fetch context emails if requested OR fetch latest emails if none specified
        let contextEmails: Email[] = [];
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;
        const inboxMailbox = process.env.IMAP_MAILBOX || "INBOX";
        const sentMailbox = process.env.IMAP_SENT_MAILBOX || "Sent";
        const baseContextLimit = 20;

        if (contextEmailIds.length > 0) {
            // Specific emails requested
            if (userId) {
                const [inboxEmails, sentEmails] = await Promise.all([
                    emailService.getUserEmails(userId, inboxMailbox),
                    emailService.getUserEmails(userId, sentMailbox),
                ]);
                const mappedInbox = inboxEmails.map((e: any) => ({ ...e, folder: "Inbox" }));
                const mappedSent = sentEmails.map((e: any) => ({ ...e, folder: "Sent" }));
                contextEmails = [...mappedInbox, ...mappedSent].filter(e => contextEmailIds.includes(e.id));
            } else {
                const [inboxEmails, sentEmails] = await Promise.all([
                    emailService.getGuestEmails(inboxMailbox),
                    emailService.getGuestEmails(sentMailbox),
                ]);
                const mappedInbox = inboxEmails.map((e: any) => ({ ...e, folder: "Inbox" }));
                const mappedSent = sentEmails.map((e: any) => ({ ...e, folder: "Sent" }));
                contextEmails = [...mappedInbox, ...mappedSent].filter(e => contextEmailIds.includes(e.id));
            }
        } else {
            // No specific emails, fetch a mix from Inbox + Sent as default context
            const inboxLimit = Math.floor(baseContextLimit / 2);
            const sentLimit = baseContextLimit - inboxLimit;

            console.log(
                "No specific context emails, fetching mixed AI context from",
                { inboxMailbox, sentMailbox, inboxLimit, sentLimit }
            );

            const [inboxEmails, sentEmails] = await Promise.all([
                emailService.fetchEmailsFromIMAP({ limit: inboxLimit, mailbox: inboxMailbox }),
                emailService.fetchEmailsFromIMAP({ limit: sentLimit, mailbox: sentMailbox }),
            ]);

            const mappedInbox = inboxEmails.map((e: any) => ({ ...e, folder: "Inbox" }));
            const mappedSent = sentEmails.map((e: any) => ({ ...e, folder: "Sent" }));

            // Sort newest-first for prompt quality.
            contextEmails = [...mappedInbox, ...mappedSent].sort(
                (a, b) => b.sentAt.getTime() - a.sentAt.getTime()
            );
        }

        const userEmailForAI = session?.user?.email || process.env.NEXT_PUBLIC_GUEST_EMAIL || "guest@example.com";

        // Call AI Service
        const response = await aiService.chat(
            messages,
            { emails: contextEmails, userEmail: userEmailForAI, relevantSnippets: linkedSnippets },
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
