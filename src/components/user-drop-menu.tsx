"use client";

import { LogOut, UserCircle } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";

export function UserDropMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-full hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-white shadow-inner">
          <UserCircle className="h-5 w-5" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="px-4 py-2 border-b border-border mb-1">
            <p className="text-sm font-medium text-foreground truncate">My Account</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
