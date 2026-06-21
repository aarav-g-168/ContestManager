"use client";

import { auth } from "@/lib/firebase";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    User,
} from "firebase/auth";

export default function AuthButton() {
    const [user, setUser] = useState<User | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });

        return () => unsubscribe();
    }, []);

    const handleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();

            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login Error:", error);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    if (user) {
        return (
            <div className="relative" ref={dropdownRef}>

                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2"
                >
                    <img
                        src={user.photoURL || ""}
                        alt="Profile"
                        className="h-10 w-10 rounded-full border border-gray-300 dark:border-zinc-700 hover:scale-105 transition-transform"
                    />

                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-4 w-4 text-gray-700 dark:text-gray-300 transition-transform ${isOpen ? "rotate-180" : ""
                            }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                        />
                    </svg>
                </button>

                {isOpen && (
                    <div className="absolute right-0 mt-3 w-52 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden z-50">

                        <div className="px-4 py-3 border-b border-gray-200 dark:border-zinc-800">
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">
                                {user.displayName}
                            </p>

                            <p className="text-xs text-gray-500 truncate">
                                {user.email}
                            </p>
                        </div>

                        {/* Mobile Navigation */}
                        <div className="md:hidden border-b border-gray-200 dark:border-zinc-800">

                            <Link
                                href="/"
                                className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                🏠 Home
                            </Link>

                            <Link
                                href="/contests"
                                className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                💻 Contests
                            </Link>

                            <Link
                                href="/bookmarks"
                                className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                📌 Bookmarks
                            </Link>

                            <Link
                                href="/reminders"
                                className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                🔔 Reminders
                            </Link>

                            <Link
                                href="/profile"
                                className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                🧑 Profile
                            </Link>

                        </div>

                        {/* Desktop Quick Links */}
                        <div className="hidden md:block border-b border-gray-200 dark:border-zinc-800">

                            <Link
                                href="/bookmarks"
                                className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                📌 Bookmarks
                            </Link>

                            <Link
                                href="/reminders"
                                className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                🔔 Reminders
                            </Link>

                        </div>

                        <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            Logout
                        </button>

                    </div>
                )}
            </div>
        );
    }

    return (
        <button
            onClick={handleLogin}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
        >
            Get Started
        </button>
    );
}