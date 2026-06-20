import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200 text-center">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">Грешка при вход</h1>
      <p className="mb-6 text-gray-600">
        Нещо се обърка. Моля, опитайте отново.
      </p>
      <Link
        href="/auth/login"
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
      >
        Обратно към вход
      </Link>
    </div>
  );
}
