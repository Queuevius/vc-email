import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/auth";
import { EmailService } from "@/services/emailService";
import EmailDetailPageContent from "../EmailDetailPageContent";

interface EmailDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EmailDetailPage(props: EmailDetailPageProps) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  const emailService = new EmailService();

  // Fetch the specific email
  const email = await emailService.getEmailById(params.id);

  if (!email) {
    return (
      <div className="bg-white rounded-lg shadow mx-4 mt-12 max-w-lg lg:mx-auto">
        <div className="px-6 py-8 text-center">
          <div className="flex justify-center mb-4">
            <svg className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Email not found</h3>
          <p className="text-gray-600 mb-6 font-medium">The requested email could not be found or you don't have permission to view it.</p>
          <a
            href="/inbox"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Back to Inbox
          </a>
        </div>
      </div>
    );
  }

  if (!email.isRead) {
    // Mark as read in IMAP
    await emailService.toggleReadStatus(email.id, true);
  }

  return <EmailDetailPageContent email={email} userRole={session?.user?.role} />;
}