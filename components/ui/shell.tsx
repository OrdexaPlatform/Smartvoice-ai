import Link from "next/link";
import {
  LayoutDashboard,
  Sparkles,
  Users,
  ClipboardList,
  FileText,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/import", label: "استيراد AI", icon: Sparkles },
  { href: "/customers", label: "العملاء", icon: Users },
  { href: "/orders", label: "الطلبات", icon: ClipboardList },
  { href: "/invoices", label: "الفواتير", icon: FileText },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

/**
 * هيكل التنقل الأساسي: Sidebar على الشاشات الكبيرة، شريط سفلي على
 * الموبايل. زر "استيراد AI" مميز بصريًا لأنه أهم وظيفة في المنتج.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar — Desktop */}
      <aside className="hidden w-60 shrink-0 border-l border-border bg-card md:block">
        <div className="p-5">
          <span className="text-lg font-bold text-primary">
            SmartInvoice AI
          </span>
        </div>
        <nav className="space-y-1 px-3">
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
      </aside>

      <div className="flex-1 pb-16 md:pb-0">{children}</div>

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
      </nav>
    </div>
  );
}
