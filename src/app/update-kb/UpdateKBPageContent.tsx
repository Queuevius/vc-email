"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";

export default function UpdateKBPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);
    const hasFetched = useRef(false);
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/auth/login");
            return;
        }

        if (status === "authenticated") {
            if ((session?.user?.role as string) === "GUEST") {
                router.push("/dashboard");
                return;
            }

            if (hasFetched.current) return;

            const fetchKB = async () => {
                hasFetched.current = true;
                try {
                    const res = await fetch("/api/guidescript");
                    if (res.ok) {
                        const data = await res.json();
                        setContent(data.content || "");
                    } else {
                        setMessage({ type: "error", text: "Failed to load guidescript." });
                    }
                } catch (err) {
                    setMessage({ type: "error", text: "Network error loading guidescript." });
                } finally {
                    setLoading(false);
                }
            };

            fetchKB();
        }
    }, [status, session, router]);

    const handleSave = async (silent = false) => {
        setSaving(true);
        if (!silent) setMessage(null);

        try {
            const res = await fetch("/api/guidescript", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ content }),
            });

            const data = await res.json();

            if (res.ok) {
                if (!silent) setMessage({ type: "success", text: "Knowledge Base updated successfully!" });
            } else {
                setMessage({ type: "error", text: data.error || "Failed to save. Is Vercel KV configured?" });
            }
        } catch (err) {
            setMessage({ type: "error", text: "Network error while saving." });
        } finally {
            setSaving(false);

            if (!silent) {
                setTimeout(() => {
                    setMessage(null);
                }, 5000);
            }
        }
    };

    // Auto-save effect
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        if (loading) return;

        const timeoutId = setTimeout(() => {
            handleSave(true);
        }, 3000);

        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex justify-center w-full">
                <div className="flex w-full max-w-7xl">
                    <div className="hidden md:block w-48 shrink-0"></div>
                    <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent flex justify-center w-full">
            <div className="flex w-full max-w-7xl">
                <div className="shrink-0 z-10 w-48 md:block hidden">
                    <Sidebar user={session?.user} />
                </div>
                <div className="flex-1 pt-20 md:pt-12 px-6 md:px-8">
                    <div className="max-w-4xl w-full mx-auto">
                        <div className="mb-6">
                            <h1 className="text-3xl font-bold text-gray-900">Update Knowledge Base</h1>
                            <p className="text-gray-500 mt-2 text-sm">
                                Define the rules, context, and tone for your AI Assistant.
                                Changes are saved to Upstash Redis and take effect immediately.
                            </p>
                        </div>

                        {message && (
                            <div
                                className={`mb-6 p-4 rounded-xl border flex items-start gap-3 transition-all ${message.type === 'success'
                                    ? 'bg-green-50 border-green-200 text-green-800'
                                    : 'bg-red-50 border-red-200 text-red-800'
                                    }`}
                            >
                                {message.type === 'success' ? (
                                    <svg className="w-5 h-5 shrink-0 mt-0.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                )}
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{message.text}</p>
                                    {message.type === 'error' && message.text.includes('Redis') && (
                                        <p className="text-xs mt-1 opacity-80">
                                            Ensure KV_REST_API_URL and KV_REST_API_TOKEN are set in your environment variables.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[600px]">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                <div className="flex items-center gap-2 text-gray-700 font-medium text-sm">
                                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                    </svg>
                                    Guidescript Instructions
                                </div>
                                <button
                                    onClick={() => handleSave(false)}
                                    disabled={saving}
                                    className="px-5 py-2 rounded-full text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {saving && (
                                        <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 11-16 0z"></path>
                                        </svg>
                                    )}
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>

                            <div className="flex-1 p-0 relative">
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full h-full p-6 text-sm text-gray-800 bg-white resize-none focus:outline-none focus:ring-0 font-mono leading-relaxed"
                                    placeholder="Enter the AI assistant instructions here..."
                                    spellCheck={false}
                                />
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
