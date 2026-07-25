import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-gray-500 sm:flex-row">
        <p>© {new Date().getFullYear()} Бизнес Събития България</p>
        <nav className="flex items-center gap-4">
          <Link href="/events" className="hover:text-gray-900">
            Събития
          </Link>
          <Link href="/online" className="hover:text-gray-900">
            Онлайн
          </Link>
          <Link href="/archive" className="hover:text-gray-900">
            Архив
          </Link>
          <Link href="/sources" className="hover:text-gray-900">
            Източници
          </Link>
        </nav>
      </div>
    </footer>
  );
}
