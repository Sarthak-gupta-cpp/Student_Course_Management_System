"use client";

import { useState, useEffect, useMemo } from "react";
import { ScheduleTimetable } from "@/components/schedule-timetable";
import { Loader2, Plus, Trash2, CalendarX2, AlertCircle, CheckCircle2, Calendar, MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RegistrationPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ courses: any[], systemSettings: any, semester: any } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<any[]>([]); // Courses to preview in schedule before enrolling
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [isEnrollingAll, setIsEnrollingAll] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  // Calculate generic clashes to disable enroll button
  const hasClashes = useMemo(() => {
    for (let i = 0; i < cart.length; i++) {
       for (let j = i + 1; j < cart.length; j++) {
          const valid1 = Array.isArray(cart[i].schedule) ? cart[i].schedule : [];
          const valid2 = Array.isArray(cart[j].schedule) ? cart[j].schedule : [];
          for (const s1 of valid1) {
             for (const s2 of valid2) {
                if (s1.day === s2.day) {
                   const [h1, m1] = s1.start.split(":").map(Number);
                   const [he1, me1] = s1.end.split(":").map(Number);
                   const [h2, m2] = s2.start.split(":").map(Number);
                   const [he2, me2] = s2.end.split(":").map(Number);
                   const start1 = h1 * 60 + m1;
                   const end1 = he1 * 60 + me1;
                   const start2 = h2 * 60 + m2;
                   const end2 = he2 * 60 + me2;
                   if (Math.max(start1, start2) < Math.min(end1, end2)) {
                       return true;
                   }
                }
             }
          }
       }
    }
    return false;
  }, [cart]);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/student/courses");
      const json = await res.json();
      // Convert slot formats back to display start/end times
      if (json.courses) {
        const mappedCourses = json.courses.map((c: any) => ({
          ...c,
          schedule: Array.isArray(c.schedule) ? c.schedule.map((s: any) => {
            if (!s.slot) return s; // skip if null
            const startHour = 8 + s.slot - 1;
            const endHour = startHour + s.duration - 1;
            return {
              ...s,
              start: `${startHour.toString().padStart(2, '0')}:00`,
              end: `${endHour.toString().padStart(2, '0')}:50`
            };
          }) : []
        }));
        
        setData({ ...json, courses: mappedCourses });

        const enrolled = mappedCourses.filter((c: any) => c.enrollment_status === 'ENROLLED');
        setCart(enrolled);
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to load courses' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCart = (course: any) => {
    // If course is already enrolled actually in DB, we shouldn't let them remove it from cart 
    // without actually calling drop API. The cart is meant to preview un-enrolled courses.
    if (course.enrollment_status === 'ENROLLED') return;

    setCart(prev => {
      const exists = prev.some(c => c.offering_id === course.offering_id);
      if (exists) {
        return prev.filter(c => c.offering_id !== course.offering_id);
      } else {
        return [...prev, course];
      }
    });
    // Clear any previous error messages when tweaking cart
    setMessage(null);
  };

  const handleEnrollAll = async () => {
    setIsEnrollingAll(true);
    setMessage(null);
    const unEnrolled = cart.filter(c => c.enrollment_status !== 'ENROLLED');
    let successCount = 0;
    let failCount = 0;

    for (const course of unEnrolled) {
      try {
        const res = await fetch("/api/student/enroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offeringId: course.offering_id })
        });
        if (res.ok) successCount++;
        else failCount++;
      } catch (err) {
        failCount++;
      }
    }
    
    if (failCount > 0) {
      setMessage({ type: 'error', text: `Enrolled in ${successCount} courses. ${failCount} failed (clashes or full).` });
    } else {
      setMessage({ type: 'success', text: `Successfully enrolled in all ${successCount} courses!` });
    }
    await fetchCourses();
    setIsEnrollingAll(false);
  };

  const handleDrop = async (course: any) => {
    if (!confirm(`Are you sure you want to drop ${course.course_id}?`)) return;
    
    setEnrolling(course.offering_id);
    setMessage(null);

    try {
      const res = await fetch("/api/student/drop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offeringId: course.offering_id })
      });

      const json = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: json.error || 'Drop failed' });
      } else {
        setMessage({ type: 'success', text: `Successfully dropped ${course.course_id}.` });
        await fetchCourses();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setEnrolling(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.semester) {
    return (
      <div className="text-center py-20">
        <CalendarX2 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h2 className="text-2xl font-semibold">No Active Semester</h2>
        <p className="text-muted-foreground mt-2">Registration is currently unavailable.</p>
      </div>
    );
  }

  // Check Registration Window
  const now = new Date();
  const start = data.systemSettings?.registration_start ? new Date(data.systemSettings.registration_start) : null;
  const end = data.systemSettings?.registration_end ? new Date(data.systemSettings.registration_end) : null;
  const isRegOpen = start && end && now >= start && now <= end;

  // Check Drop Window
  const dropStart = data.systemSettings?.drop_start ? new Date(data.systemSettings.drop_start) : null;
  const dropEnd = data.systemSettings?.drop_end ? new Date(data.systemSettings.drop_end) : null;
  const isDropOpen = dropStart && dropEnd && now >= dropStart && now <= dropEnd;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header & Status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Registration</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            {data.semester.name} Semester
          </p>
        </div>
        <div className="flex gap-4 text-sm font-medium">
          <div className={cn("px-4 py-2 rounded-xl flex items-center gap-2 border", isRegOpen ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 border-destructive/20 text-destructive")}>
            <div className={cn("w-2 h-2 rounded-full", isRegOpen ? "bg-emerald-500 animate-pulse" : "bg-destructive")} />
            Registration: {isRegOpen ? "Open" : "Closed"}
          </div>
          <div className={cn("px-4 py-2 rounded-xl flex items-center gap-2 border", isDropOpen ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground")}>
            Drop Window: {isDropOpen ? "Open" : "Closed"}
          </div>
        </div>
      </div>

      {message && (
        <div className={cn(
          "p-4 rounded-xl border flex items-center gap-3 animate-in slide-in-from-top-2",
          message.type === 'error' ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
        )}>
          {message.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
          <p className="font-medium text-sm">{message.text}</p>
        </div>
      )}

      {/* Main Registration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Course List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Available Courses</h2>
            <span className="text-xs font-semibold bg-muted px-2 py-1 rounded-md text-muted-foreground">
              {data.courses.length} / {cart.length} in cart
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search courses by ID, name..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
            />
          </div>
          
          <div className="space-y-3 max-h-[800px] overflow-y-auto pr-2 scrollbar-thin">
            {data.courses
              .filter(course => 
                course.course_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                course.course_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                course.teacher_name.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map(course => {
              const isEnrolled = course.enrollment_status === 'ENROLLED';
              const isInCart = cart.some(c => c.offering_id === course.offering_id);
              const isFull = course.current_enrolled >= course.max_capacity;

              return (
                <div 
                  key={course.offering_id}
                  className={cn(
                    "p-4 rounded-xl border transition-all duration-200",
                    isEnrolled ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-card hover:border-border/80 shadow-sm",
                    isInCart && !isEnrolled && "border-primary shadow-md shadow-primary/5 ring-1 ring-primary/20"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-foreground">{course.course_id}</h3>
                      <p className="text-sm font-medium text-muted-foreground leading-tight">{course.course_name}</p>
                    </div>
                    <span className="text-xs font-bold bg-secondary text-secondary-foreground px-2 py-1 rounded-md">
                      {course.credits} Cr
                    </span>
                  </div>
                  
                  <div className="mt-3 text-xs text-muted-foreground space-y-1 bg-muted/30 p-2 rounded-lg">
                    <p>Prof. {course.teacher_name}</p>
                    <p className={cn(
                      "font-semibold",
                      isFull && !isEnrolled ? "text-destructive" : ""
                    )}>
                      Capacity: {course.current_enrolled} / {course.max_capacity}
                    </p>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {/* Cart Preview Toggle */}
                    {!isEnrolled && (
                      <button
                        onClick={() => handleToggleCart(course)}
                        className={cn(
                          "flex-1 text-xs font-medium px-3 py-2 rounded-lg transition-colors border",
                          isInCart 
                            ? "bg-secondary border-transparent text-foreground hover:bg-secondary/80"
                            : "bg-primary border-transparent text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20"
                        )}
                      >
                        {isInCart ? "Remove from Cart" : "Add to Cart"}
                      </button>
                    )}

                    {/* Quick Call to Action actions */}
                    {isEnrolled && (
                      <button
                        onClick={() => handleDrop(course)}
                        disabled={!isDropOpen || enrolling === course.offering_id}
                        className="flex-1 flex items-center justify-center gap-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold px-3 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        {enrolling === course.offering_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Drop
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Dynamic Timetable Preview */}
        <div className="lg:col-span-8 space-y-4 sticky top-24">
          <div className="bg-card p-6 rounded-2xl border border-border shadow-xl shadow-black/5">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Cart Timetable Preview
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Visually check for time clashes before enrolling. Existing enrollments are locked in.
                </p>
              </div>
            </div>

            {cart.length === 0 ? (
              <div className="h-64 border-2 border-dashed border-border rounded-xl flex items-center justify-center text-muted-foreground text-sm flex-col gap-2">
                <MapPin className="w-8 h-8 opacity-20" />
                Select "Preview in Cart" to build your schedule
              </div>
            ) : (
              <ScheduleTimetable courses={cart} />
            )}
            
            {/* Cart summary action */}
            {cart.filter(c => c.enrollment_status !== 'ENROLLED').length > 0 && (
              <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                <div>
                  <span className="text-sm font-medium">Ready to confirm un-enrolled courses?</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {hasClashes 
                      ? <span className="text-red-500 font-bold flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3"/>Please resolve schedule clashes before enrolling.</span>
                      : "Review your schedule before confirming."}
                  </p>
                </div>
                <button
                  onClick={handleEnrollAll}
                  disabled={!isRegOpen || isEnrollingAll || hasClashes}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEnrollingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {hasClashes ? "Resolve Clashes First" : "Enroll All"}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
