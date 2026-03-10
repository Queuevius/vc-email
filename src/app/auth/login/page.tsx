import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/inbox");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-gray-100/50">
          <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-blue-600 text-white shadow-lg mb-6 active:scale-95 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
              VC Email
            </h2>
            <p className="mt-3 text-sm text-gray-500 font-medium">
              A premium experience for handling <br /> your volunteer coordination.
            </p>
          </div>
          <LoginForm />
        </div>
        <p className="mt-8 text-center text-xs text-gray-400 font-medium tracking-wide uppercase">
          &copy; 2026 Needpedia &bull; Secure Access
        </p>
      </div>
    </div>
  );
}