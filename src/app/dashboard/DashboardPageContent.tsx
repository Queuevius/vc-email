"use client";

import { User } from "next-auth";

interface DashboardPageContentProps {
  user: User;
  emailCount: number;
}

export default function DashboardPageContent({ user, emailCount }: DashboardPageContentProps) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Account Information</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <div className="mt-1 text-sm text-gray-900">{user?.name}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="mt-1 text-sm text-gray-900">{user?.email}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${user?.role === 'ADMIN' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                  {user?.role}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Account Status</label>
              <div className="mt-1 text-sm text-gray-900">Active</div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Email Statistics</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-500">Total Emails</p>
              <p className="text-2xl font-semibold text-gray-900">{emailCount}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-500">Unread</p>
              <p className="text-2xl font-semibold text-gray-900">0</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-500">Sent</p>
              <p className="text-2xl font-semibold text-gray-900">{user?.role === 'ADMIN' ? emailCount : 'N/A'}</p>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <a 
              href="/inbox" 
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              View Inbox
            </a>
            
            {user?.role === "ADMIN" && (
              <a 
                href="/compose" 
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Compose Email
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}