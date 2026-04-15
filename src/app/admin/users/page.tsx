"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, ShieldAlert, ShieldCheck, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminUsers() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [updating, setUpdating] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (json.users) setUsers(json.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    setUpdating(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole })
      });
      
      const json = await res.json();
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } else {
        alert(json.error || "Failed to update role");
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Assign roles (TEACHER, ADMIN) to user accounts.</p>
          </div>
        </div>
        
        <div className="relative w-full md:w-72">
           <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
           <input 
             type="text" 
             placeholder="Search by name or email..." 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
           />
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Email Account</th>
                <th className="px-6 py-4 font-semibold">Current Role</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">
                    {u.name}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold",
                      u.role === "ADMIN" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                      u.role === "TEACHER" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                      u.role === "PENDING_ADMIN" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse" :
                      "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    )}>
                      {u.role === "ADMIN" && <ShieldCheck className="w-3 h-3" />}
                      {u.role === "PENDING_ADMIN" && <ShieldAlert className="w-3 h-3" />}
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      disabled={updating === u.id}
                      className="ml-auto bg-background border border-border text-foreground text-xs rounded-lg focus:ring-primary focus:border-primary block p-2 disabled:opacity-50"
                    >
                      <option value="STUDENT">Student</option>
                      <option value="TEACHER">Teacher</option>
                      <option value="PENDING_ADMIN">Pending Admin</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
