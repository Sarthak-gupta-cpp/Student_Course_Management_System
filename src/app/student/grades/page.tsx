"use client";

import { useEffect, useState } from "react";
import { Loader2, Award, BookOpen, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StudentGrades() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ grades: any[], cgpa: string, totalCredits: number } | null>(null);

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    try {
      const res = await fetch("/api/student/grades");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const grades = data?.grades || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-card p-8 rounded-3xl border border-border shadow-sm relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Academic Records</h1>
            <p className="text-muted-foreground mt-1">View your officially released grades and CGPA.</p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-background border border-border px-6 py-4 rounded-2xl text-center shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Credits</p>
              <p className="text-2xl font-black">{data?.totalCredits || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-400 to-amber-600 text-white px-6 py-4 rounded-2xl text-center shadow-lg shadow-yellow-500/20">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-90">Cumulative CGPA</p>
              <div className="flex items-center gap-2 justify-center">
                <Star className="w-5 h-5 fill-white" />
                <p className="text-3xl font-black">{data?.cgpa || "0.00"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grades List */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Course Grades</h2>
        </div>
        
        {grades.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="font-medium">No grades have been released yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Grades will appear here once approved by Administration.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">Semester</th>
                  <th className="px-6 py-4 font-semibold">Course</th>
                  <th className="px-6 py-4 font-semibold text-center">Credits</th>
                  <th className="px-6 py-4 font-semibold text-right">Grade Assessed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {grades.map((g: any) => (
                  <tr key={g.enrollment_id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">{g.semester_name}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-foreground">{g.course_id}</p>
                      <p className="text-xs text-muted-foreground">{g.course_name}</p>
                    </td>
                    <td className="px-6 py-4 text-center font-medium">{g.credits}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn(
                        "inline-flex items-center justify-center min-w-[3rem] px-3 py-1.5 rounded-lg font-bold text-sm",
                        g.grade.includes('A') ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" :
                        g.grade.includes('B') ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" :
                        g.grade.includes('C') ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" :
                        "bg-destructive/10 text-destructive border border-destructive/20"
                      )}>
                        {g.grade}
                      </span>
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
