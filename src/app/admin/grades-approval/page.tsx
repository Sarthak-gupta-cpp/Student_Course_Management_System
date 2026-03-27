"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckSquare, VerifiedIcon } from "lucide-react";

export default function AdminGradesApproval() {
  const [loading, setLoading] = useState(true);
  const [offerings, setOfferings] = useState<any[]>([]);
  const [approving, setApproving] = useState<number | null>(null);

  useEffect(() => {
    fetchPendingOfferings();
  }, []);

  const fetchPendingOfferings = async () => {
    try {
      const res = await fetch("/api/admin/grades-approval");
      const json = await res.json();
      if (json.pendingOfferings) setOfferings(json.pendingOfferings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (offeringId: number) => {
    if (!confirm("Are you sure? This will officially release grades to all enrolled students for this course.")) return;

    setApproving(offeringId);
    try {
      const res = await fetch("/api/admin/grades-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offeringId })
      });
      
      const json = await res.json();
      if (res.ok) {
        // Remove approved offering from the list
        setOfferings(offerings.filter(o => o.offering_id !== offeringId));
      } else {
        alert(json.error || "Failed to release grades");
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setApproving(null);
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
      
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
          <CheckSquare className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Grades Approval</h1>
          <p className="text-sm text-muted-foreground mt-1">Review finalized teacher grading submissions and release them to students.</p>
        </div>
      </div>

      {offerings.length === 0 ? (
        <div className="bg-card p-12 text-center rounded-2xl border border-border shadow-sm">
          <VerifiedIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-30" />
          <h2 className="text-xl font-semibold mb-2">All Caught Up!</h2>
          <p className="text-muted-foreground text-sm">There are no pending grade submissions waiting for your approval.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {offerings.map((offering) => (
            <div key={offering.offering_id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col md:flex-row">
              
              {/* Left side: Course Info */}
              <div className="p-6 md:p-8 md:w-1/3 bg-muted/20 border-b md:border-b-0 md:border-r border-border flex flex-col justify-between">
                <div>
                  <h2 className="text-3xl font-black text-foreground tracking-tight">{offering.course_id}</h2>
                  <p className="text-sm font-medium text-muted-foreground mt-1">{offering.course_name}</p>
                </div>
                <div className="mt-6 md:mt-0 pt-6">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Submitted By</p>
                  <p className="font-medium">Prof. {offering.teacher_name}</p>
                </div>
              </div>

              {/* Right side: Grading Stats & Actions */}
              <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-4">Grade Distribution Summary</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    {/* Basic stat summarization (normally computed on backend) */}
                    <div className="bg-muted/40 p-3 rounded-xl border border-border/50 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Total Graded</p>
                      <p className="text-2xl font-bold">{offering.students.length}</p>
                    </div>
                  </div>
                  
                  <details className="group">
                    <summary className="text-sm font-medium text-primary cursor-pointer hover:underline select-none">
                      View Individual Student Grades
                    </summary>
                    <div className="mt-4 max-h-48 overflow-y-auto bg-muted/20 p-4 rounded-xl border border-border text-sm space-y-2">
                      {offering.students.map((s: any) => (
                        <div key={s.enrollment_id} className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
                          <span className="text-muted-foreground">{s.student_name}</span>
                          <span className="font-bold">{s.grade}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>

                <div className="mt-8 pt-6 border-t border-border flex justify-end">
                  <button
                    onClick={() => handleApprove(offering.offering_id)}
                    disabled={approving === offering.offering_id}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 transition-all disabled:opacity-50"
                  >
                    {approving === offering.offering_id ? <Loader2 className="w-5 h-5 animate-spin" /> : <VerifiedIcon className="w-5 h-5" />}
                    Approve & Release Grades
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}
