import { EmailService } from "@/services/emailService";

/**
 * Script to fetch emails from IMAP server
 * Uses configuration from environment variables
 */
async function fetchEmails() {
  try {
    console.log("Starting email fetch from IMAP server...");
    console.log(`IMAP Host: ${process.env.IMAP_HOST}`);
    console.log(`IMAP User: ${process.env.IMAP_USER}`);
    console.log(`IMAP Port: ${process.env.IMAP_PORT || "993"}`);
    console.log(`Mailbox: ${process.env.IMAP_MAILBOX || "INBOX"}`);
    console.log("");

    const emailService = new EmailService();

    // Fetch emails using environment variables
    const emails = await emailService.fetchEmailsFromIMAP();

    console.log("");
    console.log("=".repeat(50));
    console.log(`Email fetch completed!`);
    console.log(`Found: ${emails.length} email(s)`);
    console.log("=".repeat(50));

    process.exit(0);
  } catch (error: any) {
    console.error("Fatal error fetching emails:", error);
    process.exit(1);
  }
}

// Run the fetch function if this file is executed directly
if (require.main === module) {
  fetchEmails();
}

