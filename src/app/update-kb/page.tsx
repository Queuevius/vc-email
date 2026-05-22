import { getServerSession } from "next-auth";
import { authOptions } from "@/auth/auth";
import { redirect } from "next/navigation";
import UpdateKBPage from "./UpdateKBPageContent";

export default async function UpdateKBRoute() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/auth/login");
    }

    return <UpdateKBPage />;
}
