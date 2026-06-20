import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function Navbar() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-blue-600">
          Бизнес Събития
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/events" className="text-gray-600 hover:text-gray-900">
            Събития
          </Link>
          <Link href="/online" className="text-gray-600 hover:text-gray-900">
            Онлайн
          </Link>

          {user?.role === "ADMIN" && (
            <Link href="/admin" className="text-gray-600 hover:text-gray-900">
              Админ
            </Link>
          )}

          {user ? (
            <>
              <Link href="/profile" className="text-gray-600 hover:text-gray-900">
                {user.name ?? user.email}
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-md bg-gray-100 px-3 py-1.5 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Изход
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-gray-600 hover:text-gray-900"
              >
                Вход
              </Link>
              <Link
                href="/auth/register"
                className="rounded-md bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-500 transition-colors"
              >
                Регистрация
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
