"use client";

import { signOut } from "next-auth/react";
import { User } from "next-auth";

export default function Header({ user }: { user: User | undefined }) {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">Inbox</h1>
          </div>
          <div className="flex items-center">
            <div className="ml-3 relative">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700 hidden md:block">
                  {user?.name || user?.email}
                </span>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                  ${user?.role === 'ADMIN' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'} hidden md:block`}>
                  {user?.role}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/auth/login" })}
                  className="ml-2 bg-white border border-gray-300 rounded-full p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}