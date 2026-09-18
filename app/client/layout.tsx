import LogoutButton from "@/app/components/LogoutButton";
import { createClient } from "@/lib/supabase/server";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles").select("client_id, clients(company_name)").eq("id", user!.id).single();

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-white">
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between bg-neutral-950/80 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-900 to-neutral-900 border border-amber-400/30 flex items-center justify-center">
            <span className="text-amber-300 font-bold text-[10px] tracking-wider">PBR</span>
          </div>
          <div>
            <p className="text-amber-300 font-semibold tracking-wide text-sm leading-none">PBR Portal</p>
            <p className="text-neutral-500 text-xs mt-0.5">{(profile as any)?.clients?.company_name}</p>
          </div>
        </div>
        <LogoutButton />
      </header>
      <main className="p-6">{children}</main>
      <footer className="border-t border-neutral-900 px-6 py-4 text-center text-neutral-600 text-xs">
        PBR Digital Services ·{" "}
        <a
          href="https://www.instagram.com/pbr_digital_services"
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-400/70 hover:text-amber-300 transition"
        >
          @pbr_digital_services
        </a>
      </footer>
    </div>
  );
}
