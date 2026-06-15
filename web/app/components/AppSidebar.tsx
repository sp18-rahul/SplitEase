"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/",         label: "Dashboard", icon: "dashboard" },
  { href: "/groups",   label: "My Groups", icon: "group" },
  { href: "/activity", label: "Activity",  icon: "notifications" },
  { href: "/friends",  label: "Friends",   icon: "person" },
  { href: "/profile",  label: "Profile",   icon: "account_circle" },
  { href: "/settings", label: "Settings",  icon: "settings" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside style={{
      position: "fixed", left: 0, top: 0, height: "100vh",
      width: 260, background: "#F8F5FF",
      borderRight: "1px solid #F0EEFF",
      display: "flex", flexDirection: "column",
      paddingTop: 24, zIndex: 50,
      boxSizing: "border-box",
    }}>
      {/* BRANDING */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 20px 28px" }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: "#7C3AED", display: "flex",
          alignItems: "center", justifyContent: "center",
          color: "white", flexShrink: 0,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>
            grid_view
          </span>
        </div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16, color: "#7C3AED", letterSpacing: "-0.3px" }}>SplitEase</div>
          <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>Manage Expenses</div>
        </div>
      </div>

      {/* NAV */}
      <nav style={{ flex: 1, padding: "0 12px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", minHeight: 0 }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "11px 14px",
                borderRadius: 10,
                textDecoration: "none",
                fontWeight: active ? 700 : 500,
                fontSize: 14,
                color: active ? "#7C3AED" : "#4A4455",
                background: active ? "#EDE9FE" : "transparent",
                borderLeft: active ? "4px solid #7C3AED" : "4px solid transparent",
                transition: "all 0.15s",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 20,
                  fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* BOTTOM — user + logout in one row */}
      <div style={{ borderTop: "1px solid #F0EEFF", padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 12, background: "#F0EEFF" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #7C3AED, #5B21B6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "white", flexShrink: 0 }}>
            {session?.user?.name?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#1D1A24", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {session?.user?.name ?? "User"}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            title="Log Out"
            style={{ width: 30, height: 30, borderRadius: 8, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.background = "#fff1f2"; (e.currentTarget.querySelector("span") as HTMLElement).style.color = "#E11D48"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; (e.currentTarget.querySelector("span") as HTMLElement).style.color = "#9CA3AF"; }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#9CA3AF" }}>logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export function AppShell({
  children,
  activeTab,
}: {
  children: React.ReactNode;
  activeTab?: string;
}) {
  return (
    <>
      <style>{`
        .se-sidebar { display: none; }
        .se-content  { padding-bottom: 72px; }
        .se-mobile-nav { display: flex; }
        .se-header { position: fixed; top: 0; right: 0; left: 0; z-index: 30; }
        @media (min-width: 1024px) {
          .se-sidebar     { display: block !important; }
          .se-content     { padding-left: 260px !important; padding-bottom: 0 !important; }
          .se-mobile-nav  { display: none !important; }
          .se-header      { left: 260px !important; }
        }
      `}</style>
      <div className="se-sidebar"><AppSidebar /></div>
      <div className="se-content">{children}</div>
      <MobileBottomNav activeTab={activeTab} />
    </>
  );
}

function MobileBottomNav({ activeTab }: { activeTab?: string }) {
  const TABS = [
    { key: "dashboard", href: "/",         icon: "home",       label: "Home" },
    { key: "groups",    href: "/groups",    icon: "group",      label: "Groups" },
    { key: "add",       href: "/expenses/add", icon: "add_circle", label: "Add" },
    { key: "activity",  href: "/activity",  icon: "history",    label: "Activity" },
    { key: "profile",   href: "/profile",   icon: "person",     label: "Profile" },
  ];
  return (
    <nav
      className="se-mobile-nav"
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "#FFFFFF", borderTop: "1px solid #F0EEFF",
        height: 64, alignItems: "stretch", zIndex: 50,
        boxShadow: "0 -4px 16px rgba(99,14,212,0.07)",
      }}
    >
      {TABS.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 3, textDecoration: "none",
              color: active ? "#7C3AED" : "#9CA3AF",
              position: "relative",
            }}
          >
            {active && (
              <div style={{
                position: "absolute", top: 0, left: "50%",
                transform: "translateX(-50%)",
                width: 32, height: 3,
                borderRadius: "0 0 4px 4px",
                background: "#7C3AED",
              }} />
            )}
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 22, fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
            >
              {tab.icon}
            </span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
