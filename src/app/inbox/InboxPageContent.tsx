"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { User } from "next-auth";
import { useState, useEffect } from "react";
import EmailList from "./EmailList";

interface InboxPageContentProps {
  user?: User;
}

export default function InboxPageContent({ user }: InboxPageContentProps) {
  const [fetching, setFetching] = useState(false);
  const [fetchMessage, setFetchMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleFetchEmails = async () => {
    // allow anyone to fetch for now as requested

    setFetching(true);
    setFetchMessage(null);

    try {
      const response = await fetch("/api/emails/fetch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch emails");
      }

      setFetchMessage({
        type: "success",
        text: data.message || `Successfully fetched ${data.fetched} email(s)`,
      });

      // Signal EmailList to refresh
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      setFetchMessage({
        type: "error",
        text: error.message || "Failed to fetch emails from IMAP",
      });
    } finally {
      setFetching(false);
    }
  };

  // Auto-fetch on mount (non-blocking)
  useEffect(() => {
    // Don't block initial render - fetch in background
    handleFetchEmails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-2xl font-semibold text-gray-900">Inbox</p>
            <p className="text-sm text-gray-500">New messages are shown first</p>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            <button
              onClick={handleFetchEmails}
              disabled={fetching}
              className="inline-flex flex-shrink-0 items-center px-3 py-2 rounded-full text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Fetch emails from IMAP"
            >
              {fetching ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 mr-2"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Fetching...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Fetch Emails
                </>
              )}
            </button>
            <Link
              href="/compose"
              className="inline-flex flex-shrink-0 items-center px-4 py-2 rounded-full text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
              </svg>
              Compose
            </Link>
            {user ? (
              <>
                {/* Settings button hidden as requested to use env-based guidescript instead of UI updates */}
                {/* 
                <Link
                  href="/settings"
                  className="inline-flex flex-shrink-0 items-center px-3 py-2 rounded-full text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </Link>
                */}
                <button
                  onClick={() => signOut({ callbackUrl: "/auth/login" })}
                  className="inline-flex flex-shrink-0 items-center px-3 py-2 rounded-full text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 shadow-sm"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-2"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15" />
                    <path d="M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="inline-flex flex-shrink-0 items-center px-4 py-2 rounded-full text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Login
              </Link>
            )}
          </div>
        </div>

        {fetchMessage && (
          <div
            className={`px-4 py-3 rounded-lg ${fetchMessage.type === "success"
              ? "bg-green-100 border border-green-400 text-green-700"
              : "bg-red-100 border border-red-400 text-red-700"
              }`}
            role="alert"
          >
            <div className="flex items-center justify-between">
              <span>{fetchMessage.text}</span>
              <button
                onClick={() => setFetchMessage(null)}
                className="ml-4 text-current opacity-70 hover:opacity-100"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        <EmailList userRole={user?.role} refreshTrigger={refreshTrigger} />
      </div>
    </div >
  );
}