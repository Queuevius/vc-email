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

// POST removed as updates are now managed via environment variables
