"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/auth";
import { EmailService } from "@/services/emailService";

const emailService = new EmailService();

async function getSession() {
    return await getServerSession(authOptions);
}

export async function toggleStar(emailId: string, isStarred: boolean) {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    try {
        const result = await emailService.toggleStar(emailId, isStarred);
        if (!result.success) throw new Error(result.error);

        revalidatePath("/inbox");
        revalidatePath(`/inbox/${emailId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Error toggling star:", error);
        return { success: false, error: error.message || "Failed to update star status" };
    }
}

export async function toggleReadStatus(emailId: string, isRead: boolean) {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    try {
        const result = await emailService.toggleReadStatus(emailId, isRead);
        if (!result.success) throw new Error(result.error);

        revalidatePath("/inbox");
        revalidatePath(`/inbox/${emailId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Error toggling read status:", error);
        return { success: false, error: error.message || "Failed to update read status" };
    }
}

export async function deleteEmail(emailId: string) {
    try {
        const session = await getSession();
        if (!session || session.user?.role !== "ADMIN") {
            return { success: false, error: "Unauthorized - Admin access required" };
        }

        const result = await emailService.deleteEmail(emailId);
        if (!result.success) throw new Error(result.error);

        revalidatePath("/inbox");
        revalidatePath(`/inbox/${emailId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting email:", error);
        return { success: false, error: error.message || "Failed to delete email" };
    }
}
