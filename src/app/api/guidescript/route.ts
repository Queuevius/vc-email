import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/auth";
import { NextRequest } from "next/server";
import { GuidescriptService } from "@/lib/guidescript";
import { isAdmin } from "@/lib/permissions";

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
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only Admin can update guidescript
        if (!isAdmin(session.user)) {
            return Response.json(
                { error: "Unauthorized. Admin access required." },
                { status: 403 }
            );
        }

        const body = await req.json();
        const content = body.content;

        if (typeof content !== 'string') {
            return Response.json(
                { error: "Content is required and must be a string" },
                { status: 400 }
            );
        }

        const guidescriptService = new GuidescriptService();
        await guidescriptService.updateGuidescript(content);

        return Response.json({ success: true });
    } catch (error: any) {
        console.error("Error updating guidescript:", error);
        return Response.json(
            { error: "Failed to update guidescript" },
            { status: 500 }
        );
    }
}
