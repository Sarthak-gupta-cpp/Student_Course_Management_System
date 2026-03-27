"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Loader2, Users, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TeacherRoster({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch(`/api/teacher/offerings/${resolvedParams.id}/students`);
        const json = await res.json();
        if (json.students) setStudents(json.students);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Link href="/teacher/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold">Class Roster</h1>
        </div>
        
        {students.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center">No students currently enrolled.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-y border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">Student Name</th>
                  <th className="px-6 py-4 font-semibold">Email</th>
                  <th className="px-6 py-4 font-semibold text-center">Current Grade</th>
                  <th className="px-6 py-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((s) => (
                  <tr key={s.student_id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">
                      {s.student_name}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{s.student_email}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
                        {s.grade || "None"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {s.grade_submitted_to_admin ? (
                        <span className="text-xs text-amber-600 bg-amber-500/10 px-2 py-1 rounded-md font-semibold">Locked</span>
                      ) : (
                        <span className="text-xs text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-md font-semibold">Grades Open</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
