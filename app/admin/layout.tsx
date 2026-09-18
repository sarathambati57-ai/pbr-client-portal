import Link from "next/link";
import LogoutButton from "@/app/components/LogoutButton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl" />
      </div>
      <header className="relative border-b border-neutral-800 px-6 py-4 flex items-center justify-between bg-neutral-950/80 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-900 to-neutral-900 border border-amber-400/30 flex items-center justify-center">
              <span className="text-amber-300 font-bold text-[10px] tracking-wider">PBR</span>
            </div>
            <span className="text-amber-300 font-semibold tracking-wide hidden sm:inline">Admin</span>
          </div>
          <nav className="flex gap-5 text-sm text-neutral-300">
            <Link href="/admin" className="hover:text-white transition">Dashboard</Link>
            <Link href="/admin/clients" className="hover:text-white transition">Clients</Link>
            <Link href="/admin/upload" className="hover:text-white transition">Upload Work</Link>
          </nav>
        </div>
        <LogoutButton />
      </header>
      <main className="relative p-6">{children}</main>
      <footer className="relative border-t border-neutral-900 px-6 py-4 text-center text-neutral-600 text-xs">
        PBR Digital Services · Pitch · Build · Rise ·{" "}
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
