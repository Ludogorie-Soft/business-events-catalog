import Link from "next/link";
import { auth } from "@/auth";

export default async function Footer() {
  const session = await auth();
  const user = session?.user;

  return (
    <footer className="mt-auto border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-gray-500 sm:flex-row">
        <p>© {new Date().getFullYear()} Бизнес Събития България</p>
        <nav className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/events" className="hover:text-gray-900">
            Събития
          </Link>
          <Link href="/online" className="hover:text-gray-900">
            Онлайн
          </Link>
          <Link href="/subscribe" className="hover:text-gray-900">
            Абонамент
          </Link>
          <Link href="/archive" className="hover:text-gray-900">
            Архив
          </Link>
          <Link href="/sources" className="hover:text-gray-900">
            Източници
          </Link>
          {!user ? (
            <>
              <Link href="/auth/login" className="hover:text-gray-900">
                Вход
              </Link>
              <Link href="/auth/register" className="hover:text-gray-900">
                Регистрация
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </footer>
  );
}
