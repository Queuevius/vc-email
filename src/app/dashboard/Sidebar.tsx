"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User } from "next-auth";

export default function Sidebar({ user }: { user: User | undefined }) {
  const pathname = usePathname();

  // Define navigation items based on user role
  const navigation = [
    { name: "Inbox", href: "/inbox", current: pathname === "/inbox" },
    ...(user?.role === "ADMIN"
      ? [
        { name: "Compose", href: "/compose", current: pathname === "/compose" },
      ]
      : []
    ),
    { name: "Settings", href: "/dashboard", current: pathname === "/dashboard" },
  ];

  return (
    <div className="hidden md:block md:w-64 bg-white border-r border-gray-200 h-screen fixed overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center space-x-2 mb-6">
          <div className="bg-blue-600 text-white p-2 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">VC Email</h1>
        </div>

        <nav className="mt-5">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`${item.current
                      ? "bg-blue-100 text-blue-700 border-l-4 border-blue-500"
                      : "text-gray-700 hover:bg-gray-200"
                    } group flex items-center px-4 py-2 text-sm font-medium rounded-l-md transition-colors`}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10" />
            <div>
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1
                ${user?.role === 'ADMIN' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                {user?.role}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}