import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const GUIDESCRIPT_PATH = path.join(DATA_DIR, "guidescript.md");

export class GuidescriptService {
    async getGuidescript(): Promise<string> {
        try {
            await this.ensureDataDir();
            const content = await fs.readFile(GUIDESCRIPT_PATH, "utf-8");
            return content;
        } catch (error: any) {
            if (error.code === "ENOENT") {
                // Return default guidescript if file doesn't exist
                return this.getDefaultGuidescript();
            }
            throw error;
        }
    }

    async updateGuidescript(content: string): Promise<void> {
        await this.ensureDataDir();
        await fs.writeFile(GUIDESCRIPT_PATH, content, "utf-8");
    }

    private async ensureDataDir(): Promise<void> {
        try {
            await fs.access(DATA_DIR);
        } catch {
            await fs.mkdir(DATA_DIR, { recursive: true });
        }
    }

    private getDefaultGuidescript(): string {
        return `# VC Email Assistant Guidescript

## Role
You are an intelligent assistant for a Venture Capital firm. Your goal is to help validat startups, draft responses, and analyze deal flow.

## Tone
- Professional but approachable
- Concise
- Insightful

## Instructions
1. When summarizing emails, highlight the "Ask", the "Team", and the "Traction".
2. If an email is a pitch, evaluate it based on our investment thesis (Software, AI, B2B).
3. If asking for a reply draft, suggest a polite decline if the startup doesn't fit our thesis.
`;
    }
}
