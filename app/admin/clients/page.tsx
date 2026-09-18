import { createClient } from "@/lib/supabase/server";
import NewClientForm from "./NewClientForm";

export default async function ClientsPage() {
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, company_name, email, status, projects(count)")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-xl font-semibold">Clients</h1>

      <NewClientForm />

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800">
        {clients?.length ? (
          clients.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-medium">{c.company_name}</p>
                <p className="text-sm text-neutral-400">{c.email}</p>
              </div>
              <div className="text-sm text-neutral-400">
                {c.projects?.[0]?.count ?? 0} project(s) ·{" "}
                <span className="text-green-400 capitalize">{c.status}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="px-5 py-8 text-center text-neutral-500">No clients yet.</p>
        )}
      </div>
    </div>
  );
}
