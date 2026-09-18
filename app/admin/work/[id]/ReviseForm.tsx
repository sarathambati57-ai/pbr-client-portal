"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviseForm({ workItemId, title }: { workItemId: string; title: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError("Choose the revised file first."); return; }
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("workItemId", workItemId);
    formData.append("title", title);
    formData.append("clientId", ""); // not needed for revision path, kept for shared route shape
    formData.append("workType", "reel");
    formData.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const result = await res.json();
    setLoading(false);

    if (!res.ok) { setError(result.error || "Upload failed"); return; }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
      <label className="block text-sm text-neutral-300">Upload revised version</label>
      <input
        type="file"
        accept="video/*,image/*,.pdf"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="w-full text-neutral-300 text-sm"
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-amber-400 text-neutral-950 font-medium px-4 py-2 hover:bg-amber-300 transition disabled:opacity-60"
      >
        {loading ? "Uploading..." : "Submit revised version"}
      </button>
    </form>
  );
}
