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

      {children}
    </div>
  );
}
