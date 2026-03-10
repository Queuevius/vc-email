import { useState, useEffect, useTransition, memo, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Email } from "@/types/email";
import { toggleStar, deleteEmail } from "@/actions/emailActions";

interface EmailItemProps {
  email: Email;
  userRole?: string;
  onDelete?: (emailId: string) => void;
  onSelect?: (emailId: string, selected: boolean) => void;
  isSelected?: boolean;
}

function EmailItem({ email, userRole, onDelete, onSelect, isSelected = false }: EmailItemProps) {
  const [mounted, setMounted] = useState(false);
  const [isStarred, setIsStarred] = useState(email.isStarred);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsStarred(email.isStarred);
  }, [email.isStarred]);

  const handleToggleStar = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const newStarredStatus = !isStarred;
    setIsStarred(newStarredStatus);

    startTransition(async () => {
      const result = await toggleStar(email.id, newStarredStatus);
      if (!result.success) {
        // Revert on failure
        setIsStarred(!newStarredStatus);
        console.error(result.error);
      }
    });
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this email?")) return;

    setIsDeleting(true);
    startTransition(async () => {
      try {
        const result = await deleteEmail(email.id);
        if (result.success) {
          if (onDelete) {
            onDelete(email.id);
          } else {
            router.refresh();
          }
        } else {
          alert(result.error || "Failed to delete email");
          setIsDeleting(false);
        }
      } catch (error: any) {
        console.error("Error deleting email:", error);
        alert(error.message || "Failed to delete email");
        setIsDeleting(false);
      }
    });
  };

  const isAdmin = userRole === "ADMIN";

  // Memoize computed values
  const formattedDate = useMemo(() => {
    if (!mounted) return "";
    const date = new Date(email.sentAt);
    return date.toLocaleString([], { month: "short", day: "numeric" });
  }, [email.sentAt, mounted]);

  const truncatedSubject = useMemo(() => {
    const maxLength = 60;
    if (email.subject.length <= maxLength) return email.subject;
    return email.subject.substring(0, maxLength) + "...";
  }, [email.subject]);

  const truncatedBody = useMemo(() => {
    const maxLength = 100;
    if (!email.bodyText) return "";
    if (email.bodyText.length <= maxLength) return email.bodyText;
    return email.bodyText.substring(0, maxLength) + "...";
  }, [email.bodyText]);

  const senderName = useMemo(() => {
    const name = email.from.split('@')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, [email.from]);

  const senderInitial = useMemo(() => {
    return senderName.charAt(0);
  }, [senderName]);

  return (
    <li className="hover:bg-gray-50 transition-colors relative group">
      <div className="flex items-center px-4 py-3 gap-4 overflow-hidden">
        <div className="flex items-center space-x-4 w-48 shrink-0">
          <button
            className={`hover:text-yellow-500 transition-colors ${isStarred ? "text-yellow-400" : "text-gray-300"} ${isPending ? "opacity-50" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleToggleStar(e);
            }}
            disabled={isPending}
          >
            {isStarred ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.88 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499c.215-.66 1.125-.66 1.34 0l1.558 4.77a1 1 0 00.95.69h5.012c.695 0 .985.889.423 1.3l-4.053 2.946a1 1 0 00-.364 1.118l1.559 4.77c.214.66-.537 1.21-1.098.8l-4.053-2.946a1 1 0 00-1.176 0l-4.052 2.946c-.561.41-1.312-.14-1.098-.8l1.559-4.77a1 1 0 00-.364-1.118L3.236 10.26c-.562-.411-.272-1.3.423-1.3h5.011a1 1 0 00.951-.69l1.559-4.77z" />
              </svg>
            )}
          </button>
          <div className="shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
            {senderInitial}
          </div>
          <Link href={`/inbox/${email.id}`} className="block min-w-0" onClick={(e) => e.stopPropagation()}>
            <p className={`truncate text-sm ${email.isRead ? "text-gray-700" : "font-semibold text-gray-900"}`}>
              {senderName}
            </p>
          </Link>
        </div>

        <Link href={`/inbox/${email.id}`} className="flex-1 flex flex-col sm:flex-row sm:items-center sm:space-x-2 min-w-0" onClick={(e) => e.stopPropagation()}>
          <p className={`truncate text-sm ${email.isRead ? "text-gray-900" : "font-semibold text-gray-900"}`}>
            {truncatedSubject}
          </p>
          <p className="truncate text-sm text-gray-400">
            <span className="hidden sm:inline">- </span>
            {truncatedBody}
          </p>
        </Link>

        <div className="w-20 shrink-0 text-right">
          <Link href={`/inbox/${email.id}`} className="block" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs text-gray-400">
              {formattedDate}
            </p>
          </Link>
        </div>
      </div>
    </li>
  );
}

// Memoize EmailItem to prevent unnecessary re-renders
export default memo(EmailItem);