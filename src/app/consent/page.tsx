// PC-5 consent (30 September 2026): the page a yes link opens.
// Opening it changes nothing. Only pressing the Yes button counts, so the
// link checkers in work email systems cannot say yes for someone.
import { CONSENT_NOTE, checkConsentToken, decodeAddress, hasSaidYes } from "@/lib/consent";

export const dynamic = "force-dynamic";

export default async function ConsentPage(props: {
  searchParams: Promise<{ a?: string; t?: string }>;
}) {
  const sp = await props.searchParams;
  const a = typeof sp.a === "string" ? sp.a : "";
  const t = typeof sp.t === "string" ? sp.t : "";
  const address = decodeAddress(a);
  const valid = address !== null && checkConsentToken(address, t);

  let already = false;
  let storeError = false;
  if (valid && address) {
    try {
      already = await hasSaidYes(address);
    } catch {
      storeError = true;
    }
  }

  return (
    <main className="min-h-screen bg-white text-gray-900 flex justify-center px-6 py-16">
      <div className="max-w-xl w-full">
        <h1 className="text-2xl font-semibold mb-6">Needpedia Volunteer Coordination</h1>
        {!valid ? (
          <p className="leading-relaxed">
            This yes link is not complete. Please open the full link from the email we sent you.
          </p>
        ) : storeError ? (
          <p className="leading-relaxed">
            We could not check your answer right now. Please open the link again in a minute.
          </p>
        ) : already ? (
          <div className="space-y-4">
            <p className="text-lg leading-relaxed">Thank you. You said yes, and you will not be asked again.</p>
            <p className="leading-relaxed">
              Your messages with us are now part of our public inbox:{" "}
              <a className="text-blue-600 underline" href="/inbox">
                see the public inbox
              </a>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="leading-relaxed">{CONSENT_NOTE}</p>
            <p className="text-sm text-gray-600">This is for {address}.</p>
            <form method="POST" action="/api/consent">
              <input type="hidden" name="a" value={a} />
              <input type="hidden" name="t" value={t} />
              <button
                type="submit"
                className="px-8 py-3 rounded-full text-white bg-blue-600 hover:bg-blue-700 text-lg font-semibold"
              >
                Yes
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
