"use client";

// PC-5 chunk 3 (30 September 2026): upload, change or remove the logo that
// shows above the "Adele" button for everyone.
import { useEffect, useRef, useState } from "react";

const MAX_BYTES = 500 * 1024;

export default function LogoSettings() {
  const [logo, setLogo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/logo", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setLogo(d.logo || null))
      .catch(() => {});
  }, []);

  const announce = () => window.dispatchEvent(new CustomEvent("logo-updated"));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setMessage({ type: "error", text: "That picture is too big. Use one under 500 KB." });
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || "");
      setBusy(true);
      setMessage(null);
      try {
        const res = await fetch("/api/logo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logo: dataUrl }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setLogo(dataUrl);
          announce();
          setMessage({ type: "success", text: "Logo saved. It now shows above the Adele button." });
        } else {
          setMessage({ type: "error", text: data.error || "Could not save the logo." });
        }
      } catch {
        setMessage({ type: "error", text: "Network error while saving the logo." });
      } finally {
        setBusy(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = async () => {
    if (!confirm("Remove the logo?")) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/logo", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setLogo(null);
        announce();
        setMessage({ type: "success", text: "Logo removed." });
      } else {
        setMessage({ type: "error", text: data.error || "Could not remove the logo." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error while removing the logo." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900">Logo</h2>
      <p className="text-gray-500 mt-1 text-sm">
        Shows above the Adele button for everyone. PNG, JPG, GIF, WEBP or SVG, under 500 KB.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="w-40 h-20 rounded-xl border border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden">
          {logo ? (
            <img src={logo} alt="Current logo" className="max-w-full max-h-full object-contain" />
          ) : (
            <span className="text-xs text-gray-400">No logo</span>
          )}
        </div>
        <label className={`px-5 py-2 rounded-full text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer ${busy ? "opacity-50 pointer-events-none" : ""}`}>
          {busy ? "Saving..." : logo ? "Change logo" : "Upload logo"}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleFile}
            disabled={busy}
          />
        </label>
        {logo && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className="px-5 py-2 rounded-full text-sm font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            Remove logo
          </button>
        )}
      </div>
      {message && (
        <p className={`mt-3 text-sm ${message.type === "success" ? "text-green-700" : "text-red-700"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
