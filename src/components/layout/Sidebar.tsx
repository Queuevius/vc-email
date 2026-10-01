"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User } from "next-auth";
import { signOut } from "next-auth/react";

// PC-5 chunk 3: the logo above the "Adele" button, remembered between pages.
let cachedLogo: string | null | undefined = undefined;

export default function Sidebar({ user }: { user: User | undefined }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [logo, setLogo] = useState<string | null>(cachedLogo ?? null);

  useEffect(() => {
    const load = () =>
      fetch("/api/logo", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          const value: string | null = d.logo || null;
          cachedLogo = value;
          setLogo(value);
        })
        .catch(() => {});
    load();
    window.addEventListener("logo-updated", load);
    return () => window.removeEventListener("logo-updated", load);
  }, []);

  const handleRefresh = () => {
    window.dispatchEvent(new CustomEvent("trigger-email-refresh"));
    router.refresh();
    setIsOpen(false);
  };

  // PC-5 guest fix: the role is "READ_ONLY", never "GUEST", so the old check
  // gave the guest login Compose and Update KB. Now only admin gets them.
  const isGuest = !user;
  const isAdminUser = user?.role === "ADMIN";

  const navigation = [
    {
      name: "Adele",
      onClick: () => {
        window.dispatchEvent(new CustomEvent("open-ai-assistant"));
        setIsOpen(false);
      },
      type: "button",
      current: false
    },
    ...(isAdminUser ? [{ name: "Compose", href: "/compose", current: pathname === "/compose" }] : []),
    { name: "Refresh", onClick: handleRefresh, type: "button" },
    { name: "Inbox", href: "/inbox", current: pathname === "/inbox" },
    { name: "Sent", href: "/sent", current: pathname === "/sent" },
    ...(isAdminUser ? [{ name: "Update KB", href: "/update-kb", current: pathname === "/update-kb" }] : []),
    {
      name: isGuest ? "Login" : "Logout",
      onClick: () => {
        isGuest ? router.push("/auth/login") : signOut({ callbackUrl: "/auth/login" });
        setIsOpen(false);
      },
      type: "button"
    },
  ];

  return (
    <>
      {/* Mobile Menu Trigger at top left */}
      <div className="md:hidden fixed top-6 left-6 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-white rounded-full shadow-md border border-gray-100 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Toggle menu"
        >
          {isOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed md:sticky md:top-0 h-screen w-48 shrink-0 bg-transparent pt-12 px-6 transition-transform duration-300 ease-in-out z-50
        flex flex-col items-center
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:flex md:left-0
      `}>
        {logo && (
          <img src={logo} alt="Needpedia" className="w-full max-h-28 object-contain mb-6" />
        )}
        <nav className="w-full">
          <ul className="space-y-4 flex flex-col items-center">
            {navigation.map((item) => (
              <li key={item.name} className="w-full">
                {item.type === "button" ? (
                  <button
                    onClick={item.onClick}
                    className={`w-full py-2.5 px-4 text-sm font-bold rounded-full transition-all duration-200 shadow-sm border border-gray-100 flex items-center justify-center italic
                      ${item.current || item.name === "Adele"
                        ? "bg-[#0055ff] text-white"
                        : "bg-white text-gray-900 hover:bg-gray-50 text-center"
                      }`}
                  >
                    {item.name}
                  </button>
                ) : (
                  <Link
                    href={item.href || "#"}
                    onClick={() => setIsOpen(false)}
                    className={`w-full py-2.5 px-4 text-sm font-bold rounded-full transition-all duration-200 shadow-sm border border-gray-100 flex items-center justify-center italic
                      ${item.current
                        ? "bg-[#0055ff] text-white"
                        : "bg-white text-gray-900 hover:bg-gray-50 text-center"
                      }`}
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}