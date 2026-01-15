import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const adminEmail = process.env.ADMIN_EMAIL || process.env.IMAP_USER;
        const adminPassword = process.env.ADMIN_PASSWORD;
        const guestEmail = process.env.NEXT_PUBLIC_GUEST_EMAIL;
        const guestPassword = process.env.GUEST_PASSWORD || process.env.NEXT_PUBLIC_GUEST_PASSWORD;

        // Admin login
        if (credentials.email === adminEmail && credentials.password === adminPassword) {
          return {
            id: "admin",
            email: adminEmail,
            name: "Admin User",
            role: "ADMIN"
          };
        }

        // Guest login
        if (credentials.email === guestEmail && credentials.password === guestPassword) {
          return {
            id: "guest",
            email: guestEmail,
            name: "Guest User",
            role: "READ_ONLY"
          };
        }

        return null;
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as "ADMIN" | "READ_ONLY";
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as any).role;
      }
      return token;
    }
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error"
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60 // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET
};