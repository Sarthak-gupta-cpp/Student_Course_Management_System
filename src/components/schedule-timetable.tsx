"use client";

import { useEffect, useState, useMemo } from "react";
import { Clock, MapPin, Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Slot {
  day: string;
  start: string;
  end: string;
}

interface Course {
  course_id: string;
  course_name: string;
  department: string;
  teacher_name: string;
  schedule: Slot[]; // from API
}

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const START_HOUR = 8;
const END_HOUR = 18;

export function ScheduleTimetable({ courses, className }: { courses: Course[], className?: string }) {
  // Convert times to CSS grid rows (1 hour = 2 rows = 30 min intervals)
  // Assuming slots strictly align to hours/half-hours like 08:00, 09:30
  
  const getGridRow = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    const rowHour = (h - START_HOUR) * 2;
    const rowMin = m >= 30 ? 1 : 0;
    return rowHour + rowMin + 2; // +2 offset for header row
  };

  const getGridCol = (day: string) => {
    return DAYS.indexOf(day) + 2; // +2 offset for time column
  };

  // Generate time labels
  const timeLabels = useMemo(() => {
    const labels = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      labels.push(`${h.toString().padStart(2, '0')}:00`);
    }
    return labels;
  }, []);

  const totalRows = (END_HOUR - START_HOUR + 1) * 2;

  return (
    <div className={cn("w-full overflow-x-auto bg-card rounded-2xl border border-border shadow-sm p-4", className)}>
      <div 
        className="timetable-grid min-w-[800px] text-sm" 
        style={{ '--slots': totalRows, gridTemplateColumns: `80px repeat(${DAYS.length}, 1fr)` } as any}
      >
        {/* Top-left empty corner */}
        <div className="border-b border-border p-2"></div>

        {/* Days Header */}
        {DAYS.map((day, i) => (
          <div key={day} className="text-center font-semibold text-muted-foreground p-3 border-b border-border bg-muted/20 rounded-t-lg mx-1">
            {day.charAt(0) + day.slice(1).toLowerCase()}
          </div>
        ))}

        {/* Timeline Column */}
        {timeLabels.map((time, i) => (
          <div 
            key={time} 
            className="text-right pr-4 text-xs font-medium text-muted-foreground border-r border-border"
            style={{ gridColumn: 1, gridRow: i * 2 + 2, marginTop: '-8px' }}
          >
            {time}
          </div>
        ))}

        {/* Horizontal background lines (optional, for aesthetics) */}
        {Array.from({ length: totalRows }).map((_, i) => (
          <div 
            key={`grid-line-${i}`}
            className="border-b border-border/40 pointer-events-none"
            style={{ 
              gridColumn: `2 / span ${DAYS.length}`, 
              gridRow: i + 2 
            }}
          />
        ))}

        {/* Actual Course Blocks */}
        {courses.map((course, courseIdx) => {
          // Colors sequence for differentiation
          const colors = [
            "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400",
            "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-400",
            "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
            "bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400",
            "bg-pink-500/10 border-pink-500/30 text-pink-700 dark:text-pink-400"
          ];
          const colorClass = colors[courseIdx % colors.length];

          // Safely map schedule if available (for preview "cart" rendering before saving)
          const validSchedule = Array.isArray(course.schedule) ? course.schedule : [];

          return validSchedule.map((slot, slotIdx) => {
            const rowStart = getGridRow(slot.start);
            const rowEnd = getGridRow(slot.end);
            const col = getGridCol(slot.day);

            if (col < 2) return null; // Ignore weekends or invalid days for now safely

            return (
              <div 
                key={`${course.course_id}-${slotIdx}`}
                className={cn(
                  "m-0.5 rounded-lg border p-2 flex flex-col gap-1 overflow-hidden transition-all hover:shadow-md hover:z-10 animate-in fade-in zoom-in duration-300",
                  colorClass
                )}
                style={{ 
                  gridRow: `${rowStart} / ${rowEnd}`,
                  gridColumn: col
                }}
              >
                <span className="font-bold text-xs truncate" title={course.course_id}>
                  {course.course_id}
                </span>
                <span className="text-[10px] font-medium leading-tight truncate opacity-90" title={course.course_name}>
                  {course.course_name}
                </span>
                <span className="mt-auto text-[10px] opacity-75 hidden sm:inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {slot.start.slice(0,5)} - {slot.end.slice(0,5)}
                </span>
              </div>
            );
          });
        })}
      </div>
    </div>
  );
}
