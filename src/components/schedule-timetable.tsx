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

  const processedSlots = useMemo(() => {
    const rawSlots: {slot: any, course: any, colorClass: string}[] = [];
    const colors = [
      "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400",
      "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-400",
      "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
      "bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400",
      "bg-pink-500/10 border-pink-500/30 text-pink-700 dark:text-pink-400"
    ];
    
    courses.forEach((course, courseIdx) => {
       const validSchedule = Array.isArray(course.schedule) ? course.schedule : [];
       validSchedule.forEach(slot => {
         rawSlots.push({ slot, course, colorClass: colors[courseIdx % colors.length] });
       });
    });

    const mergedSlots: any[] = [];
    const byDay: Record<string, typeof rawSlots> = {};
    
    rawSlots.forEach(rs => {
      byDay[rs.slot.day] = byDay[rs.slot.day] || [];
      byDay[rs.slot.day].push(rs);
    });

    for (const day of Object.keys(byDay)) {
       const daySlots = byDay[day];
       daySlots.sort((a, b) => {
          const startA = a.slot.start.localeCompare(b.slot.start);
          if (startA !== 0) return startA;
          return a.slot.end.localeCompare(b.slot.end);
       });

       let currentGroup = [daySlots[0]];
       
       for (let i = 1; i < daySlots.length; i++) {
          const current = daySlots[i];
          
          const groupEnd = Math.max(...currentGroup.map(g => {
            const [h, m] = g.slot.end.split(":").map(Number); 
            return h * 60 + m;
          }));
          
          const [ch, cm] = current.slot.start.split(":").map(Number);
          const currentStart = ch * 60 + cm;

          if (currentStart < groupEnd) {
             currentGroup.push(current);
          } else {
             mergedSlots.push({ isClashing: currentGroup.length > 1, group: currentGroup });
             currentGroup = [current];
          }
       }
       if (currentGroup.length > 0) {
          mergedSlots.push({ isClashing: currentGroup.length > 1, group: currentGroup });
       }
    }

    return mergedSlots.map(merged => {
       if (!merged.isClashing) {
          return {
             isClashing: false,
             slot: merged.group[0].slot,
             course: merged.group[0].course,
             colorClass: merged.group[0].colorClass
          };
       } else {
          const allNames = Array.from(new Set(merged.group.map((g: any) => g.course.course_id))).join(" & ");
          let minStartStr = "23:59";
          let maxEndStr = "00:00";
          merged.group.forEach((g: any) => {
             if (g.slot.start.localeCompare(minStartStr) < 0) minStartStr = g.slot.start;
             if (g.slot.end.localeCompare(maxEndStr) > 0) maxEndStr = g.slot.end;
          });

          return {
             isClashing: true,
             slot: { day: merged.group[0].slot.day, start: minStartStr, end: maxEndStr },
             course: { course_id: "CLASH", course_name: allNames },
             colorClass: ""
          };
       }
    });
  }, [courses]);

  const totalRows = (END_HOUR - START_HOUR + 1) * 2;

  return (
    <div className={cn("w-full overflow-x-auto bg-card rounded-2xl border border-border shadow-sm p-4", className)}>
      <div 
        className="timetable-grid min-w-[500px] md:min-w-[600px] text-sm" 
        style={{ '--slots': totalRows, gridTemplateColumns: `60px repeat(${DAYS.length}, 1fr)` } as any}
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
            className="text-right pr-2 md:pr-4 text-[10px] md:text-[11px] font-medium text-muted-foreground border-r border-border"
            style={{ gridColumn: 1, gridRow: i * 2 + 2, marginTop: '-6px' }}
          >
            {time}
          </div>
        ))}

        {/* Horizontal background lines (optional, for aesthetics) */}
        {Array.from({ length: totalRows }).map((_, i) => (
          <div 
            key={`grid-line-${i}`}
            className="border-b border-border/40 pointer-events-none min-h-[22px] md:min-h-[26px]"
            style={{ 
              gridColumn: `2 / span ${DAYS.length}`, 
              gridRow: i + 2 
            }}
          />
        ))}

        {/* Actual Course Blocks */}
        {processedSlots.map((item, idx) => {
          const { slot, course, isClashing, colorClass } = item;
          const rowStart = getGridRow(slot.start);
          const rowEnd = getGridRow(slot.end);
          const col = getGridCol(slot.day);

          if (col < 2) return null; // Ignore weekends or invalid days for now safely

          const clashStyle = isClashing 
            ? "bg-red-500/20 border-red-500/60 text-red-700 dark:text-red-400 dark:bg-red-500/20 ring-2 ring-red-500/50 shadow-lg shadow-red-500/20 font-bold z-20" 
            : colorClass;

          return (
            <div 
              key={`slot-${idx}`}
              className={cn(
                "m-0.5 rounded-md border py-1 px-1.5 flex flex-col gap-0 md:gap-0.5 overflow-hidden transition-all hover:shadow-md hover:z-30 animate-in fade-in zoom-in duration-300 leading-tight",
                clashStyle
              )}
              style={{ 
                gridRow: `${rowStart} / ${rowEnd}`,
                gridColumn: col
              }}
            >
              <span className="font-bold text-[9px] md:text-[11px] truncate" title={course.course_id}>
                {course.course_id}
              </span>
              <span className="text-[8px] md:text-[9.5px] font-semibold truncate opacity-[0.85]" title={course.course_name}>
                {course.course_name}
              </span>
              <span className="mt-auto text-[8px] md:text-[9px] opacity-75 hidden sm:inline-flex items-center gap-0.5 font-medium">
                <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" />
                {slot.start.slice(0,5)} - {slot.end.slice(0,5)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
