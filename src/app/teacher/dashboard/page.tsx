"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, BookOpen, Users } from "lucide-react";

export default function TeacherDashboard() {
  const [loading, setLoading] = useState(true);
  const [offerings, setOfferings] = useState<any[]>([]);

  useEffect(() => {
    fetchOfferings();
  }, []);

  const fetchOfferings = async () => {
    try {
      const res = await fetch("/api/teacher/offerings");
      const json = await res.json();
      if (json.offerings) {
        const sorted = json.offerings.sort((a: any, b: any) => {
          if (a.is_current === b.is_current) return 0;
          return a.is_current ? -1 : 1;
        });
        setOfferings(sorted);
      }
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-8 rounded-3xl border border-emerald-500/20 items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/25">
          <BookOpen className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your course offerings and grade students.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {offerings.length === 0 ? (
          <div className="col-span-full text-center py-20 border-2 border-dashed border-border rounded-xl">
            <p className="font-medium text-foreground">No courses assigned to you.</p>
            <p className="text-sm text-muted-foreground">Contact the administration if this is an error.</p>
          </div>
        ) : (
          offerings.map((offering) => (
            <div key={offering.offering_id} className={`rounded-2xl border overflow-hidden hover:shadow-lg transition-all flex flex-col group ${offering.is_current ? 'bg-card border-border hover:border-border/80' : 'bg-muted/20 border-border/40 opacity-70 contrast-75 saturate-50'}`}>
              <div className="p-6 pb-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1 block uppercase tracking-wider">
                      {offering.semester_name} {offering.is_current ? '(Active)' : ''}
                    </span>
                    <h3 className="text-xl font-bold">{offering.course_id}</h3>
                    <p className="text-sm text-muted-foreground">{offering.course_name}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-xl mt-4">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">
                    {offering.current_enrolled} / {offering.max_capacity} Students Enrolled
                  </span>
                </div>
              </div>
              
              <div className="p-6 pt-0 mt-auto flex gap-2">
                 <Link href={`/teacher/courses/${offering.offering_id}`} className="flex-1 text-center bg-primary/10 text-primary hover:bg-primary/20 text-sm font-semibold py-2.5 rounded-xl transition-colors">
                  View Roster
                 </Link>
                 <Link href={`/teacher/courses/${offering.offering_id}/grading`} className="flex-1 text-center bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 text-sm font-semibold py-2.5 rounded-xl transition-colors">
                  Grade Class
                 </Link>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
