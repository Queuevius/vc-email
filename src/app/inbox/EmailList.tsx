"use client";

// PC-4 chunk 2 (30 September 2026): 30 emails per page, newest first.
// "Show 30 older" / "Show 30 newer" change ?page= in the address, so a page
// number can also be typed into the address bar. The admin login gets tick
// boxes and "Delete selected"; deleted mail goes to Zoho's Trash.

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Email } from "@/types/email";
import EmailItem from "./EmailItem";
import { deleteEmail } from "@/actions/emailActions";

interface EmailListProps {
  userRole?: string;
  refreshTrigger?: number;
  mailbox?: string;
}

export default function EmailList({ userRole, refreshTrigger, mailbox = "INBOX" }: EmailListProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [isDeleting, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const isAdmin = userRole === "ADMIN";

  const fetchEmails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/emails?mailbox=${encodeURIComponent(mailbox)}&page=${page}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch emails");
      }
      setEmails(data.emails || []);
      setTotal(data.total || 0);
      setPageSize(data.pageSize || 30);
      setSelectedEmails(new Set());
    } catch (err) {
      console.error("Error fetching emails:", err);
      setError(err instanceof Error ? err.message : "Failed to load emails");
    } finally {
      setLoading(false);
    }
  }, [mailbox, page]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails, refreshTrigger]);

  const goToPage = (target: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (target <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(target));
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    window.scrollTo({ top: 0 });
  };

  const handleSelectEmail = (emailId: string, checked: boolean) => {
    setSelectedEmails(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(emailId);
      } else {
        next.delete(emailId);
      }
      return next;
    });
  };

  const allSelected = emails.length > 0 && selectedEmails.size === emails.length;

  const handleSelectAll = (checked: boolean) => {
    setSelectedEmails(checked ? new Set(emails.map(email => email.id)) : new Set());
  };

  const handleBulkDelete = () => {
    if (selectedEmails.size === 0) return;
    if (!confirm(`Move ${selectedEmails.size} email(s) to Trash?`)) return;

    const ids = Array.from(selectedEmails);
    startTransition(async () => {
      let failCount = 0;
      for (const id of ids) {
        try {
          const result = await deleteEmail(id);
          if (!result.success) failCount++;
        } catch (err) {
          console.error(`Error deleting email ${id}:`, err);
          failCount++;
        }
      }
      await fetchEmails();
      if (failCount > 0) {
        alert(`${ids.length - failCount} moved to Trash. ${failCount} failed.`);
      }
    });
  };

  const handleEmailDelete = (emailId: string) => {
    setEmails(prev => prev.filter(email => email.id !== emailId));
    setSelectedEmails(prev => {
      const next = new Set(prev);
      next.delete(emailId);
      return next;
    });
    setTotal(prev => Math.max(0, prev - 1));
  };

  const firstShown = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastShown = Math.min(page * pageSize, total);
  const hasOlder = page * pageSize < total;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex items-center justify-between gap-4" role="alert">
        <span className="block sm:inline">{error}</span>
        <button
          onClick={() => fetchEmails()}
          className="px-3 py-1 rounded-full border border-red-400 text-sm font-medium bg-white hover:bg-red-50"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white overflow-hidden">
      {isAdmin && emails.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-100 bg-gray-50">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="h-4 w-4"
            />
            Select all on this page
          </label>
          {selectedEmails.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="px-3 py-1 rounded-full text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? "Moving to Trash..." : `Delete selected (${selectedEmails.size})`}
            </button>
          )}
        </div>
      )}

      <ul className="divide-y divide-gray-100">
        {emails.length === 0 ? (
          <li className="px-6 py-12 text-center">
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {page > 1 ? "No emails on this page" : "No emails yet"}
            </h3>
            {page > 1 && (
              <button
                onClick={() => goToPage(1)}
                className="mt-3 px-4 py-2 rounded-full border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100"
              >
                Back to newest
              </button>
            )}
          </li>
        ) : (
          emails.map((email) => (
            <EmailItem
              key={email.id}
              email={email}
              userRole={userRole}
              onDelete={handleEmailDelete}
              onSelect={handleSelectEmail}
              isSelected={selectedEmails.has(email.id)}
            />
          ))
        )}
      </ul>

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 text-sm text-gray-600">
          <span>
            Showing {firstShown}-{lastShown} of {total} (page {page})
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <button
                onClick={() => goToPage(page - 1)}
                className="px-4 py-2 rounded-full border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100"
              >
                Show {pageSize} newer
              </button>
            )}
            {hasOlder && (
              <button
                onClick={() => goToPage(page + 1)}
                className="px-4 py-2 rounded-full border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-100"
              >
                Show {pageSize} older
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
