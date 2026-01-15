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
}
