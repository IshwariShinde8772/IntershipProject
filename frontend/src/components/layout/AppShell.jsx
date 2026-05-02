import {
  Bell,
  Building2,
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  UserCircle2,
  Users
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services/api";
import { roles } from "../../utils/constants";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";

const sidebarPreferenceKey = "placement-tracker-sidebar-collapsed";

const getNavItems = (role, badgeCount) => {
  const shared = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/drives", label: "Opportunities", icon: GraduationCap, badge: role === roles.STUDENT ? badgeCount : null }
  ];

  if (role === roles.STUDENT) {
    return [
      ...shared,
      { to: "/profile", label: "My Profile", icon: UserCircle2 }
    ];
  }

  return [
    ...shared,
    { to: "/students", label: "Students", icon: Users },
    { to: "/companies", label: "Companies", icon: Building2 },
    ...(role === roles.SUPER_ADMIN || role === roles.COORDINATOR
      ? [{ to: "/excel-extract", label: "Excel Extract", icon: FileSpreadsheet }]
      : []),
    { to: "/reports", label: "Reports", icon: ChartColumn }
  ];
};

export function AppShell() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(sidebarPreferenceKey) === "true";
  });
  const [badgeCount, setBadgeCount] = useState(0);

  useEffect(() => {
    if (user?.role === roles.STUDENT) {
      api
        .get("/drives")
        .then((response) => {
          const pending = response.data.filter((drive) =>
            drive.applications?.some(
              (application) => application.student_id === user.studentId && application.is_eligible && !application.opted_in
            )
          );
          setBadgeCount(pending.length);
        })
        .catch(() => setBadgeCount(0));
    }
    if (user?.role !== roles.STUDENT) {
      setBadgeCount(0);
    }
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(sidebarPreferenceKey, String(collapsed));
  }, [collapsed]);

  const navItems = getNavItems(user?.role, badgeCount);
  const sidebarWidthClass = collapsed ? "md:w-24" : "md:w-72";
  const contentPaddingClass = collapsed ? "md:pl-24" : "md:pl-72";
  const userInitial = user?.name?.trim()?.charAt(0)?.toUpperCase() ?? "U";

  return (
    <div className="flex min-h-screen bg-slate-100">
      {open ? (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-slate-950/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] border-r border-slate-200 bg-white p-3 transition-[width,transform] duration-300 md:translate-x-0",
          sidebarWidthClass,
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div
            className={cn(
              "mb-6 rounded-2xl bg-slate-900 text-white transition-all",
              collapsed ? "p-3 text-center" : "p-4"
            )}
          >
            <div className="text-sm uppercase tracking-[0.2em] text-slate-300">KBTCOE</div>
            <div className={cn("mt-2 font-semibold", collapsed ? "text-lg" : "text-xl")}>T&amp;P Cell</div>
            {!collapsed ? (
              <div className="mt-1 text-sm text-slate-300">Placement &amp; Internship Tracker</div>
            ) : null}
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    "relative flex items-center rounded-2xl text-sm font-medium text-slate-600 transition hover:bg-slate-100",
                    collapsed ? "justify-center px-2 py-3" : "justify-between px-3 py-2.5",
                    isActive && "bg-slate-100 text-slate-900"
                  )
                }
                onClick={() => setOpen(false)}
              >
                <span className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
                  <item.icon className="h-4 w-4" />
                  {!collapsed ? item.label : null}
                </span>
                {item.badge ? (
                  <span
                    className={cn(
                      "rounded-full bg-red-100 text-xs text-red-600",
                      collapsed ? "absolute right-2 top-2 min-w-5 px-1.5 py-0.5 text-center" : "px-2 py-0.5"
                    )}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>

          <div className={cn("mt-auto space-y-3 rounded-2xl border border-slate-200", collapsed ? "p-3" : "p-4")}>
            <button
              type="button"
              className={cn(
                "hidden w-full items-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900 md:flex",
                collapsed ? "justify-center px-2 py-2.5" : "justify-between px-3 py-2.5"
              )}
              onClick={() => setCollapsed((current) => !current)}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {!collapsed ? <span>Collapse menu</span> : null}
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>

            <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                {userInitial}
              </div>
              {!collapsed ? (
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900">{user?.name}</div>
                  <div className="truncate text-xs text-slate-500">{user?.email}</div>
                  <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">{user?.role}</div>
                </div>
              ) : null}
            </div>
            <Button
              className={cn("w-full", collapsed ? "px-2 py-2.5" : "mt-1")}
              title="Logout"
              variant="outline"
              onClick={logout}
            >
              <LogOut className={cn("h-4 w-4", collapsed ? "" : "mr-2")} />
              {!collapsed ? "Logout" : null}
            </Button>
          </div>
        </div>
      </aside>

      <div className={cn("flex min-h-screen flex-1 flex-col transition-[padding] duration-300", contentPaddingClass)}>
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="md:hidden" onClick={() => setOpen((current) => !current)}>
              <Menu className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              className="hidden md:inline-flex"
              onClick={() => setCollapsed((current) => !current)}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
          <div className="min-w-0 flex-1 px-2 text-sm font-medium text-slate-500 md:flex-none md:px-0">
            <div className="truncate sm:hidden">KBTCOE Placement Tracker</div>
            <div className="hidden sm:block">KBT College of Engineering, Nashik</div>
          </div>
          <div className="flex items-center gap-3 text-slate-500">
            <Bell className="h-4 w-4" />
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
