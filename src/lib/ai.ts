import { Email } from "@/types/email";

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface AIContext {
    emails?: (Email & { folder?: string })[];
    relevantSnippets?: string[];
    userEmail?: string | null;
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.trim();
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL?.trim();
const SITE_URL = process.env.OPENROUTER_SITE_URL || "http://localhost:3000";
const SITE_NAME = process.env.OPENROUTER_SITE_NAME || "VC Email Assistant";

export class AIService {
    private model: string | undefined = OPENROUTER_MODEL;

    constructor() {
        if (!OPENROUTER_API_KEY) {
            console.warn("OPENROUTER_API_KEY is not set. AI features will not work.");
        }
    }

    async chat(
        messages: ChatMessage[],
        context?: AIContext,
        guidescript?: string
    ): Promise<string> {
        if (!OPENROUTER_API_KEY) {
            throw new Error("OpenRouter API Key is missing.");
        }

        if (!this.model) {
            throw new Error("OpenRouter Model is not defined. Please set OPENROUTER_MODEL in your .env file.");
        }

        // Construct the system prompt
        let systemPrompt = `You are a helpful AI Email Assistant for Needpedia/Venture Capital. 
    You have access to a selection of the user's emails to answer questions. 
    Use the provided email content as your primary knowledge base.
    If multiple emails are provided, they represent the most recent deal flow and communications.
    Always be professional, concise, and accurate.${context?.userEmail ? `\n    The current user's email address is: ${context.userEmail}` : ""}
    IMPORTANT: Any email in the context labeled with "Folder: Sent" is an email sent OUT by the user, regardless of the 'From' address. Emails labeled "Folder: Inbox" are received emails.
    `;

        if (guidescript) {
            systemPrompt += `\n\nIMPORTANT GUIDELINES (GUIDESCRIPT):\n${guidescript}\n\n`;
        }

        if (context?.emails && context.emails.length > 0) {
            systemPrompt += `\n\nCONTEXT - RECENT EMAILS:\n`;
            context.emails.forEach((email, index) => {
                const folderStr = (email as any).folder ? `\nFolder: ${(email as any).folder}` : '';
                systemPrompt += `\n[Email ${index + 1}]${folderStr}
Date: ${email.sentAt}
From: ${email.from}
To: ${email.to}
Subject: ${email.subject}
Content: ${email.bodyText || email.bodyHtml?.replace(/<[^>]*>?/gm, "") || "(No content)"}
---`;
            });
            systemPrompt += `\n\nUse the above emails to answer the user's request. If the information isn't in the emails, state that clearly.\n`;
        }

        if (context?.relevantSnippets && context.relevantSnippets.length > 0) {
            systemPrompt += `\n\nCONTEXT - LINKED KNOWLEDGE SNIPPETS:\n`;
            context.relevantSnippets.forEach((snippet, index) => {
                systemPrompt += `\n[Snippet ${index + 1}]\n${snippet}\n---`;
            });
            systemPrompt += `\n\nWhen using linked knowledge, cite the exact Source URL from the snippet so users can verify details.\n`;
        }

        // Prepare messages for OpenRouter
        const fullMessages = [
            { role: "system", content: systemPrompt },
            ...messages
        ];

        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "HTTP-Referer": SITE_URL,
                    "X-Title": SITE_NAME,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: fullMessages,
                    temperature: 0.7,
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`OpenRouter API Error (Status: ${response.status}):`, errorText);
                throw new Error(`OpenRouter API failed: ${response.statusText} (${response.status}). Model: ${this.model}`);
            }

            const data = await response.json();
            return data.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
        } catch (error) {
            console.error("AI Service Error:", error);
            throw error;
        }
    }
}
