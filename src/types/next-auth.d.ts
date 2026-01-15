import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: "ADMIN" | "READ_ONLY";
        } & DefaultSession["user"];
    }

    interface User {
        id: string;
        role: "ADMIN" | "READ_ONLY";
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        sub: string;
        role: "ADMIN" | "READ_ONLY";
    }
}
