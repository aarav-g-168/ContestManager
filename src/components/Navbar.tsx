import ThemeToggle from "./theme-toggle";

export default function Navbar() {
  return (
    <header className="w-full border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Contest Dashboard
        </h1>
        <ThemeToggle />
      </div>
    </header>
  );
}