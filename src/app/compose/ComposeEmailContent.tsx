"use client";

import { User } from "next-auth";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";

// PC-6 chunk 4a: text colors offered in the toolbar.
const COLORS = [
  { name: "Black", value: "#111827" },
  { name: "Red", value: "#dc2626" },
  { name: "Orange", value: "#ea580c" },
  { name: "Green", value: "#16a34a" },
  { name: "Blue", value: "#2563eb" },
  { name: "Purple", value: "#9333ea" },
];

// PC-6 chunk 4b: Vercel takes at most 4.5 MB per request, so attached files
// are capped at 4 MB in total. Bigger files go as a Google Drive link.
const MAX_ATTACH_BYTES = 4 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  if (bytes >= 1024) return Math.round(bytes / 1024) + " KB";
  return bytes + " bytes";
}

interface ComposeEmailContentProps {
  user: User;
}

export default function ComposeEmailContent({ user }: ComposeEmailContentProps) {
  const [to, setTo] = useState("");
  const [recentRecipients, setRecentRecipients] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [subject, setSubject] = useState("");
  // PC-6 chunk 4a: the message is a formatted text box, not plain text.
  const [bodyEmpty, setBodyEmpty] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  // PC-6 chunk 4b: attached files, about 4 MB in total.
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // PC-6 chunk 4c: the email being answered, if this is a reply
  const [replyTo, setReplyTo] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const searchParams = useSearchParams();

  // PC-6 chunk 4a: the toolbar buttons format whatever words are selected.
  const keepSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current && editorRef.current.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (sel && savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  };

  const format = (command: string, value?: string) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, value);
    keepSelection();
    setBodyEmpty(!(editorRef.current?.innerText || "").trim());
  };

  const addLink = () => {
    keepSelection();
    if (!savedRange.current || savedRange.current.collapsed) {
      alert("First select the words you want to turn into a link, then click Link.");
      return;
    }
    let url = window.prompt("Web address for the selected words:", "https://");
    if (!url) return;
    url = url.trim();
    if (!/^(https?:\/\/|mailto:)/i.test(url)) url = "https://" + url;
    format("createLink", url);
  };

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const incoming = Array.from(list);
    setFiles((prev) => [...prev, ...incoming]);
  };

  // PC-6 chunk 4b: a file dropped anywhere on this page is attached, instead
  // of the browser opening or downloading it.
  useEffect(() => {
    const hasFiles = (e: DragEvent) => Boolean(e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files"));
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      const dropped = Array.from(e.dataTransfer?.files || []);
      if (dropped.length > 0) setFiles((prev) => [...prev, ...dropped]);
    };
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, []);

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  const tooBig = totalBytes > MAX_ATTACH_BYTES;

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
    const replyParam = searchParams.get("replyTo");
    if (replyParam) setReplyTo(replyParam);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // PC-6 chunk 4a: the message goes out formatted, plus a plain copy.
    const html = editorRef.current?.innerHTML || "";
    const text = (editorRef.current?.innerText || "").trim();
    if (!text) {
      setError("Please write a message.");
      return;
    }
    if (tooBig) {
      setError("Attached files are over 4 MB in total. Remove some, or share big files as a Google Drive link.");
      return;
    }
    setIsSending(true);
    setError("");

    try {
      // PC-6 chunk 4b: sent as a form so attached files can go along.
      const form = new FormData();
      form.append("to", to);
      form.append("subject", subject);
      form.append("text", text);
      form.append("html", html);
      if (replyTo) form.append("replyTo", replyTo);
      for (const f of files) form.append("attachments", f, f.name);
      const response = await fetch("/api/emails/send", {
        method: "POST",
        body: form,
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
                  <div className="flex flex-wrap items-center gap-1 border border-gray-300 border-b-0 rounded-t-lg bg-gray-50 px-2 py-1">
                    <button type="button" title="Bold" onMouseDown={(e) => { e.preventDefault(); format("bold"); }} className="w-8 h-8 rounded hover:bg-gray-200 text-sm font-bold">B</button>
                    <button type="button" title="Italic" onMouseDown={(e) => { e.preventDefault(); format("italic"); }} className="w-8 h-8 rounded hover:bg-gray-200 text-sm italic">I</button>
                    <button type="button" title="Underline" onMouseDown={(e) => { e.preventDefault(); format("underline"); }} className="w-8 h-8 rounded hover:bg-gray-200 text-sm underline">U</button>
                    <span className="mx-1 h-5 w-px bg-gray-300" />
                    {COLORS.map((col) => (
                      <button
                        key={col.value}
                        type="button"
                        title={col.name}
                        onMouseDown={(e) => { e.preventDefault(); format("foreColor", col.value); }}
                        className="w-5 h-5 m-0.5 rounded-full border border-gray-300"
                        style={{ backgroundColor: col.value }}
                      />
                    ))}
                    <span className="mx-1 h-5 w-px bg-gray-300" />
                    <button type="button" title="Select some words first, then click to make them a link" onMouseDown={(e) => { e.preventDefault(); addLink(); }} className="px-2 h-8 rounded hover:bg-gray-200 text-sm text-blue-700 underline">Link</button>
                    <button type="button" title="Remove the link from the selected words" onMouseDown={(e) => { e.preventDefault(); format("unlink"); }} className="px-2 h-8 rounded hover:bg-gray-200 text-sm text-gray-600">Unlink</button>
                  </div>
                  <div className="relative">
                    <div
                      ref={editorRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={() => { setBodyEmpty(!(editorRef.current?.innerText || "").trim()); keepSelection(); }}
                      onKeyUp={keepSelection}
                      onMouseUp={keepSelection}
                      className="w-full min-h-[20rem] px-3 py-3 text-sm text-gray-900 border border-gray-300 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-auto [&_a]:text-blue-700 [&_a]:underline"
                    />
                    {bodyEmpty && (
                      <span className="pointer-events-none absolute left-3 top-3 text-sm text-gray-400">Write your message...</span>
                    )}
                  </div>
                  {/* PC-6 chunk 4b: attached files */}
                  <div className="pt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg border border-dashed border-gray-400 text-sm text-gray-700 bg-white hover:bg-gray-50"
                    >
                      📎 Attach files (or drag them onto this page)
                    </button>
                    {files.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {files.map((f, i) => (
                          <li key={i + "-" + f.name} className="flex items-center gap-2 text-sm text-gray-800">
                            <span className="font-medium">{f.name}</span>
                            <span className="text-xs text-gray-500">{formatSize(f.size)}</span>
                            <button
                              type="button"
                              title="Remove this file"
                              onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                              className="px-1 text-gray-500 hover:text-red-600"
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                        <li className={"text-xs " + (tooBig ? "text-red-600 font-medium" : "text-gray-500")}>
                          Total {formatSize(totalBytes)} of 4 MB{tooBig ? ". Too big to send: remove some, or share big files as a Google Drive link." : ""}
                        </li>
                      </ul>
                    )}
                  </div>
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
                        if (editorRef.current) editorRef.current.innerHTML = "";
                        setBodyEmpty(true);
                        setFiles([]);
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