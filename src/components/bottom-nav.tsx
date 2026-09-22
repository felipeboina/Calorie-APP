"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, TrendingUp, User } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Hoje", icon: Home },
  { href: "/diario", label: "Registrar", icon: PlusCircle },
  { href: "/progresso", label: "Progresso", icon: TrendingUp },
  { href: "/perfil", label: "Perfil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 text-xs transition ${
                active ? "text-emerald-400" : "text-neutral-500"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
