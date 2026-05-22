"use client";

import { User } from "next-auth";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";

interface ComposeEmailContentProps {
  user: User;
}

export default function ComposeEmailContent({ user }: ComposeEmailContentProps) {
  const [to, setTo] = useState("");
  const [recentRecipients, setRecentRecipients] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("recentRecipients");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentRecipients(parsed.filter((item) => typeof item === "string"));
        }
      }
    } catch (e) {
      console.error("Failed to load recent recipients", e);
    }
  }, []);

  useEffect(() => {
    const toParam = searchParams.get("to");
    const subjectParam = searchParams.get("subject");

    if (toParam) setTo(toParam);
    if (subjectParam) setSubject(subjectParam);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setError("");

    try {
      const response = await fetch("/api/emails/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to,
          subject,
          text: body,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Store recipient email(s) for future suggestions
        const emailsToStore = to
          .split(/[;,]/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (emailsToStore.length > 0) {
          const merged = Array.from(
            new Set([...emailsToStore, ...recentRecipients])
          ).slice(0, 20);
          setRecentRecipients(merged);
          try {
            if (typeof window !== "undefined") {
              window.localStorage.setItem(
                "recentRecipients",
                JSON.stringify(merged)
              );
            }
          } catch (err) {
            console.error("Failed to save recent recipients", err);
          }
        }

        router.push("/inbox");
        router.refresh();
      } else {
        setError(result.error || "Failed to send email");
      }
    } catch (err) {
      setError("An error occurred while sending the email");
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center w-full">
      <div className="flex w-full max-w-7xl">
        <div className="hidden md:block w-48 shrink-0">
          <Sidebar user={user} />
        </div>
        <div className="flex-1 py-8 px-4 text-gray-900">
          <div className="max-w-4xl w-full mx-auto">
            <div className="bg-white dark:bg-[var(--card-bg)] rounded-2xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700">New Email</p>
                  <h1 className="text-2xl font-semibold text-gray-900">Compose</h1>
                  <p className="text-xs text-gray-700 mt-1">
                    Send email using SMTP
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/inbox")}
                  className="px-3 py-1.5 border border-gray-300 rounded-full text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Close
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3 text-sm">
                  <span className="block sm:inline">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-800 uppercase tracking-wide">
                    To
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={to}
                      onChange={(e) => {
                        setTo(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => {
                        // Delay hiding to allow click selection
                        setTimeout(() => setShowSuggestions(false), 100);
                      }}
                      required
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      placeholder="recipient@example.com"
                      autoComplete="off"
                    />
                    {showSuggestions &&
                      recentRecipients.length > 0 &&
                      to.trim().length > 0 && (
                        <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto text-sm">
                          {recentRecipients
                            .filter((email) =>
                              email
                                .toLowerCase()
                                .includes(to.trim().toLowerCase())
                            )
                            .slice(0, 8)
                            .map((email) => (
                              <li
                                key={email}
                                className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setTo(email);
                                  setShowSuggestions(false);
                                }}
                              >
                                {email}
                              </li>
                            ))}
                        </ul>
                      )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-800 uppercase tracking-wide">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    placeholder="Email subject"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-800 uppercase tracking-wide">
                    Message
                  </label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    required
                    rows={14}
                    className="w-full px-3 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Write your message..."
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      disabled={isSending}
                      className="px-5 py-2 rounded-full text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60"
                    >
                      {isSending ? "Sending..." : "Send"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTo("");
                        setSubject("");
                        setBody("");
                      }}
                      className="px-5 py-2 rounded-full text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                    >
                      Clear
                    </button>
                  </div>
                  <p className="text-xs text-gray-800">Send email via SMTP</p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}