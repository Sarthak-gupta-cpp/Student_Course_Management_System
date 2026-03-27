"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ShieldAlert, Users, CalendarDays, LibraryBig, CheckSquare } from "lucide-react";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);

  // We are just showing quick links here because the specific data is loaded on the specific pages.
  useEffect(() => {
    // Simulate loading for smooth animation in
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const adminLinks = [
    { title: "User Management", desc: "Approve pending admins and assign teacher roles.", href: "/admin/users", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Course Catalog", desc: "Create courses, offerings, and manage semesters.", href: "/admin/courses", icon: LibraryBig, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { title: "System Settings", desc: "Set registration and drop window date/times.", href: "/admin/settings", icon: CalendarDays, color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: "Grades Approval", desc: "Review teacher submissions and release official grades.", href: "/admin/grades-approval", icon: CheckSquare, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent p-8 rounded-3xl border border-rose-500/20 items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-xl shadow-rose-500/25">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Control Panel</h1>
          <p className="text-muted-foreground mt-1">Manage global system settings, users, and curricula.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {adminLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} className="group block h-full">
              <div className="bg-card rounded-2xl border border-border p-6 h-full transition-all duration-200 hover:shadow-xl hover:border-border/80 flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${link.bg} ${link.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{link.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{link.desc}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

    </div>
  );
}
