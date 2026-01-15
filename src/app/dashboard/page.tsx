import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/auth";
import { redirect } from "next/navigation";
import DashboardPageContent from "./DashboardPageContent";
import { EmailService } from "@/services/emailService";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  // Get email count from IMAP
  const emailService = new EmailService();
  const emails = await emailService.fetchEmailsFromIMAP();
  const emailCount = emails.length;

  return (
    <DashboardPageContent
      user={session.user}
      emailCount={emailCount}
    />
  );
}