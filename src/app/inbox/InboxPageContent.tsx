"use client";

import { User } from "next-auth";
import { useState, useEffect } from "react";
import EmailList from "./EmailList";
import Sidebar from "@/components/layout/Sidebar";

interface InboxPageContentProps {
  user?: User;
}

export default function InboxPageContent({ user }: InboxPageContentProps) {
  const [fetching, setFetching] = useState(false);
  const [fetchMessage, setFetchMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleFetchEmails = async () => {
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

  useEffect(() => {
    handleFetchEmails();

    const handleCustomRefresh = () => {
      handleFetchEmails();
    };

    window.addEventListener("trigger-email-refresh", handleCustomRefresh);
    return () => {
      window.removeEventListener("trigger-email-refresh", handleCustomRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-transparent flex justify-center w-full">
      <div className="flex w-full max-w-7xl">
        <Sidebar user={user} />
        <div className="flex-1 pt-20 md:pt-12 px-6 md:px-8">
          <div className="max-w-6xl w-full mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Inbox</h1>
            </div>

            {fetchMessage && (
              <div
                className={`mb-4 px-4 py-3 rounded-lg ${fetchMessage.type === "success"
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

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <EmailList userRole={user?.role} refreshTrigger={refreshTrigger} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}