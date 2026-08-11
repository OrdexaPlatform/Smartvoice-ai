"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  Users,
  ClipboardList,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/import", label: "استيراد AI", icon: Sparkles },
  { href: "/customers", label: "العملاء", icon: Users },
  { href: "/orders", label: "الطلبات", icon: ClipboardList },
  { href: "/invoices", label: "الفواتير", icon: FileText },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar — Desktop */}
      <aside className="hidden w-60 shrink-0 border-l border-border bg-card md:flex md:flex-col">
        <div className="p-5">
          <span className="text-lg font-bold text-primary">
            SmartInvoice AI
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary hover:text-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* تسجيل الخروج */}
        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />

            {loggingOut ? "جارٍ تسجيل الخروج..." : "تسجيل الخروج"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 pb-16 md:pb-0">
        {children}
      </div>

      {/* Bottom nav — Mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-card md:hidden">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] text-foreground/70"
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}

        {/* تسجيل الخروج للموبايل */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] text-red-600 disabled:opacity-50"
        >
          <LogOut className="h-5 w-5" />
          {loggingOut ? "..." : "خروج"}
        </button>
      </nav>
    </div>
  );
}
