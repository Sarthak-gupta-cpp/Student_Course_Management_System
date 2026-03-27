"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft, Save, Send, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TeacherGrading({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [isLocked, setIsLocked] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch(`/api/teacher/offerings/${resolvedParams.id}/students`);
        const json = await res.json();
        if (json.students) {
          setStudents(json.students);
          
          const initialGrades: Record<string, string> = {};
          let locked = false;
          json.students.forEach((s: any) => {
            initialGrades[s.enrollment_id] = s.grade || "";
            if (s.grade_submitted_to_admin) locked = true;
          });
          setGrades(initialGrades);
          setIsLocked(locked);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [resolvedParams.id]);

  const handleSave = async (action: 'DRAFT' | 'SUBMIT') => {
    if (action === 'SUBMIT') {
      if (!confirm("Are you sure? Once submitted to Admin, you cannot edit these grades anymore. Ensure all students have a grade.")) return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/teacher/offerings/${resolvedParams.id}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grades, action })
      });

      const json = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: json.error || 'Failed to save grades' });
      } else {
        setMessage({ type: 'success', text: json.message });
        if (action === 'SUBMIT') setIsLocked(true);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setSaving(false);
    }
  };

  const VALID_GRADES = ["A", "A-", "B", "B-", "C", "C-", "D", "E", "NC", ""];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Link href="/teacher/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="bg-card p-6 md:p-8 rounded-2xl border border-border shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">Grading Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-sm">Input grades for this course offering.</p>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={() => handleSave('DRAFT')}
              disabled={isLocked || saving}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> Save Draft
            </button>
            <button
              onClick={() => handleSave('SUBMIT')}
              disabled={isLocked || saving}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Finally
            </button>
          </div>
        </div>

        {message && (
          <div className={cn(
            "p-4 rounded-xl mb-6 text-sm font-medium flex items-center gap-2",
            message.type === 'error' ? "bg-red-500/10 text-red-600 border border-red-500/20" : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
          )}>
            {message.type === 'error' && <AlertTriangle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        {isLocked && (
          <div className="p-4 rounded-xl mb-6 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm font-medium flex items-center gap-3">
             <AlertTriangle className="w-5 h-5" />
             Grades have been submitted to the Administration and are locked from further editing.
          </div>
        )}
        
        {students.length === 0 ? (
           <p className="text-muted-foreground py-10 text-center border border-dashed rounded-xl">No students to grade.</p>
        ) : (
          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">Student Name</th>
                  <th className="px-6 py-4 font-semibold">Email</th>
                  <th className="px-6 py-4 font-semibold w-1/4">Grade Input</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((s) => (
                  <tr key={s.enrollment_id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-foreground">
                      {s.student_name}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{s.student_email}</td>
                    <td className="px-6 py-3">
                      <select
                        value={grades[s.enrollment_id] || ""}
                        onChange={(e) => setGrades({ ...grades, [s.enrollment_id]: e.target.value })}
                        disabled={isLocked}
                        className="w-full bg-background border border-border text-foreground text-sm rounded-lg focus:ring-primary focus:border-primary block p-2.5 disabled:opacity-50 appearance-none"
                      >
                        <option value="">Select Grade</option>
                        {VALID_GRADES.filter(g=>g).map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
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
