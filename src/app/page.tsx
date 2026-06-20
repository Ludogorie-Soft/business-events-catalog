import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
        Бизнес Събития България
      </h1>
      <p className="mt-6 max-w-xl text-lg text-gray-600">
        Открийте конференции, уъркшопи, нетуъркинг срещи и още бизнес събития
        в цялата страна.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Link
          href="/events"
          className="rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-blue-500 transition-colors"
        >
          Разгледай всички събития
        </Link>
        <Link
          href="/auth/register"
          className="rounded-md border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Регистрация
        </Link>
      </div>

      {/* City links */}
      <div className="mt-14 text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Събития по градове
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { href: "/city/sofia", label: "София" },
            { href: "/city/vratsa", label: "Враца" },
            { href: "/city/montana", label: "Монтана" },
            { href: "/city/pleven", label: "Плевен" },
            { href: "/online", label: "🖥️ Онлайн" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-full border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
