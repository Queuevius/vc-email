"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function GuidescriptManager() {
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

    useEffect(() => {
        fetchGuidescript();
    }, []);

    const fetchGuidescript = async () => {
        try {
            const res = await fetch("/api/guidescript");
            const data = await res.json();
            if (data.content) {
                setContent(data.content);
            } else if (data.error) {
                setMessage({ type: "error", text: data.error });
            }
        } catch (err) {
            setMessage({ type: "error", text: "Failed to load guidescript." });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch("/api/guidescript", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: "success", text: "Guidescript saved successfully!" });
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: "error", text: data.error || "Failed to save." });
            }
        } catch (err) {
            setMessage({ type: "error", text: "An error occurred while saving." });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="ml-3 text-gray-500">Loading configuration...</span>
            </div>
        );
    }

    return (
        <div className="bg-white  rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[700px]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-white flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Assistant Guidelines</h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Define the persona, tone, and specific rules for your VC assistant.</p>
                </div>
                <div className="flex items-center space-x-1 p-1 bg-gray-50 rounded-lg">
                    <button
                        onClick={() => setActiveTab("edit")}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === "edit" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => setActiveTab("preview")}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === "preview" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                    >
                        Preview
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {activeTab === "edit" ? (
                    <textarea
                        className="w-full h-full p-6 text-gray-900  bg-transparent font-mono text-sm dark:text-slate-300 focus:outline-none resize-none leading-relaxed"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="# Enter markdown guidelines here..."
                        spellCheck={false}
                    />
                ) : (
                    <div className="w-full h-full p-6 text-gray-900 p-8 overflow-y-auto prose prose-sm max-w-none prose-headings:font-semibold prose-a:text-blue-600 prose-blockquote:border-blue-500 bg-white">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {content || "*No content to preview*"}
                        </ReactMarkdown>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-between">
                <div className="flex-1">
                    {message && (
                        <div className={`text-sm font-medium ${message.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"} flex items-center`}>
                            {message.type === "success" ? (
                                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            ) : (
                                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            )}
                            {message.text}
                        </div>
                    )}
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="ml-4 inline-flex items-center px-5 py-2.5 bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-gray-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                    {saving ? (
                        <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    ) : (
                        <svg className="h-4 w-4 mr-2 text-gray-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                    )}
                    {saving ? "Saving..." : "Save Configuration"}
                </button>
            </div>
        </div>
    );
}
