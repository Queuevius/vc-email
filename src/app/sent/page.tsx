import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/auth";
import { redirect } from "next/navigation";
import SentPageContent from "./SentPageContent";

export default async function SentPage() {
    const session = await getServerSession(authOptions);

    return <SentPageContent user={session?.user} />;
}
