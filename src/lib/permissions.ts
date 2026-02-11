import { User } from "next-auth";

// Check if user has admin privileges
export function isAdmin(user: User | undefined): boolean {
  return user?.role === "ADMIN";
}

// Check if user has read-only privileges
export function isReadOnly(user: User | undefined): boolean {
  return user?.role === "READ_ONLY";
}

// Check if user can perform an action based on their role
export function canPerformAction(user: User | undefined, action: string): boolean {
  if (action === "fetch_email") return true;

  if (!user) return false;

  switch (action) {
    case "send_email":
      return isAdmin(user);
    case "compose_email":
      return isAdmin(user);
    case "delete_email":
      return isAdmin(user);
    case "view_inbox":
      return isAdmin(user) || isReadOnly(user);
    case "search_emails":
      return isAdmin(user) || isReadOnly(user);
    case "view_email_detail":
      return isAdmin(user) || isReadOnly(user);
    default:
      return false;
  }
}

// Higher-order function to create role-based authorization
export function withRoleAccess(allowedRoles: string[]) {
  return function (user: User | undefined): boolean {
    if (!user) return false;
    return allowedRoles.includes(user.role || "");
  };
}