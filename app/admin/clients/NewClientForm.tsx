"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewClientForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    password: "",
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/create-client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, loginMethod }),
    });

    const result = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(result.error || "Something went wrong");
      return;
    }

    setForm({ companyName: "", contactName: "", email: "", phone: "", password: "" });
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-amber-400 text-neutral-950 font-medium px-4 py-2 hover:bg-amber-300 transition shadow-lg shadow-amber-400/10"
      >
        + New client
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-neutral-300 mb-1">Company / shop / restaurant name</label>
          <input
            required
            placeholder="e.g. Blast Bakers"
            value={form.companyName}
            onChange={(e) => update("companyName", e.target.value)}
            className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white outline-none focus:border-amber-400"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-300 mb-1">Contact person's name</label>
          <input
            value={form.contactName}
            onChange={(e) => update("contactName", e.target.value)}
            className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white outline-none focus:border-amber-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-neutral-300 mb-2">Login using</label>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setLoginMethod("email")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              loginMethod === "email" ? "bg-amber-400 text-neutral-950" : "bg-neutral-800 text-neutral-300"
            }`}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => setLoginMethod("phone")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              loginMethod === "phone" ? "bg-amber-400 text-neutral-950" : "bg-neutral-800 text-neutral-300"
            }`}
          >
            Phone number
          </button>
        </div>

        {loginMethod === "email" ? (
          <input
            type="email"
            required
            placeholder="client@example.com"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white outline-none focus:border-amber-400"
          />
        ) : (
          <input
            type="tel"
            required
            placeholder="+91XXXXXXXXXX"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white outline-none focus:border-amber-400"
          />
        )}
        <p className="text-xs text-neutral-500 mt-1">
          {loginMethod === "phone"
            ? "Include country code, e.g. +91 for India. No OTP is sent — you set their password directly below."
            : "They'll use this email to log in."}
        </p>
      </div>

      <div>
        <label className="block text-sm text-neutral-300 mb-1">Set their login password</label>
        <input
          type="text"
          required
          minLength={6}
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          placeholder="Tell the client this password separately"
          className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-white outline-none focus:border-amber-400"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-amber-400 text-neutral-950 font-medium px-4 py-2 hover:bg-amber-300 transition disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create client"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-neutral-300 hover:bg-neutral-800 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
