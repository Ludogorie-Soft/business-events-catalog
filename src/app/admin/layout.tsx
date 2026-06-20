import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/");

  const navLinks = [
    { href: "/admin/events", label: "📋 Събития" },
    { href: "/admin/sources", label: "🔗 Източници" },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="w-52 shrink-0 border-r border-gray-200 bg-gray-50 px-4 py-6">
        <p className="mb-6 text-xs font-bold uppercase tracking-widest text-gray-400">
          Администрация
        </p>
        <nav className="space-y-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto px-6 py-6">{children}</main>
    </div>
  );
}
