import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/auth";
import { NextRequest } from "next/server";
import { GuidescriptService } from "@/lib/guidescript";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return Response.json({ error: "Unauthorized: You must be logged in" }, { status: 401 });
        }

        const guidescriptService = new GuidescriptService();
        const content = await guidescriptService.getGuidescript();

        return Response.json({ content });
    } catch (error: any) {
        console.error("Error fetching guidescript:", error);
        return Response.json(
            { error: "Failed to fetch guidescript" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return Response.json({ error: "Unauthorized: You must be logged in" }, { status: 401 });
        }

        const body = await req.json();
        const { content } = body;

        if (typeof content !== "string" || content.trim() === "") {
            return Response.json({ error: "Content is required" }, { status: 400 });
        }

        const guidescriptService = new GuidescriptService();
        await guidescriptService.setGuidescript(content.trim());

        return Response.json({ success: true, message: "Knowledge base updated successfully." });
    } catch (error: any) {
        console.error("Error saving guidescript:", error);
        return Response.json(
            { error: error.message || "Failed to save guidescript" },
            { status: 500 }
        );
    }
}
