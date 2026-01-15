"use client";

import { User } from "next-auth";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface DashboardLayoutContentProps {
  children: React.ReactNode;
  user: User;
}

export default function DashboardLayoutContent({ children, user }: DashboardLayoutContentProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} />
        <main className="flex-1 p-0 md:ml-64 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}