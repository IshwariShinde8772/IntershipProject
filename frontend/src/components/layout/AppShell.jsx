import { Bell, Building2, ChartColumn, GraduationCap, LayoutDashboard, LogOut, Menu, UserCircle2, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services/api";
import { roles } from "../../utils/constants";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";

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
    { to: "/reports", label: "Reports", icon: ChartColumn }
  ];
};

export function AppShell() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
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

  const navItems = getNavItems(user?.role, badgeCount);

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-60 border-r border-slate-200 bg-white p-4 transition-transform md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="mb-8 rounded-2xl bg-slate-900 p-4 text-white">
            <div className="text-sm uppercase tracking-[0.2em] text-slate-300">KBTCOE</div>
            <div className="mt-2 text-xl font-semibold">T&amp;P Cell</div>
            <div className="mt-1 text-sm text-slate-300">Placement &amp; Internship Tracker</div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100",
                    isActive && "bg-slate-100 text-slate-900"
                  )
                }
                onClick={() => setOpen(false)}
              >
                <span className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </span>
                {item.badge ? (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">{item.badge}</span>
                ) : null}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-slate-200 p-4">
            <div className="text-sm font-medium text-slate-900">{user?.name}</div>
            <div className="text-xs text-slate-500">{user?.email}</div>
            <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">{user?.role}</div>
            <Button className="mt-4 w-full" variant="outline" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col md:pl-60">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
          <Button variant="ghost" className="md:hidden" onClick={() => setOpen((current) => !current)}>
            <Menu className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium text-slate-500">KBT College of Engineering, Nashik</div>
          <div className="flex items-center gap-3 text-slate-500">
            <Bell className="h-4 w-4" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
