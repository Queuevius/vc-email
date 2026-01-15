import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/auth";
import { redirect } from "next/navigation";
import ComposeEmailContent from "./ComposeEmailContent";

export default async function ComposeEmail() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  return <ComposeEmailContent user={session.user} />;
}