"use client";

import Link from "next/link";
import ThemeToggle from "./theme-toggle";
import AuthButton from "./AuthButton";

export default function Navbar() {
  return (
    <header className="w-full border-b border-gray-200 dark:border-zinc-800 mb-8">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">

        <Link
          href="/"
          className="text-xl font-bold text-gray-800 dark:text-white"
        >
          Contest Manager
        </Link>

        <div className="flex items-center gap-4">

          <Link
            href="/"
            className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-500"
          >
            Home
          </Link>

          <Link
            href="/contests"
            className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-500"
          >
            Contests
          </Link>

          <Link
            href="/bookmarks"
            className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-indigo-500"
          >
            Bookmarks
          </Link>

          <ThemeToggle />
          <AuthButton />
        </div>

      </div>
    </header>
  );
}