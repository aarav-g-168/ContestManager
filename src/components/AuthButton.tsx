"use client";

import { auth } from "@/lib/firebase";

import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    User,
} from "firebase/auth";

import { useEffect, useState } from "react";

export default function AuthButton() {
    const [user, setUser] = useState<User | null>(null);

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

    if (user) {
        return (
            <div className="flex items-center gap-3">

                <img
                    src={user.photoURL || ""}
                    alt="Profile"
                    className="h-10 w-10 rounded-full border border-gray-300 dark:border-zinc-700"
                />

                <span className="hidden md:block text-sm font-medium text-gray-800 dark:text-white">
                    {user.displayName}
                </span>

                <button
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
                >
                    Logout
                </button>

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