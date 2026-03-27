"use client";

import { useEffect, useState } from "react";
import { ScheduleTimetable } from "@/components/schedule-timetable";
import { Loader2, GraduationCap, Clock, CalendarDays } from "lucide-react";

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/student/dashboard");
      const json = await res.json();
      
      if (json.schedule) {
        // Transform the grouped schedule back into a flat course list with full schedules
        // so `ScheduleTimetable` can consume it natively just like the cart does.
        const courseMap = new Map();
        
        Object.entries(json.schedule).forEach(([day, slots]: [string, any]) => {
          slots.forEach((slot: any) => {
            if (!courseMap.has(slot.course_id)) {
              courseMap.set(slot.course_id, {
                course_id: slot.course_id,
                course_name: slot.course_name,
                department: slot.department,
                teacher_name: slot.teacher_name,
                schedule: []
              });
            }
            courseMap.get(slot.course_id).schedule.push({
              day: slot.day_of_week,
              start: slot.start_time,
              end: slot.end_time
            });
          });
        });

        setCourses(Array.from(courseMap.values()));
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
      
      {/* Header */}
      <div className="flex bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 rounded-3xl border border-primary/20 items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/25">
          <GraduationCap className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back. Here is your schedule for the current semester.</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Enrolled Courses</p>
            <p className="text-2xl font-bold">{courses.length}</p>
          </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Classes / Week</p>
            <p className="text-2xl font-bold">{courses.reduce((acc, c) => acc + c.schedule.length, 0)}</p>
          </div>
        </div>
      </div>

      {/* Timetable */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-md">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          My Weekly Class Schedule
        </h2>
        
        {courses.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-xl">
            <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="font-medium text-foreground">No courses enrolled yet</p>
            <p className="text-sm text-muted-foreground mt-1">Head over to Registration to build your timetable.</p>
          </div>
        ) : (
          <ScheduleTimetable courses={courses} />
        )}
      </div>

    </div>
  );
}
