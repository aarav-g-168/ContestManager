"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import {
  Bell,
  Bookmark,
  Compass,
  Home,
  Menu,
  UserRound,
  X,
} from "lucide-react";
import { Dialog } from "radix-ui";
import { useState } from "react";
import ThemeToggle from "./theme-toggle";
import AuthButton from "./AuthButton";
import Brand from "./Brand";
const links = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/contests", label: "Contests", icon: Compass },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/reminders", label: "Reminders", icon: Bell },
];
export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="site-container flex h-[76px] items-center justify-between gap-2 sm:gap-4">
        <Brand />
        <LayoutGroup id="main-navigation">
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-1 lg:flex"
          >
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                className={`relative rounded-md px-4 py-2.5 text-[12px] transition-colors ${pathname === href ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {pathname === href && (
                  <motion.span
                    layoutId="active-nav"
                    className="absolute inset-0 rounded-md border border-border bg-muted"
                    transition={{
                      type: "spring",
                      bounce: 0,
                      duration: reduced ? 0 : 0.35,
                    }}
                  />
                )}
                <span className="relative">{label}</span>
              </Link>
            ))}
          </nav>
        </LayoutGroup>
        <div className="flex items-center gap-1 sm:gap-3">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <AuthButton />
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <button
                className="icon-button lg:hidden"
                aria-label="Open navigation"
              >
                <Menu size={20} />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
              <Dialog.Content className="fixed inset-y-0 right-0 z-50 w-[min(340px,90vw)] overflow-y-auto border-l border-border bg-background p-6 shadow-2xl data-[state=open]:animate-in data-[state=open]:slide-in-from-right-6">
                <div className="mb-10 flex items-center justify-between">
                  <Dialog.Title className="text-sm font-medium">
                    Your workspace
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button
                      className="icon-button"
                      aria-label="Close navigation"
                    >
                      <X size={20} />
                    </button>
                  </Dialog.Close>
                </div>
                <Dialog.Description className="sr-only">
                  Navigate Contest Manager
                </Dialog.Description>
                <nav aria-label="Mobile navigation" className="space-y-2">
                  {[
                    ...links,
                    { href: "/profile", label: "Profile", icon: UserRound },
                  ].map(({ href, label, icon: Icon }) => (
                    <Link
                      onClick={() => setOpen(false)}
                      key={href}
                      href={href}
                      aria-current={pathname === href ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl p-4 text-sm ${pathname === href ? "bg-muted text-primary" : "text-muted-foreground hover:bg-muted"}`}
                    >
                      <Icon size={18} aria-hidden="true" />
                      {label}
                    </Link>
                  ))}
                </nav>
                <div className="mt-6 flex items-center justify-between border-t border-border pt-5 text-sm text-muted-foreground">
                  Appearance
                  <ThemeToggle />
                </div>
                <p className="eyebrow mt-10 pb-2">
                  Show up. Solve. Repeat.
                </p>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  );
}
