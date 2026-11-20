"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Heute", icon: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/tagebuch", label: "Tagebuch", icon: "M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11" },
  { href: "/training", label: "Training", icon: "M9 6a3 3 0 0 1 6 0M7 9h10l1 10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" },
  { href: "/muster", label: "Muster", icon: "M4 4v16h16M8 15l3-4 3 2 5-6" },
  { href: "/gesundheit", label: "Gesundheit", icon: "M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" },
];

export default function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="tabbar" aria-label="Hauptnavigation">
      <div className="tabbar-inner">
        {tabs.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} className="tab" aria-current={active ? "page" : undefined}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={t.icon} />
              </svg>
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
