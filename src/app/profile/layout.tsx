import Link from "next/link";
import { auth } from "@/auth";

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {session?.user?.name ?? session?.user?.email ?? "Профил"}
        </h1>
        <p className="text-sm text-gray-500">{session?.user?.email}</p>
      </div>

      <nav className="mb-8 flex gap-1 border-b border-gray-200">
        <Link
          href="/profile/events"
          className="border-b-2 border-blue-600 px-4 py-2 text-sm font-medium text-blue-600"
        >
          Моите събития
        </Link>
      </nav>

      {children}
    </div>
  );
}
