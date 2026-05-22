"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { Email } from "@/types/email";
import { useRouter } from "next/navigation";
import EmailItem from "./EmailItem";
import { deleteEmail } from "@/actions/emailActions";

interface EmailListProps {
  userRole?: string;
  refreshTrigger?: number;
  mailbox?: string;
}

export default function EmailList({ userRole, refreshTrigger, mailbox = "INBOX" }: EmailListProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [isDeleting, startTransition] = useTransition();
  const router = useRouter();

  const isAdmin = userRole === "ADMIN";

  // Fetch emails function
  const fetchEmails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/emails?mailbox=${mailbox}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch emails");
      }

      setEmails(data.emails || []);
    } catch (err) {
      console.error("Error fetching emails:", err);
      setError(err instanceof Error ? err.message : "Failed to load emails");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = () => {
    fetchEmails();
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedEmails(new Set(emails.map(email => email.id)));
    } else {
      setSelectedEmails(new Set());
    }
  };

  const handleSelectEmail = (emailId: string, checked: boolean) => {
    const newSelected = new Set(selectedEmails);
    if (checked) {
      newSelected.add(emailId);
    } else {
      newSelected.delete(emailId);
    }
    setSelectedEmails(newSelected);
    setSelectAll(newSelected.size === emails.length && emails.length > 0);
  };

  const handleBulkDelete = async () => {
    if (selectedEmails.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedEmails.size} email(s)?`)) return;

    startTransition(async () => {
      const emailIds = Array.from(selectedEmails);
      const emailIdsSet = new Set(emailIds);

      // Optimistically remove from UI immediately
      setEmails(prev => prev.filter(email => !emailIdsSet.has(email.id)));
      setSelectedEmails(new Set());
      setSelectAll(false);

      // Delete in background
      let successCount = 0;
      let failCount = 0;
      const failedIds: string[] = [];

      for (const emailId of emailIds) {
        try {
          const result = await deleteEmail(emailId);
          if (result.success) {
            successCount++;
          } else {
            failCount++;
            failedIds.push(emailId);
          }
        } catch (error: any) {
          console.error(`Error deleting email ${emailId}:`, error);
          failCount++;
          failedIds.push(emailId);
        }
      }

      // If some deletions failed, restore those emails and refresh
      if (failCount > 0) {
        await fetchEmails();
        alert(`Deleted ${successCount} email(s). ${failCount} failed.`);
      }
    });
  };

  const handleEmailDelete = async (emailId: string) => {
    // Optimistically remove from local state immediately for better UX
    setEmails(prev => prev.filter(email => email.id !== emailId));
    const newSelected = new Set(selectedEmails);
    newSelected.delete(emailId);
    setSelectedEmails(newSelected);
    if (newSelected.size === 0) {
      setSelectAll(false);
    }
    // No need to refetch - the delete action already handles cache invalidation
  };

  // Initial fetch and on trigger
  useEffect(() => {
    fetchEmails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // Update selectAll when emails change
  useEffect(() => {
    if (emails.length === 0) {
      setSelectAll(false);
      setSelectedEmails(new Set());
    } else {
      setSelectAll(selectedEmails.size === emails.length);
    }
  }, [emails.length, selectedEmails.size]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="bg-white overflow-hidden">
      <div>
        <ul className="divide-y divide-gray-100">
          {emails.length === 0 ? (
            <li className="px-6 py-12 text-center">
              <div className="flex justify-center">
                <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No emails yet
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Your latest messages will appear in this list.
              </p>
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
      </div>
    </div>
  );
}