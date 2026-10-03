export interface Email {
    id: string;
    messageId: string | null;
    from: string;
    to: string;
    cc: string | null;
    bcc: string | null;
    subject: string;
    bodyText: string | null;
    bodyHtml: string | null;
    attachments: string | null;
    sentAt: Date;
    receivedAt: Date;
    size: number;
    headers: string | null;
    isRead: boolean;
    isStarred: boolean;
    labels: string | null;
    senderId: string | null;
    held?: boolean; // PC-5 consent: true = not public yet
    // PC-6 chunk 4b: the attached files, in order (index is used to download one)
    attachmentList?: { index: number; filename: string; size: number; contentType: string }[];
}
