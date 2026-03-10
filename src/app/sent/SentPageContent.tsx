"use client";

import { User } from "next-auth";
import { useState, useEffect } from "react";
import EmailList from "../inbox/EmailList";
import Sidebar from "@/components/layout/Sidebar";

interface SentPageContentProps {
    user?: User;
}

export default function SentPageContent({ user }: SentPageContentProps) {
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleFetchEmails = async () => {
        try {
            await fetch("/api/emails/fetch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
        } catch (error) {
            console.error("Failed to fetch emails", error);
        } finally {
            setRefreshTrigger(prev => prev + 1);
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
                            <h1 className="text-3xl font-bold text-gray-900">Sent</h1>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <EmailList
                                userRole={user?.role}
                                refreshTrigger={refreshTrigger}
                                mailbox={process.env.IMAP_SENT_MAILBOX || "Sent"}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
