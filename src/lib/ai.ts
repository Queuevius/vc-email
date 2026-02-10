import { Email } from "@/types/email";

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface AIContext {
    emails?: Email[];
    relevantSnippets?: string[];
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const SITE_URL = process.env.OPENROUTER_SITE_URL || "http://localhost:3000";
const SITE_NAME = process.env.OPENROUTER_SITE_NAME || "VC Email Assistant";

export class AIService {
    private model: string = process.env.OPENROUTER_MODEL || "anthropic/claude-3-opus:beta";

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

        // Construct the system prompt
        let systemPrompt = `You are a helpful AI Email Assistant for a VC firm. 
    You have access to the user's emails to answer questions.
    Always be professional, concise, and accurate.
    `;

        if (guidescript) {
            systemPrompt += `\n\nIMPORTANT GUIDELINES (GUIDESCRIPT):\n${guidescript}\n\n`;
        }

        if (context?.emails && context.emails.length > 0) {
            systemPrompt += `\n\nCONTEXT - The following emails are relevant to the user's query:\n`;
            context.emails.forEach((email, index) => {
                systemPrompt += `\n--- Email ${index + 1} ---\n`;
                systemPrompt += `From: ${email.from}\n`;
                systemPrompt += `To: ${email.to}\n`;
                systemPrompt += `Subject: ${email.subject}\n`;
                systemPrompt += `Date: ${email.sentAt}\n`;
                systemPrompt += `Body: ${email.bodyText || email.bodyHtml || "(No content)"}\n`;
            });
            systemPrompt += `\n--- End of Context ---\n`;
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
                console.error("OpenRouter API Error:", errorText);
                throw new Error(`OpenRouter API failed: ${response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
        } catch (error) {
            console.error("AI Service Error:", error);
            throw error;
        }
    }
}
