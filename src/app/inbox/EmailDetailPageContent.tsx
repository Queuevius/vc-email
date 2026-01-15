"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Email } from "@/types/email";
import { deleteEmail, toggleReadStatus } from "@/actions/emailActions";
import DOMPurify from "dompurify";

interface EmailDetailPageContentProps {
  email: Email;
  userRole?: string;
}

export default function EmailDetailPageContent({ email, userRole }: EmailDetailPageContentProps) {
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this email?")) return;

    startTransition(async () => {
      const result = await deleteEmail(email.id);
      if (result.success) {
        router.push("/inbox");
      } else {
        alert(result.error);
      }
    });
  };

  const handleToggleRead = async () => {
    startTransition(async () => {
      const result = await toggleReadStatus(email.id, !email.isRead);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  };


  const formatDate = (dateString: Date) => {
    if (!mounted) return "";
    return new Date(dateString).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isAdmin = userRole === "ADMIN";

  // Extract sender name from email address
  const getSenderName = (emailAddress: string) => {
    const name = emailAddress.split('@')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <div className="flex items-center space-x-2">
              <Link
                href="/inbox"
                className="p-2 rounded-full hover:bg-gray-200 text-gray-600"
                title="Back to inbox"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </Link>
              <span className="text-sm text-gray-600 hidden sm:inline">Back to inbox</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              {isAdmin && (
                <>
                  <button
                    className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50"
                    title="Delete"
                    onClick={handleDelete}
                    disabled={isPending}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 7a1 1 0 011 1v7a1 1 0 11-2 0V8a1 1 0 011-1zm4 1a1 1 0 00-2 0v7a1 1 0 002 0V8zm3-1a1 1 0 011 1v7a1 1 0 11-2 0V8a1 1 0 011-1z" clipRule="evenodd" />
                      <path d="M4 5h12v2H4V5zm3-2h6v2H7V3z" />
                    </svg>
                  </button>

                </>
              )}
              <span className="text-xs text-gray-500 hidden sm:inline">{formatDate(email.sentAt)}</span>
            </div>
          </div>

          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{email.subject}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  To {email.to} {email.cc ? `• Cc ${email.cc}` : ""}
                </p>
              </div>
              <p className="text-sm text-gray-500 whitespace-nowrap">{formatDate(email.sentAt)}</p>
            </div>
          </div>

          <div className="px-6 py-4 flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
              {getSenderName(email.from).charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{getSenderName(email.from)}</p>
                  <p className="text-xs text-gray-500">{email.from}</p>
                </div>
                <button
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
                  title="Reply"
                  onClick={() => {
                    const params = new URLSearchParams({
                      to: email.from,
                      subject: email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`
                    });
                    router.push(`/compose?${params.toString()}`);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4A1 1 0 018.7 6.3L6.414 8.586 17 8.59a3 3 0 013 3v.91a1.5 1.5 0 01-1.5 1.5H7.707z" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">to <span className="font-medium text-gray-800">me</span></p>
              {email.cc && (
                <p className="text-xs text-gray-500 mt-1">cc {email.cc}</p>
              )}
            </div>
          </div>

          <div className="px-6 pb-8 text-gray-900">
            <div className="prose max-w-none">
              {email.bodyHtml ? (
                <div
                  className="text-gray-900"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(email.bodyHtml, {
                      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span'],
                      ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
                    })
                  }}
                />
              ) : (
                <p className="whitespace-pre-line text-gray-900">{email.bodyText}</p>
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-t bg-gray-50 flex flex-wrap justify-end gap-2">
            <button
              className="px-4 py-2 rounded-full border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {
                const params = new URLSearchParams({
                  to: email.from,
                  subject: email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`
                });
                router.push(`/compose?${params.toString()}`);
              }}
            >
              Reply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}