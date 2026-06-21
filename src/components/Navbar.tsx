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
          className="text-lg md:text-xl font-bold text-gray-800 dark:text-white leading-tight"
        >
          Contest Manager
        </Link>

        <div className="flex items-center gap-3 md:gap-6">

          <div className="hidden md:flex items-center gap-6">

            <Link
              href="/"
              className="relative text-lg font-medium text-gray-600 dark:text-gray-300 transition-all duration-300 hover:text-indigo-500 hover:-translate-y-0.5 after:absolute after:left-1/2 after:bottom-[-4px] after:h-[2px] after:w-0 after:rounded-full after:bg-indigo-500 after:transition-all after:duration-300 hover:after:w-full hover:after:left-0"
            >
              Home
            </Link>

            <Link
              href="/contests"
              className="relative text-lg font-medium text-gray-600 dark:text-gray-300 transition-all duration-300 hover:text-indigo-500 hover:-translate-y-0.5 after:absolute after:left-1/2 after:bottom-[-4px] after:h-[2px] after:w-0 after:rounded-full after:bg-indigo-500 after:transition-all after:duration-300 hover:after:w-full hover:after:left-0"
            >
              Contests
            </Link>

            <Link
              href="/bookmarks"
              className="relative text-lg font-medium text-gray-600 dark:text-gray-300 transition-all duration-300 hover:text-indigo-500 hover:-translate-y-0.5 after:absolute after:left-1/2 after:bottom-[-4px] after:h-[2px] after:w-0 after:rounded-full after:bg-indigo-500 after:transition-all after:duration-300 hover:after:w-full hover:after:left-0"
            >
              Bookmarks
            </Link>

            <Link
              href="/reminders"
              className="relative text-lg font-medium text-gray-600 dark:text-gray-300 transition-all duration-300 hover:text-indigo-500 hover:-translate-y-0.5 after:absolute after:left-1/2 after:bottom-[-4px] after:h-[2px] after:w-0 after:rounded-full after:bg-indigo-500 after:transition-all after:duration-300 hover:after:w-full hover:after:left-0"
            >
              Reminders
            </Link>

            <Link
              href="/profile"
              className="relative text-lg font-medium text-gray-600 dark:text-gray-300 transition-all duration-300 hover:text-indigo-500 hover:-translate-y-0.5 after:absolute after:left-1/2 after:bottom-[-4px] after:h-[2px] after:w-0 after:rounded-full after:bg-indigo-500 after:transition-all after:duration-300 hover:after:w-full hover:after:left-0"
            >
              Profile
            </Link>

          </div>
          <ThemeToggle />
          <AuthButton />

        </div>
      </div>
    </header>
  );
}