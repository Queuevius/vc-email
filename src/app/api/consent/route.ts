// PC-5 consent (30 September 2026): pressing Yes on the consent page lands
// here. The secret code is checked, the address goes on the yes list, and the
// person is sent back to the consent page, which now says thank you.
import { NextRequest, NextResponse } from "next/server";
import { addYes, checkConsentToken, decodeAddress } from "@/lib/consent";

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const a = String(form?.get("a") || "");
  const t = String(form?.get("t") || "");
  const address = decodeAddress(a);

  if (!address || !checkConsentToken(address, t)) {
    return new Response(
      "This yes link is not complete. Please open the full link from the email we sent you.",
      { status: 400 }
    );
  }

  try {
    await addYes(address);
  } catch (err) {
    console.error("Could not save consent:", err);
    return new Response(
      "We could not save your yes right now. Please open the link again in a minute.",
      { status: 503 }
    );
  }

  const back = new URL("/consent", req.url);
  back.searchParams.set("a", a);
  back.searchParams.set("t", t);
  return NextResponse.redirect(back, 303);
}
