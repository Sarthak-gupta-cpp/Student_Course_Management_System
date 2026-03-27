"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { UserDropMenu } from "./user-drop-menu";
import { useEffect, useState } from "react";
import { GraduationCap, LayoutDashboard, CalendarPlus, BookOpenText, Users, Settings, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// In a real app, this would be fetched from session via props or context
// For this UI shell, we fetch user session at the navbar level
export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  
  // Dummy effect for scroll tracking to add glassmorphism on scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Determine role based on URL pattern for the UI (actual auth is in middleware)
  const isStudent = pathname.startsWith("/student");
  const isTeacher = pathname.startsWith("/teacher");
  const isAdmin = pathname.startsWith("/admin");
  const isAuth = pathname.startsWith("/auth");

  if (isAuth) return null; // No navbar on login page

  const studentLinks = [
    { name: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
    { name: "Registration", href: "/student/registration", icon: CalendarPlus },
    { name: "Grades", href: "/student/grades", icon: BookOpenText },
  ];

  const teacherLinks = [
    { name: "Dashboard", href: "/teacher/dashboard", icon: LayoutDashboard },
  ];

  const adminLinks = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Courses", href: "/admin/courses", icon: BookOpenText },
    { name: "Settings", href: "/admin/settings", icon: Settings },
    { name: "Approvals", href: "/admin/grades-approval", icon: ClipboardCheck },
  ];

  const links = isStudent ? studentLinks : isTeacher ? teacherLinks : isAdmin ? adminLinks : [];

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 h-16 border-b transition-all duration-300",
        scrolled
          ? "bg-background/80 backdrop-blur-md border-border/80 shadow-sm"
          : "bg-background border-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-primary/10 p-2 rounded-xl group-hover:bg-primary/20 transition-colors">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <span className="font-bold text-lg hidden sm:block tracking-tight">CMS</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <UserDropMenu />
        </div>
      </div>
    </header>
  );
}
