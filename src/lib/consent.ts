// PC-5 consent (30 September 2026). Tony's design:
// - An email shows publicly only when every person on it, other than
//   VC@Needpedia.org itself, has said yes. Otherwise it is "held".
// - Visitors and Adele never receive held emails. Tony's admin login sees
//   them tagged "not public yet".
// - Every email Tony sends to someone who has not said yes ends with his
//   note and a personal yes link. Never says yes = stays private.
import { createHmac, timingSafeEqual } from "crypto";
import type { Redis } from "@upstash/redis";
import { getRedisClient } from "@/lib/redis";
import { EmailService } from "@/services/emailService";
import { Email } from "@/types/email";

const YES_KEY = "consent:yes";
const SEEDED_KEY = "consent:seeded";

// Everyone on an email that reached Zoho before this moment counts as having
// said yes (Tony, PC-4: "testers and devs, it's cool"). The newest such email
// arrived 2026-10-01 02:42:54 UTC.
const SEED_CUTOFF = new Date("2026-10-01T02:45:00Z");

// Tony's note, his exact words (PC-4).
export const CONSENT_NOTE =
  "Our community uses a radically transparent communication system where all messages are publicly visible online and our AI can tell you what everyone's currently working on, (it can see task cards on Needpedia too). This makes it an excellent resource for seeing what's going on with our community, and coordination, but it requires people's consent. To provide yours, click 'yes'. To opt out, simply reply to us at NeedpediaVC@gmail.com";

const ADDRESS_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

export function extractAddresses(...fields: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const field of fields) {
    if (!field) continue;
    for (const match of field.match(ADDRESS_RE) || []) out.add(match.toLowerCase());
  }
  return Array.from(out);
}

export function ownAddresses(): Set<string> {
  return new Set(
    [process.env.EMAIL_FROM, process.env.IMAP_USER, "VC@Needpedia.org"]
      .filter((a): a is string => Boolean(a))
      .map((a) => a.trim().toLowerCase())
  );
}

// Everyone on the email except VC@Needpedia.org itself.
export function otherPeople(email: Email): string[] {
  const own = ownAddresses();
  return extractAddresses(email.from, email.to, email.cc, email.bcc).filter((a) => !own.has(a));
}

export function isHeld(email: Email, yes: Set<string>): boolean {
  return otherPeople(email).some((a) => !yes.has(a));
}

// One time only: put everyone already in Inbox and Sent (before the cutoff)
// on the yes list. Marked done only after both folders were read.
async function seedIfNeeded(redis: Redis): Promise<void> {
  const seeded = await redis.get(SEEDED_KEY);
  if (seeded) return;
  const service = new EmailService();
  const found = new Set<string>();
  for (const mailbox of [process.env.IMAP_MAILBOX || "INBOX", process.env.IMAP_SENT_MAILBOX || "Sent"]) {
    const emails = await service.fetchEmailsFromIMAP({ mailbox, limit: 1000 });
    for (const e of emails) {
      if (new Date(e.receivedAt).getTime() < SEED_CUTOFF.getTime()) {
        otherPeople(e).forEach((a) => found.add(a));
      }
    }
  }
  const list = Array.from(found);
  if (list.length > 0) await redis.sadd(YES_KEY, list[0], ...list.slice(1));
  await redis.set(SEEDED_KEY, new Date().toISOString());
}

// Throws if the list cannot be read. Callers treat that as "held".
export async function loadYesList(): Promise<Set<string>> {
  const redis = getRedisClient();
  if (!redis) throw new Error("Consent list store is not configured");
  await seedIfNeeded(redis);
  const members = await redis.smembers(YES_KEY);
  return new Set((members || []).map((m) => String(m).toLowerCase()));
}

export async function hasSaidYes(address: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) throw new Error("Consent list store is not configured");
  return (await redis.sismember(YES_KEY, address.toLowerCase())) === 1;
}

export async function addYes(address: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) throw new Error("Consent list store is not configured");
  await redis.sadd(YES_KEY, address.toLowerCase());
}

// The secret code in each yes link, so nobody can say yes for someone else.
function linkSecret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is missing");
  return s;
}

export function consentToken(address: string): string {
  return createHmac("sha256", linkSecret())
    .update("vc-consent:" + address.toLowerCase())
    .digest("base64url")
    .slice(0, 32);
}

export function checkConsentToken(address: string, token: string): boolean {
  const expected = Buffer.from(consentToken(address));
  const given = Buffer.from(token || "");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function encodeAddress(address: string): string {
  return Buffer.from(address.toLowerCase(), "utf8").toString("base64url");
}

export function decodeAddress(encoded: string): string | null {
  try {
    const a = Buffer.from(encoded || "", "base64url").toString("utf8").trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a) ? a : null;
  } catch {
    return null;
  }
}

export function consentLink(address: string): string {
  const base = (process.env.CONSENT_BASE_URL || "https://vc-email-five.vercel.app").replace(/\/+$/, "");
  return `${base}/consent?a=${encodeAddress(address)}&t=${consentToken(address)}`;
}

export function noteForText(addresses: string[]): string {
  const lines =
    addresses.length === 1
      ? [`yes: ${consentLink(addresses[0])}`]
      : addresses.map((a) => `yes (${a}): ${consentLink(a)}`);
  return `\n\n--\n${CONSENT_NOTE}\n\n${lines.join("\n")}\n`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function noteForHtml(addresses: string[]): string {
  const links = addresses
    .map((a) => {
      const label = addresses.length === 1 ? "yes" : `yes (${escapeHtml(a)})`;
      return `<a href="${escapeHtml(consentLink(a))}">${label}</a>`;
    })
    .join("<br>");
  return `<br><br>--<br>${escapeHtml(CONSENT_NOTE)}<br><br>${links}`;
}
