"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewPanel({ workItem, currentVersion, fileUrl }: any) {
  const router = useRouter();
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"none" | "approve" | "reject">("none");

  const statusLabel: Record<string, string> = {
    draft: "Draft", pending_review: "Pending Review", approved: "Approved", changes_requested: "Changes Requested",
  };

  async function submitReview(decision: "approved" | "changes_requested") {
    if (decision === "changes_requested" && !remarks.trim()) {
      setError("Please write your remarks before requesting changes.");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workItemId: workItem.id, versionId: currentVersion.id, decision, remarks }),
    });

    const result = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(result.error || "Something went wrong");
      return;
    }

    router.refresh();
    setMode("none");
    setRemarks("");
  }

  const isFinal = workItem.status === "approved";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-amber-400 text-sm font-medium uppercase tracking-wide">
          {workItem.clients?.company_name}
        </p>
        <h1 className="text-xl font-semibold mt-1">
          {workItem.title} — Version {currentVersion?.version_number ?? workItem.current_version}
        </h1>
        <p className="text-neutral-400 text-sm mt-1">{statusLabel[workItem.status]}</p>
      </div>

      {workItem.description && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <p className="text-sm text-neutral-300">{workItem.description}</p>
        </div>
      )}

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        {fileUrl ? (
          workItem.work_type === "reel" || workItem.work_type === "video" ? (
            <video src={fileUrl} controls className="w-full rounded-lg max-h-[480px]" />
          ) : workItem.work_type === "document" ? (
            <a href={fileUrl} target="_blank" className="text-amber-400 underline">
              Open document
            </a>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl} alt={workItem.title} className="w-full rounded-lg max-h-[480px] object-contain" />
          )
        ) : (
          <p className="text-neutral-500 text-sm">
            The file for this version is no longer available on the server. Contact the agency to have it resent.
          </p>
        )}
      </div>

      {!isFinal && workItem.status !== "changes_requested" && (
        <div className="space-y-3">
          {mode === "none" && (
            <div className="flex gap-3">
              <button
                onClick={() => setMode("approve")}
                className="flex-1 rounded-lg bg-green-500 text-neutral-950 font-medium py-2 hover:bg-green-400 transition"
              >
                Approve
              </button>
              <button
                onClick={() => setMode("reject")}
                className="flex-1 rounded-lg bg-red-500/90 text-white font-medium py-2 hover:bg-red-500 transition"
              >
                Request Changes
              </button>
            </div>
          )}

          {mode !== "none" && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
              <label className="block text-sm text-neutral-300">
                {mode === "approve" ? "Remarks (optional)" : "What needs to change? (required)"}
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                placeholder={mode === "approve" ? "e.g. Approved, post it tomorrow." : "e.g. Change the first scene, replace the music."}
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white outline-none focus:border-amber-400"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3">
                <button
                  onClick={() => submitReview(mode === "approve" ? "approved" : "changes_requested")}
                  disabled={loading}
                  className={`rounded-lg font-medium px-4 py-2 transition disabled:opacity-60 ${
                    mode === "approve" ? "bg-green-500 hover:bg-green-400 text-neutral-950" : "bg-red-500/90 hover:bg-red-500 text-white"
                  }`}
                >
                  {loading ? "Submitting..." : "Submit review"}
                </button>
                <button
                  onClick={() => { setMode("none"); setError(""); }}
                  className="rounded-lg border border-neutral-700 px-4 py-2 text-neutral-300 hover:bg-neutral-800 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {workItem.status === "changes_requested" && (
        <p className="text-sm text-neutral-500">
          You've requested changes. The agency will upload a revised version for you to review next.
        </p>
      )}

      {workItem.reviews?.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-neutral-300 mb-2">Review history</h2>
          <div className="space-y-2">
            {workItem.reviews.map((r: any) => (
              <div key={r.id} className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm">
                <p className={r.decision === "approved" ? "text-green-400" : "text-red-400"}>
                  {r.decision === "approved" ? "Approved" : "Changes requested"} · {new Date(r.created_at).toLocaleString()}
                </p>
                {r.remarks && <p className="text-neutral-300 mt-1">{r.remarks}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
