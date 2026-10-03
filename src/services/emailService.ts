import { createTransport, Transporter } from "nodemailer";
import imaps from "imap-simple";
import { simpleParser, ParsedMail } from "mailparser";
import { Email } from "@/types/email";

// PC-4 chunk 2 (30 September 2026): mail is listed 30 at a time, newest
// first, with no 30-day cutoff. A mailbox that cannot be reached is reported
// instead of looking empty. Un-starring fixed. The page no longer saves its
// own copy of sent mail, because Zoho already keeps one.

interface SendEmailParams {
  from: string;
  fromName?: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  text?: string;
  html?: string;
  // PC-6 chunk 4b: attached files
  attachments?: { filename: string; content: Buffer; contentType: string }[];
  // PC-6 chunk 4c: ties a reply to the email it answers
  inReplyTo?: string;
  references?: string[];
}

// One page of a folder, newest first.
export interface EmailPage {
  emails: Email[];
  total: number;
  page: number;
  pageSize: number;
}

export const PAGE_SIZE = 30;
const CACHE_TTL = 60000; // 60 seconds

// Shared caches across all instances
const globalPageCache = new Map<string, { result: EmailPage; timestamp: number }>();
const globalEmailById = new Map<string, { email: Email; timestamp: number }>();

// Shared transporter across all instances
let globalTransporter: Transporter | null = null;
let globalSmtpConfigured: boolean = false;

// PC-4: every email's id carries its folder, e.g. "INBOX-12" or "Sent-12".
// Zoho numbers each folder separately, so a bare number is ambiguous.
// Only these folders can be read or changed from the page.
function allowedMailboxes(): string[] {
  return Array.from(new Set([
    process.env.IMAP_MAILBOX || "INBOX",
    process.env.IMAP_SENT_MAILBOX || "Sent",
    "INBOX",
    "Sent",
  ]));
}

export function isAllowedMailbox(mailbox: string): boolean {
  return allowedMailboxes().includes(mailbox);
}

export function makeEmailId(mailbox: string, uid: number | string): string {
  return `${mailbox}-${uid}`;
}

export function parseEmailId(emailId: string): { mailbox: string; uid: number } {
  const dash = emailId.lastIndexOf("-");
  if (dash === -1) {
    // Old-style id with no folder: treat it as received mail.
    return { mailbox: process.env.IMAP_MAILBOX || "INBOX", uid: parseInt(emailId) };
  }
  return { mailbox: emailId.slice(0, dash), uid: parseInt(emailId.slice(dash + 1)) };
}

// PC-6 chunk 4c: helpers for finding the rest of a conversation.
// The subject without "Re:", "Fwd:" and the like, in small letters.
function conversationSubject(subject: string): string {
  let t = (subject || "").trim();
  for (;;) {
    const next = t.replace(/^(re|fwd?|aw|sv)\s*(\[\d+\])?\s*:\s*/i, "");
    if (next === t) break;
    t = next;
  }
  return t.trim().toLowerCase();
}

// Everyone on an email except VC@Needpedia.org itself.
function peopleOn(e: Email): string[] {
  const own = new Set(
    [process.env.EMAIL_FROM, process.env.IMAP_USER, "VC@Needpedia.org"]
      .filter((a): a is string => Boolean(a))
      .map((a) => a.trim().toLowerCase())
  );
  const all = [e.from, e.to, e.cc].filter(Boolean).join(" ").toLowerCase().match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g) || [];
  return all.filter((a) => !own.has(a));
}

export class EmailService {
  private transporter: Transporter;
  private smtpConfigured: boolean = false;

  constructor() {
    // Return existing transporter if already initialized
    if (globalTransporter) {
      this.transporter = globalTransporter;
      this.smtpConfigured = globalSmtpConfigured;
      return;
    }

    // Initialize the transporter with email server configuration
    if (process.env.EMAIL_SERVER_HOST) {
      const port = parseInt(process.env.EMAIL_SERVER_PORT || "587");
      const secure = port === 465; // Port 465 uses SSL/TLS, port 587 uses STARTTLS

      this.transporter = createTransport({
        host: process.env.EMAIL_SERVER_HOST,
        port: port,
        secure: secure,
        requireTLS: !secure && port === 587,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
        tls: {
          rejectUnauthorized: process.env.EMAIL_SERVER_REJECT_UNAUTHORIZED !== "true",
        },
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
      });

      this.smtpConfigured = true;

      // Verify SMTP connection on startup (non-blocking)
      this.verifyConnection().catch((error) => {
        console.warn("SMTP connection verification failed (will retry on send):", error.message);
      });
    } else {
      console.warn("No email server configuration found. Using JSON transport (logging emails to console).");
      this.transporter = createTransport({
        jsonTransport: true,
      });
      this.smtpConfigured = false;
    }

    // Save to global scope
    globalTransporter = this.transporter;
    globalSmtpConfigured = this.smtpConfigured;
  }

  private async verifyConnection(): Promise<boolean> {
    if (!this.smtpConfigured) {
      return false;
    }

    try {
      await this.transporter.verify();
      console.log("SMTP connection verified successfully");
      return true;
    } catch (error: any) {
      console.error("SMTP verification failed:", error.message);
      throw error;
    }
  }

  private async getImapConnection(): Promise<any> {
    const config = {
      imap: {
        user: process.env.IMAP_USER || "",
        password: process.env.IMAP_PASSWORD || "",
        host: process.env.IMAP_HOST || "",
        port: parseInt(process.env.IMAP_PORT || "993"),
        tls: process.env.IMAP_PORT === "993" || !process.env.IMAP_PORT,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000,
      },
    };

    if (!config.imap.user || !config.imap.password || !config.imap.host) {
      throw new Error("IMAP configuration missing");
    }

    return await imaps.connect(config);
  }

  async sendEmail(params: SendEmailParams, userId: string): Promise<Email> {
    if (!params.from || !params.to || !params.subject) {
      throw new Error("Missing required email parameters: from, to, and subject are required");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(params.from)) {
      throw new Error("Invalid sender email address");
    }

    const recipients = [params.to, params.cc, params.bcc]
      .filter(Boolean)
      .join(",")
      .split(",")
      .map(email => email.trim());

    for (const recipient of recipients) {
      if (recipient && !emailRegex.test(recipient)) {
        throw new Error(`Invalid recipient email address: ${recipient}`);
      }
    }

    if (!params.text && !params.html) {
      throw new Error("Email must have either text or HTML content");
    }

    try {
      let info: any = { messageId: `mock-${Date.now()}` };

      if (this.smtpConfigured) {
        try {
          await this.verifyConnection();
        } catch (verifyError: any) {
          console.warn("SMTP verification failed, attempting to send anyway:", verifyError.message);
        }
      }

      try {
        info = await this.transporter.sendMail({
          from: params.fromName
            ? { name: params.fromName, address: params.from }
            : params.from,
          to: params.to,
          cc: params.cc,
          bcc: params.bcc,
          subject: params.subject,
          text: params.text,
          html: params.html,
          attachments: params.attachments,
          inReplyTo: params.inReplyTo,
          references: params.references,
          headers: {
            "X-Mailer": "VC Email System",
            "X-Priority": "3",
          },
        });

        console.log("Email sent successfully:", {
          messageId: info.messageId,
          to: params.to,
          subject: params.subject,
        });
      } catch (sendError: any) {
        console.error("Failed to send email via transport:", sendError.message);

        if (sendError.code === "EAUTH") {
          throw new Error("SMTP authentication failed. Please check your email credentials.");
        } else if (sendError.code === "ECONNECTION") {
          throw new Error("Failed to connect to SMTP server. Please check your SMTP host and port.");
        } else if (sendError.code === "ETIMEDOUT") {
          throw new Error("SMTP connection timed out. Please check your network connection.");
        } else {
          throw new Error(`Failed to send email: ${sendError.message}`);
        }
      }

      // PC-4 chunk 2: Zoho keeps its own copy of every sent email in Sent
      // (marked "X-Mailer: VC Email System"), so the page no longer tries to.
      this.invalidateCache(process.env.IMAP_SENT_MAILBOX || "Sent");

      return {
        id: `sent-${Date.now()}`,
        messageId: info.messageId || `mock-${Date.now()}`,
        from: params.from,
        to: params.to,
        cc: params.cc || null,
        bcc: params.bcc || null,
        subject: params.subject,
        bodyText: params.text || null,
        bodyHtml: params.html || null,
        attachments: params.attachments?.length ? params.attachments.map((a) => `${a.filename}:${a.content.length}`).join(",") : null,
        sentAt: new Date(),
        receivedAt: new Date(),
        size: params.text ? params.text.length : (params.html ? params.html.length : 0),
        headers: null,
        isRead: true,
        isStarred: false,
        labels: null,
        senderId: userId,
      };
    } catch (error: any) {
      console.error("Error sending email:", error);
      if (error.message && error.message.startsWith("SMTP") || error.message.startsWith("Failed to send") || error.message.startsWith("Missing") || error.message.startsWith("Invalid")) {
        throw error;
      }
      throw new Error("Failed to send email");
    }
  }

  // Forget saved copies so the next look asks Zoho again.
  invalidateCache(mailbox?: string): void {
    if (!mailbox) {
      globalPageCache.clear();
      globalEmailById.clear();
      return;
    }
    for (const key of Array.from(globalPageCache.keys())) {
      if (key.startsWith(`${mailbox}:`)) globalPageCache.delete(key);
    }
    for (const key of Array.from(globalEmailById.keys())) {
      if (key.startsWith(`${mailbox}-`)) globalEmailById.delete(key);
    }
  }

  private rememberEmails(emails: Email[]): void {
    const now = Date.now();
    for (const email of emails) {
      globalEmailById.set(email.id, { email, timestamp: now });
    }
  }

  // Every email number in the open folder (numbers only, no content).
  private listUids(connection: any): Promise<number[]> {
    return new Promise((resolve, reject) => {
      connection.imap.search(["ALL"], (err: any, uids: number[]) => {
        if (err) reject(err);
        else resolve(uids || []);
      });
    });
  }

  private async parseMessage(connection: any, mailbox: string, message: any): Promise<Email | null> {
    try {
      let emailBody: string | Buffer | undefined;
      if (message.parts && message.parts.length > 0) {
        emailBody = message.parts[0].body;
      } else {
        emailBody = message.body;
      }

      if (!emailBody) {
        const allParts = imaps.getParts(message.attributes.struct);
        const part = allParts.find((p: any) => p.which === "TEXT") || allParts[0];
        if (part) {
          emailBody = await connection.getPartData(message, part);
        }
      }

      if (!emailBody) return null;

      const parsedEmail: ParsedMail = await simpleParser(emailBody);
      const flags = message.attributes.flags || [];

      return {
        id: makeEmailId(mailbox, message.attributes.uid),
        messageId: parsedEmail.messageId || `imap-${message.attributes.uid}`,
        from: parsedEmail.from?.value?.[0]?.address || parsedEmail.from?.text || "unknown@unknown.com",
        to: (parsedEmail.to as any)?.value?.map((addr: any) => addr.address).join(", ") || (parsedEmail.to as any)?.text || "",
        cc: (parsedEmail.cc as any)?.value?.map((addr: any) => addr.address).join(", ") || (parsedEmail.cc as any)?.text || null,
        bcc: (parsedEmail.bcc as any)?.value?.map((addr: any) => addr.address).join(", ") || (parsedEmail.bcc as any)?.text || null,
        subject: parsedEmail.subject || "(No Subject)",
        bodyText: parsedEmail.text || null,
        bodyHtml: parsedEmail.html || null,
        attachments: parsedEmail.attachments?.map((att: any) => `${att.filename || "unnamed"}:${att.size || 0}`).join(",") || null,
        // PC-6 chunk 4b: the attached files, so the page can list them
        attachmentList: (parsedEmail.attachments || []).map((att: any, i: number) => ({
          index: i,
          filename: att.filename || "attachment-" + (i + 1),
          size: att.size || (att.content ? att.content.length : 0),
          contentType: att.contentType || "application/octet-stream",
        })),
        // PC-6 chunk 4c: the hidden links that tie a reply to earlier emails
        inReplyTo: parsedEmail.inReplyTo || null,
        references: Array.isArray(parsedEmail.references)
          ? parsedEmail.references
          : parsedEmail.references
            ? [parsedEmail.references]
            : [],
        sentAt: parsedEmail.date || new Date(),
        receivedAt: message.attributes.date || new Date(),
        size: (typeof parsedEmail.text === "string" ? parsedEmail.text.length : 0) + (typeof parsedEmail.html === "string" ? parsedEmail.html.length : 0),
        headers: JSON.stringify(parsedEmail.headers),
        isRead: flags.includes("\\Seen"),
        isStarred: flags.includes("\\Flagged"),
        labels: null,
        senderId: null,
      } as Email;
    } catch (err) {
      console.error(`Error parsing email ${message?.attributes?.uid}:`, err);
      return null;
    }
  }

  // Fetch whole emails by number from the open folder, newest first.
  private async fetchByUids(connection: any, mailbox: string, uids: number[]): Promise<Email[]> {
    if (uids.length === 0) return [];
    const messages = await connection.search([["UID", ...uids]], {
      bodies: "",
      struct: true,
      markSeen: false,
    });
    const parsed = await Promise.all(messages.map((m: any) => this.parseMessage(connection, mailbox, m)));
    const emails = parsed.filter((e): e is Email => e !== null);
    emails.sort((a, b) => parseEmailId(b.id).uid - parseEmailId(a.id).uid);
    this.rememberEmails(emails);
    return emails;
  }

  // One page of a folder: page 1 is the newest PAGE_SIZE emails.
  async getEmailPage(mailbox: string, page: number = 1, pageSize: number = PAGE_SIZE): Promise<EmailPage> {
    const key = `${mailbox}:${page}:${pageSize}`;
    const cached = globalPageCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.result;
    }

    let connection: any;
    try {
      connection = await this.getImapConnection();
      await connection.openBox(mailbox);
      const uids = (await this.listUids(connection)).sort((a, b) => b - a);
      const start = (page - 1) * pageSize;
      const pageUids = uids.slice(start, start + pageSize);
      const emails = await this.fetchByUids(connection, mailbox, pageUids);
      const result: EmailPage = { emails, total: uids.length, page, pageSize };
      globalPageCache.set(key, { result, timestamp: Date.now() });
      return result;
    } catch (error) {
      // PC-4 chunk 2: a mailbox that cannot be reached is reported, not shown as empty.
      console.error("IMAP error:", error);
      throw new Error("Could not reach the mailbox");
    } finally {
      if (connection) connection.end();
    }
  }

  // Newest emails of a folder (used by Adele, the dashboard and Refresh).
  async fetchEmailsFromIMAP(options?: { mailbox?: string; limit?: number }): Promise<Email[]> {
    const mailbox = options?.mailbox || process.env.IMAP_MAILBOX || "INBOX";
    const limit = options?.limit || PAGE_SIZE;
    return (await this.getEmailPage(mailbox, 1, limit)).emails;
  }

  async getUserEmails(userId: string, mailbox: string = "INBOX") {
    return this.fetchEmailsFromIMAP({ mailbox });
  }

  async getGuestEmails(mailbox: string = "INBOX") {
    return this.fetchEmailsFromIMAP({ mailbox });
  }

  async getEmailById(emailId: string): Promise<Email | null> {
    const cached = globalEmailById.get(emailId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.email;
    }

    const { mailbox, uid } = parseEmailId(emailId);
    if (!isAllowedMailbox(mailbox) || !Number.isFinite(uid)) return null;

    let connection: any;
    try {
      connection = await this.getImapConnection();
      await connection.openBox(mailbox);
      const emails = await this.fetchByUids(connection, mailbox, [uid]);
      return emails[0] || null;
    } catch (error) {
      console.error("Error fetching email by id:", error);
      return null;
    } finally {
      if (connection) connection.end();
    }
  }

  // PC-6 chunk 4b: one attached file of an email, read fresh from Zoho.
  async getAttachment(emailId: string, index: number): Promise<{ filename: string; contentType: string; content: Buffer } | null> {
    const { mailbox, uid } = parseEmailId(emailId);
    if (!isAllowedMailbox(mailbox) || !Number.isFinite(uid) || !Number.isInteger(index) || index < 0) return null;
    let connection: any;
    try {
      connection = await this.getImapConnection();
      await connection.openBox(mailbox);
      const messages = await connection.search([["UID", uid]], { bodies: "", struct: true, markSeen: false });
      const message = messages[0];
      if (!message) return null;
      const raw = message.parts && message.parts.length > 0 ? message.parts[0].body : message.body;
      if (!raw) return null;
      const parsed: ParsedMail = await simpleParser(raw);
      const att: any = parsed.attachments?.[index];
      if (!att) return null;
      return {
        filename: att.filename || "attachment-" + (index + 1),
        contentType: att.contentType || "application/octet-stream",
        content: att.content,
      };
    } catch (error) {
      console.error("Error fetching attachment:", error);
      return null;
    } finally {
      if (connection) connection.end();
    }
  }

  // PC-6 chunk 4c: search the open folder; a failed search counts as no match.
  private searchUids(connection: any, criteria: any[]): Promise<number[]> {
    return new Promise((resolve) => {
      try {
        connection.imap.search(criteria, (err: any, uids: number[]) => resolve(err ? [] : uids || []));
      } catch {
        resolve([]);
      }
    });
  }

  // PC-6 chunk 4c: earlier messages in the same conversation, from Inbox and
  // Sent, oldest first. Found two ways: the hidden reply links email programs
  // add (In-Reply-To and References), and the same subject (ignoring "Re:",
  // "Fwd:") with at least one person in common and an earlier date.
  async getEarlierInConversation(email: Email): Promise<Email[]> {
    const refs = Array.from(new Set([...(email.references || []), ...(email.inReplyTo ? [email.inReplyTo] : [])])).slice(-20);
    const refSet = new Set(refs);
    const core = conversationSubject(email.subject);
    const people = new Set(peopleOn(email));
    const found: Email[] = [];
    let connection: any;
    try {
      connection = await this.getImapConnection();
      for (const mailbox of Array.from(new Set([process.env.IMAP_MAILBOX || "INBOX", process.env.IMAP_SENT_MAILBOX || "Sent"]))) {
        await connection.openBox(mailbox);
        const uids = new Set<number>();
        if (core.length >= 3) {
          for (const u of await this.searchUids(connection, [["SUBJECT", core]])) uids.add(u);
        }
        for (const ref of refs) {
          for (const u of await this.searchUids(connection, [["HEADER", "MESSAGE-ID", ref]])) uids.add(u);
        }
        const list = Array.from(uids).sort((a, b) => b - a).slice(0, 60);
        found.push(...(await this.fetchByUids(connection, mailbox, list)));
      }
    } finally {
      if (connection) connection.end();
    }
    const myTime = new Date(email.sentAt).getTime();
    const seen = new Set<string>();
    if (email.messageId) seen.add(email.messageId);
    return found
      .filter((e) => e.id !== email.id)
      .filter((e) => {
        if (e.messageId && refSet.has(e.messageId)) return true;
        const sameSubject = core.length >= 3 && conversationSubject(e.subject) === core;
        const shares = peopleOn(e).some((p) => people.has(p));
        return sameSubject && shares && new Date(e.sentAt).getTime() < myTime;
      })
      .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())
      .filter((e) => {
        if (!e.messageId) return true;
        if (seen.has(e.messageId)) return false;
        seen.add(e.messageId);
        return true;
      })
      .slice(-50);
  }

  async toggleStar(emailId: string, isStarred: boolean): Promise<{ success: boolean; error?: string }> {
    let connection: any;
    try {
      const { mailbox, uid } = parseEmailId(emailId);
      if (!isAllowedMailbox(mailbox)) throw new Error(`Folder not allowed: ${mailbox}`);
      connection = await this.getImapConnection();
      await connection.openBox(mailbox);
      if (isStarred) {
        await connection.addFlags(uid, "\\Flagged");
      } else {
        await connection.delFlags(uid, "\\Flagged");
      }
      this.invalidateCache(mailbox);
      return { success: true };
    } catch (error) {
      console.error("Error toggling star in IMAP:", error);
      return { success: false, error: "Failed to update star in IMAP" };
    } finally {
      if (connection) connection.end();
    }
  }

  async toggleReadStatus(emailId: string, isRead: boolean): Promise<{ success: boolean; error?: string }> {
    let connection: any;
    try {
      const { mailbox, uid } = parseEmailId(emailId);
      if (!isAllowedMailbox(mailbox)) throw new Error(`Folder not allowed: ${mailbox}`);
      connection = await this.getImapConnection();
      await connection.openBox(mailbox);
      if (isRead) {
        await connection.addFlags(uid, "\\Seen");
      } else {
        await connection.delFlags(uid, "\\Seen");
      }
      this.invalidateCache(mailbox);
      return { success: true };
    } catch (error) {
      console.error("Error toggling read status in IMAP:", error);
      return { success: false, error: "Failed to update read status in IMAP" };
    } finally {
      if (connection) connection.end();
    }
  }

  // PC-4: delete moves the email to Zoho's Trash folder (recoverable), no permanent erase.
  async deleteEmail(emailId: string): Promise<{ success: boolean; error?: string }> {
    let connection: any;
    try {
      const { mailbox, uid } = parseEmailId(emailId);
      if (!isAllowedMailbox(mailbox)) throw new Error(`Folder not allowed: ${mailbox}`);
      connection = await this.getImapConnection();
      await connection.openBox(mailbox);
      await connection.moveMessage(uid, process.env.IMAP_TRASH_MAILBOX || "Trash");
      this.invalidateCache(mailbox);
      return { success: true };
    } catch (error) {
      console.error("Error deleting email in IMAP:", error);
      return { success: false, error: "Failed to delete email in IMAP" };
    } finally {
      if (connection) connection.end();
    }
  }

  async deleteEmails(emailIds: string[]): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = await Promise.all(
      emailIds.map(async (emailId) => ({ emailId, result: await this.deleteEmail(emailId) }))
    );

    const errors: string[] = [];
    let success = 0;
    let failed = 0;

    for (const { emailId, result } of results) {
      if (result.success) {
        success++;
      } else {
        failed++;
        errors.push(`Failed to delete email ${emailId}: ${result.error}`);
      }
    }

    return { success, failed, errors };
  }
}
