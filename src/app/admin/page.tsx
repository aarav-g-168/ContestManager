import type { Metadata } from "next";
import AdminDashboard from "@/components/AdminDashboard";
export const metadata: Metadata = { title: "Reminder operations", robots: { index: false, follow: false } };
export default function AdminPage() { return <AdminDashboard />; }
