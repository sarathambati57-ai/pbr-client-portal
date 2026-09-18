"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Client = {
  id: string;
  company_name: string;
  projects: { id: string; name: string }[];
};

const emptyForm = {
  clientId: "",
  projectId: "",
  newProjectName: "",
  title: "",
  workType: "reel",
  description: "",
  dueDate: "",
};

export default function UploadForm({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0); // bump this to force the file picker to visually clear
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const selectedClient = clients.find((c) => c.id === form.clientId);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!file) {
      setError("Please choose a file to upload.");
      return;
    }
    if (!form.projectId && !form.newProjectName) {
      setError("Select an existing project or type a new project name.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("clientId", form.clientId);
    formData.append("projectId", form.projectId);
    formData.append("newProjectName", form.newProjectName);
    formData.append("title", form.title);
    formData.append("workType", form.workType);
    formData.append("description", form.description);
    formData.append("dueDate", form.dueDate);
    formData.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const result = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(result.error || "Upload failed.");
      return;
    }

    // Full reset — clear every field and visually clear the file picker too,
    // so the form looks genuinely empty/ready for the next upload.
    setForm(emptyForm);
    setFile(null);
    setFileInputKey((k) => k + 1);
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="bg-neutral-900 border border-emerald-800/50 rounded-xl p-8 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-2xl">
          ✓
        </div>
        <p className="text-white font-medium">Uploaded and sent for client approval</p>
        <p className="text-neutral-500 text-sm">The client has been notified.</p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-2 rounded-lg bg-amber-400 text-neutral-950 font-medium px-4 py-2 hover:bg-amber-300 transition"
        >
          Upload another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
      <div>
        <label className="block text-sm text-neutral-300 mb-1">Client</label>
        <select
          required
          value={form.clientId}
          onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value, projectId: "" }))}
          className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white outline-none focus:border-amber-400"
        >
          <option value="">Select client...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.company_name}</option>
          ))}
        </select>
      </div>

      {selectedClient && (
        <div>
          <label className="block text-sm text-neutral-300 mb-1">Project</label>
          <select
            value={form.projectId}
            onChange={(e) => update("projectId", e.target.value)}
            className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white outline-none focus:border-amber-400 mb-2"
          >
            <option value="">-- Create new project below --</option>
            {selectedClient.projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {!form.projectId && (
            <input
              placeholder="New project name (e.g. October Campaign)"
              value={form.newProjectName}
              onChange={(e) => update("newProjectName", e.target.value)}
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white outline-none focus:border-amber-400"
            />
          )}
        </div>
      )}

      <div>
        <label className="block text-sm text-neutral-300 mb-1">Work title</label>
        <input
          required
          placeholder="e.g. Reel 01 – Chocolate Cake"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white outline-none focus:border-amber-400"
        />
        <p className="text-xs text-neutral-500 mt-1">Must be unique within this project.</p>
      </div>

      <div>
        <label className="block text-sm text-neutral-300 mb-1">Work type</label>
        <select
          value={form.workType}
          onChange={(e) => update("workType", e.target.value)}
          className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white outline-none focus:border-amber-400"
        >
          <option value="reel">Reel</option>
          <option value="video">Video</option>
          <option value="poster">Poster</option>
          <option value="image">Image</option>
          <option value="document">Document</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-neutral-300 mb-1">Upload file</label>
        <input
          key={fileInputKey}
          type="file"
          required
          accept="video/*,image/*,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-neutral-300 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm text-neutral-300 mb-1">Description (optional)</label>
        <textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={3}
          className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white outline-none focus:border-amber-400"
        />
      </div>

      <div>
        <label className="block text-sm text-neutral-300 mb-1">Due date (optional)</label>
        <input
          type="date"
          value={form.dueDate}
          onChange={(e) => update("dueDate", e.target.value)}
          className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white outline-none focus:border-amber-400"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-amber-400 text-neutral-950 font-medium py-2 hover:bg-amber-300 transition disabled:opacity-60"
      >
        {loading ? "Uploading..." : "Submit for approval"}
      </button>
    </form>
  );
}
