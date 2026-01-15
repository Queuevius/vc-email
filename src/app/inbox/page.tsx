import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/auth";
import { redirect } from "next/navigation";
import InboxPageContent from "./InboxPageContent";

export default async function InboxPage() {
  const session = await getServerSession(authOptions);

  return <InboxPageContent user={session?.user} />;
}