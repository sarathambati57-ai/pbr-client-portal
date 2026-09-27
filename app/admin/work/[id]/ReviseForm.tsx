"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ReviseForm({
  workItemId, title, clientId, currentVersion, previousFilePath,
}: {
  workItemId: string;
  title: string;
  clientId: string;
  currentVersion: number;
  previousFilePath: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError("Choose the revised file first."); return; }
    setLoading(true);
    setError("");

    try {
      // Delete the old (rejected) file first, then upload the new one —
      // both go straight from the browser to Supabase Storage, never
      // through our server, so there's no size limit on the video itself.
      setProgressText("Removing old version...");
      if (previousFilePath) {
        await supabase.storage.from("work-files").remove([previousFilePath]);
      }

      setProgressText("Uploading revised file...");
      const newVersionNumber = currentVersion + 1;
      const fileExt = file.name.split(".").pop();
      const filePath = `${clientId}/${workItemId}/v${newVersionNumber}-${Date.now()}.${fileExt}`;

      const { error: storageError } = await supabase.storage
        .from("work-files")
        .upload(filePath, file, { contentType: file.type });

      if (storageError) {
        setError(`Upload failed: ${storageError.message}`);
        setLoading(false);
        return;
      }

      setProgressText("Saving details...");
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          existingWorkItemId: workItemId,
          title,
          filePath,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        await supabase.storage.from("work-files").remove([filePath]);
        setError(result.error || "Upload failed");
        setLoading(false);
        return;
      }

      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
      setProgressText("");
    }
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
        {loading ? (progressText || "Uploading...") : "Submit revised version"}
      </button>
    </form>
  );
}
