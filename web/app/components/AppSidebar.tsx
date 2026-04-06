"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const PURPLE = "#7C3AED";
const PURPLE_LIGHT = "#EDE9FE";

// ── ICONS ─────────────────────────────────────────────────────────────────────

function HomeIcon({ size = 18, filled = false }: { size?: number; filled?: boolean }) {
  return filled ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}

function RupeeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="4" x2="18" y2="4"/>
      <line x1="6" y1="9" x2="18" y2="9"/>
      <path d="M6 4h6a4 4 0 010 8H6"/>
      <path d="M6 13l10 7"/>
    </svg>
  );
}

function GroupsIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  );
}

function ActivityIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}

function AccountIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function LogOutIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navItems: NavItem[] = [
    { href: "/",         label: "Home",     icon: (a) => <HomeIcon size={18} filled={a} /> },
    { href: "/expenses", label: "Expenses", icon: ()  => <RupeeIcon size={18} /> },
    { href: "/groups",   label: "Groups",   icon: ()  => <GroupsIcon size={18} /> },
    { href: "/activity", label: "Activity", icon: ()  => <ActivityIcon size={18} /> },
    { href: "/profile",  label: "Account",  icon: ()  => <AccountIcon size={18} /> },
  ];

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  const initial = session?.user?.name?.charAt(0).toUpperCase() || "?";

  return (
    <aside style={{
      width: 220,
      minHeight: "100vh",
      background: "#fff",
      borderRight: "1px solid #F3F0FF",
      display: "flex",
      flexDirection: "column",
      position: "fixed",
      top: 0, left: 0, bottom: 0,
      zIndex: 40,
      boxShadow: "2px 0 16px rgba(124,58,237,0.06)",
    }}>

      {/* ── LOGO ── */}
      <div style={{ padding: "26px 20px 24px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%",
          background: `linear-gradient(135deg, ${PURPLE} 0%, #5B21B6 100%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 900, fontSize: 16, flexShrink: 0,
          boxShadow: `0 4px 12px ${PURPLE}44`,
        }}>
          {initial}
        </div>
        <span style={{ fontWeight: 900, fontSize: 19, color: "#0f172a", letterSpacing: "-0.3px" }}>SplitEase</span>
      </div>

      {/* ── NAV ── */}
      <nav style={{ flex: 1, padding: "4px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "11px 14px", borderRadius: 14,
                textDecoration: "none",
                background: active ? PURPLE_LIGHT : "transparent",
                color: active ? PURPLE : "#64748b",
                fontWeight: active ? 700 : 500,
                fontSize: 15,
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ color: active ? PURPLE : "#94a3b8", flexShrink: 0, display: "flex", alignItems: "center" }}>
                {item.icon(active)}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ── USER CARD ── */}
      <div style={{ padding: "16px 12px 24px", borderTop: "1px solid #F3F0FF" }}>
        {session?.user && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: `linear-gradient(135deg, ${PURPLE} 0%, #5B21B6 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 900, color: "white", flexShrink: 0,
            }}>
              {initial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {session.user.name?.split(" ")[0]}
              </p>
              <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>♥</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              title="Sign out"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4, display: "flex", alignItems: "center" }}
            >
              <LogOutIcon />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

/** Wraps page content in a desktop sidebar layout + mobile bottom nav */
export function AppShell({
  children,
  activeTab,
}: {
  children: React.ReactNode;
  activeTab?: "dashboard" | "groups" | "expenses" | "activity" | "profile";
}) {
  return (
    <>
      <style>{`
        .splitease-sidebar { display: none; }
        .splitease-content { padding-bottom: 80px; }
        .splitease-mobile-nav { display: flex; }
        @media (min-width: 1024px) {
          .splitease-sidebar { display: block !important; }
          .splitease-content { padding-left: 220px !important; padding-bottom: 0 !important; }
          .splitease-mobile-nav { display: none !important; }
        }
      `}</style>
      <div className="splitease-sidebar"><AppSidebar /></div>
      <div className="splitease-content">
        {children}
      </div>
      <MobileBottomNav activeTab={activeTab} />
    </>
  );
}

function MobileBottomNav({ activeTab }: { activeTab?: string }) {
  const tabs = [
    { key: "dashboard", href: "/",         icon: <HomeIcon size={20} />,     label: "Home" },
    { key: "expenses",  href: "/expenses",  icon: <RupeeIcon size={20} />,    label: "Expenses" },
    { key: "groups",    href: "/groups",    icon: <GroupsIcon size={20} />,   label: "Groups" },
    { key: "activity",  href: "/activity",  icon: <ActivityIcon size={20} />, label: "Activity" },
    { key: "profile",   href: "/profile",   icon: <AccountIcon size={20} />,  label: "Account" },
  ];

  return (
    <nav className="splitease-mobile-nav" style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "rgba(255,255,255,0.97)",
      backdropFilter: "blur(12px)",
      borderTop: "1px solid #EDE9FE",
      height: 64, display: "flex", alignItems: "stretch",
      zIndex: 50, boxShadow: "0 -4px 24px rgba(124,58,237,0.10)",
    }}>
      {tabs.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <Link key={tab.key} href={tab.href} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 3, textDecoration: "none", color: active ? PURPLE : "#94a3b8", position: "relative",
          }}>
            {active && <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 28, height: 2, borderRadius: "0 0 4px 4px", background: PURPLE }} />}
            <span style={{ color: active ? PURPLE : "#94a3b8" }}>{tab.icon}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
