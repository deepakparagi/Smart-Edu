"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Award,
  Layers,
  Sparkles,
  ListTodo,
  Clock,
  BarChart3,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

const BASE_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/quizzes", label: "Quizzes", icon: Award },
  { href: "/flashcards", label: "Flashcards", icon: Layers },
  { href: "/ai-tutor", label: "AI Tutor", icon: Sparkles },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/focus", label: "Focus Mode", icon: Clock },
  { href: "/analytics", label: "Progress", icon: BarChart3 },
];

export function Navbar({ customRightAction }: { customRightAction?: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch(`${API}/auth/me`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.role) setUserRole(data.role);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const navItems = [...BASE_NAV_ITEMS];
  if (userRole === "PARENT" || pathname.startsWith("/parent")) {
    navItems.push({ href: "/parent", label: "Parent Portal", icon: ShieldCheck });
  }
  if (userRole === "ADMIN" || pathname.startsWith("/admin")) {
    navItems.push({ href: "/admin", label: "Administration", icon: ShieldAlert });
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
    } finally {
      router.push("/");
    }
  }

  return (
    <header
      className="global-navbar"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        width: "100%",
        background: "rgba(5, 13, 9, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 20px",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        {/* Brand */}
        <Link
          className="brand"
          href="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <span className="brand-mark">S</span>
          <span style={{ fontSize: "15px", fontWeight: 760, letterSpacing: "-0.04em", color: "var(--paper)" }}>
            smart study
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav
          className="desktop-nav"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "rgba(0, 0, 0, 0.35)",
            padding: "4px 6px",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "7px 12px",
                  borderRadius: "9px",
                  fontSize: "12px",
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? "var(--lime)" : "var(--mist)",
                  background: isActive ? "rgba(196, 255, 106, 0.12)" : "transparent",
                  border: isActive ? "1px solid rgba(196, 255, 106, 0.3)" : "1px solid transparent",
                  textDecoration: "none",
                  transition: "all 0.18s ease",
                  whiteSpace: "nowrap",
                }}
              >
                <Icon size={14} color={isActive ? "var(--lime)" : "currentColor"} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Section: Custom action + Logout + Mobile hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          {customRightAction}

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            title="Sign out of Smart Study"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 12px",
              borderRadius: "9px",
              fontSize: "12px",
              fontWeight: 650,
              color: "var(--mist)",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--line)",
              cursor: "pointer",
              transition: "all 0.18s ease",
            }}
          >
            <LogOut size={13} />
            <span className="logout-text">Sign out</span>
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            className="mobile-nav-toggle"
            onClick={() => setMobileOpen((curr) => !curr)}
            aria-label="Toggle navigation menu"
            style={{
              display: "none",
              padding: "8px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--line)",
              borderRadius: "9px",
              color: "var(--paper)",
              cursor: "pointer",
            }}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      {mobileOpen && (
        <div
          className="mobile-nav-dropdown"
          style={{
            borderTop: "1px solid var(--line)",
            background: "rgba(7, 16, 12, 0.98)",
            padding: "16px 20px 24px",
            display: "grid",
            gap: "8px",
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "var(--lime)" : "var(--paper-soft)",
                  background: isActive ? "rgba(196, 255, 106, 0.12)" : "rgba(255, 255, 255, 0.03)",
                  border: isActive ? "1px solid rgba(196, 255, 106, 0.3)" : "1px solid var(--line)",
                  textDecoration: "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Icon size={16} />
                  <span>{item.label}</span>
                </div>
                <ChevronRight size={14} color="var(--mist)" />
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
export default Navbar;
