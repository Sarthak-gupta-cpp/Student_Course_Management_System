"use client";

import { useEffect, useState } from "react";
import { Loader2, BookOpenText, Plus, Users, Calendar, MapPin, Database } from "lucide-react";

// Helper components for tabs
function TabButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-all border-b-2 ${
        active 
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

export default function AdminCourses() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses'); // courses, semesters, offerings
  
  const [courses, setCourses] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [offerings, setOfferings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]); // For assigning teachers

  // Create forms state
  const [newCourse, setNewCourse] = useState({ course_id: '', course_name: '', credits: 3, department: '' });
  const [newSemester, setNewSemester] = useState({ name: '', is_current: false, start_date: '', end_date: '' });
  
  const DEFAULT_OFFERING = { course_id: '', semester_id: '', teacher_id: '', max_capacity: 60, time_slots: [] };
  const [newOffering, setNewOffering] = useState<any>(DEFAULT_OFFERING);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'courses') {
        const res = await fetch("/api/admin/courses");
        const json = await res.json();
        if (json.courses) setCourses(json.courses);
      } else if (activeTab === 'semesters') {
        const res = await fetch("/api/admin/semesters");
        const json = await res.json();
        if (json.semesters) setSemesters(json.semesters);
      } else if (activeTab === 'offerings') {
        // Need to fetch courses, semesters, and teachers for the dropdowns
        const [offRes, crsRes, semRes, usrRes] = await Promise.all([
          fetch("/api/admin/offerings"),
          fetch("/api/admin/courses"),
          fetch("/api/admin/semesters"),
          fetch("/api/admin/users")
        ]);
        
        const offJson = await offRes.json();
        const crsJson = await crsRes.json();
        const semJson = await semRes.json();
        const usrJson = await usrRes.json();

        if (offJson.offerings) setOfferings(offJson.offerings);
        if (crsJson.courses) setCourses(crsJson.courses);
        if (semJson.semesters) setSemesters(semJson.semesters);
        
        // Filter out only teachers
        if (usrJson.users) {
          setUsers(usrJson.users.filter((u: any) => u.role === 'TEACHER' || u.role === 'ADMIN'));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCourse)
      });
      const json = await res.json();
      if (res.ok) {
        alert("Course created!");
        setNewCourse({ course_id: '', course_name: '', credits: 3, department: '' });
        fetchData();
      } else alert(json.error);
    } catch (err) { alert("Error"); }
  };

  const handleCreateSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/semesters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSemester)
      });
      const json = await res.json();
      if (res.ok) {
        alert("Semester created!");
        setNewSemester({ name: '', is_current: false, start_date: '', end_date: '' });
        fetchData();
      } else alert(json.error);
    } catch (err) { alert("Error"); }
  };

  const handleCreateOffering = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate time slots
    if (newOffering.time_slots.length === 0) {
      alert("Please add at least one time slot.");
      return;
    }

    try {
      const res = await fetch("/api/admin/offerings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOffering)
      });
      const json = await res.json();
      if (res.ok) {
        alert("Course Offering created successfully!");
        setNewOffering(DEFAULT_OFFERING);
        fetchData();
      } else alert(json.error);
    } catch (err) { alert("Error"); }
  };

  const addTimeSlot = () => {
    setNewOffering({
      ...newOffering,
      time_slots: [...newOffering.time_slots, { day: 'MONDAY', start: '08:00', end: '09:00' }]
    });
  };

  const updateTimeSlot = (index: number, field: string, value: string) => {
    const slots = [...newOffering.time_slots];
    slots[index][field] = value;
    setNewOffering({ ...newOffering, time_slots: slots });
  };

  const removeTimeSlot = (index: number) => {
    const slots = [...newOffering.time_slots];
    slots.splice(index, 1);
    setNewOffering({ ...newOffering, time_slots: slots });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
      
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold border-b-0 pb-0">Curriculum Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage global courses, semesters, and map them to offerings.</p>
        </div>
      </div>

      <div className="flex border-b border-border mb-6">
        <TabButton active={activeTab === 'courses'} onClick={() => setActiveTab('courses')} icon={BookOpenText} label="Courses Dictionary" />
        <TabButton active={activeTab === 'semesters'} onClick={() => setActiveTab('semesters')} icon={Calendar} label="Semesters" />
        <TabButton active={activeTab === 'offerings'} onClick={() => setActiveTab('offerings')} icon={MapPin} label="Course Offerings" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card p-6 md:p-8 rounded-2xl border border-border shadow-sm">
          
          {/* COURSES TAB */}
          {activeTab === 'courses' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 border-r border-border pr-6">
                <h3 className="font-bold mb-4">Add New Course</h3>
                <form onSubmit={handleCreateCourse} className="space-y-4">
                  <div><label className="text-xs font-semibold mb-1 block">Course ID (e.g. CS F211)</label>
                  <input required value={newCourse.course_id} onChange={e=>setNewCourse({...newCourse, course_id: e.target.value})} className="w-full border rounded-lg p-2 text-sm" /></div>
                  <div><label className="text-xs font-semibold mb-1 block">Course Name</label>
                  <input required value={newCourse.course_name} onChange={e=>setNewCourse({...newCourse, course_name: e.target.value})} className="w-full border rounded-lg p-2 text-sm" /></div>
                  <div><label className="text-xs font-semibold mb-1 block">Department</label>
                  <input required value={newCourse.department} onChange={e=>setNewCourse({...newCourse, department: e.target.value})} className="w-full border rounded-lg p-2 text-sm" /></div>
                  <div><label className="text-xs font-semibold mb-1 block">Credits</label>
                  <input type="number" min="1" max="10" required value={newCourse.credits} onChange={e=>setNewCourse({...newCourse, credits: Number(e.target.value)})} className="w-full border rounded-lg p-2 text-sm" /></div>
                  <button type="submit" className="w-full bg-primary text-white py-2 rounded-lg font-semibold flex justify-center gap-2 items-center hover:bg-primary/90"><Plus className="w-4 h-4" /> Create Course</button>
                </form>
              </div>
              <div className="lg:col-span-2">
                <h3 className="font-bold mb-4">Existing Courses</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {courses.map(c => (
                     <div key={c.course_id} className="p-4 border rounded-xl bg-muted/20">
                       <p className="font-bold text-lg">{c.course_id}</p>
                       <p className="text-sm font-medium mb-2">{c.course_name}</p>
                       <div className="flex justify-between items-center text-xs text-muted-foreground uppercase font-semibold">
                         <span>{c.department}</span>
                         <span className="bg-primary/10 text-primary px-2 py-1 rounded">{c.credits} CR</span>
                       </div>
                     </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SEMESTERS TAB */}
          {activeTab === 'semesters' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 border-r border-border pr-6">
                <h3 className="font-bold mb-4">Add New Semester</h3>
                <form onSubmit={handleCreateSemester} className="space-y-4">
                  <div><label className="text-xs font-semibold mb-1 block">Name (e.g. 2025 Spring)</label>
                  <input required value={newSemester.name} onChange={e=>setNewSemester({...newSemester, name: e.target.value})} className="w-full border rounded-lg p-2 text-sm" /></div>
                  <div><label className="text-xs font-semibold mb-1 block">Is Current Active Semester?</label>
                  <input type="checkbox" checked={newSemester.is_current} onChange={e=>setNewSemester({...newSemester, is_current: e.target.checked})} className="w-4 h-4" /></div>
                  <button type="submit" className="w-full bg-primary text-white py-2 rounded-lg font-semibold flex justify-center gap-2 items-center hover:bg-primary/90"><Plus className="w-4 h-4" /> Create Semester</button>
                </form>
              </div>
              <div className="lg:col-span-2">
                <h3 className="font-bold mb-4">Existing Semesters</h3>
                <div className="space-y-4">
                  {semesters.map(s => (
                     <div key={s.semester_id} className={`p-4 border rounded-xl flex justify-between items-center ${s.is_current ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-muted/20'}`}>
                       <p className="font-bold">{s.name}</p>
                       {s.is_current && <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest px-3 py-1 bg-emerald-500/20 rounded-full">Active</span>}
                     </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* OFFERINGS TAB */}
          {activeTab === 'offerings' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 border-r border-border pr-6">
                <h3 className="font-bold mb-4">Create Offering</h3>
                <form onSubmit={handleCreateOffering} className="space-y-4">
                  
                  <div><label className="text-xs font-semibold mb-1 block">Semester</label>
                  <select required value={newOffering.semester_id} onChange={e=>setNewOffering({...newOffering, semester_id: e.target.value})} className="w-full border rounded-lg p-2 text-sm">
                    <option value="">Select Semester...</option>
                    {semesters.map(s=><option key={s.semester_id} value={s.semester_id}>{s.name} {s.is_current ? '(Active)' : ''}</option>)}
                  </select></div>

                  <div><label className="text-xs font-semibold mb-1 block">Course</label>
                  <select required value={newOffering.course_id} onChange={e=>setNewOffering({...newOffering, course_id: e.target.value})} className="w-full border rounded-lg p-2 text-sm">
                    <option value="">Select Course...</option>
                    {courses.map(c=><option key={c.course_id} value={c.course_id}>{c.course_id} - {c.course_name}</option>)}
                  </select></div>

                  <div><label className="text-xs font-semibold mb-1 block">Assign Teacher</label>
                  <select required value={newOffering.teacher_id} onChange={e=>setNewOffering({...newOffering, teacher_id: e.target.value})} className="w-full border rounded-lg p-2 text-sm">
                    <option value="">Select Teacher...</option>
                    {users.map(u=><option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                  </select></div>

                  <div><label className="text-xs font-semibold mb-1 block">Max Capacity</label>
                  <input type="number" min="1" required value={newOffering.max_capacity} onChange={e=>setNewOffering({...newOffering, max_capacity: Number(e.target.value)})} className="w-full border rounded-lg p-2 text-sm" /></div>

                  {/* Dynamic Time Slots */}
                  <div className="bg-muted/10 p-4 rounded-xl border">
                    <div className="flex justify-between items-center mb-2">
                       <label className="text-xs font-bold uppercase tracking-wider">Time Slots</label>
                       <button type="button" onClick={addTimeSlot} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-semibold">+ Add Slot</button>
                    </div>
                    {newOffering.time_slots.map((slot: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-4 gap-2 mb-2 bg-background p-2 rounded border shadow-sm items-center">
                        <select className="col-span-4 border rounded p-1 text-xs" value={slot.day} onChange={e=>updateTimeSlot(idx, 'day', e.target.value)}>
                          <option value="MONDAY">Mon</option><option value="TUESDAY">Tue</option><option value="WEDNESDAY">Wed</option>
                          <option value="THURSDAY">Thu</option><option value="FRIDAY">Fri</option>
                        </select>
                        <input type="time" required className="col-span-2 border rounded p-1 text-xs" value={slot.start} onChange={e=>updateTimeSlot(idx, 'start', e.target.value)} />
                        <input type="time" required className="col-span-2 border rounded p-1 text-xs" value={slot.end} onChange={e=>updateTimeSlot(idx, 'end', e.target.value)} />
                        <button type="button" onClick={()=>removeTimeSlot(idx)} className="col-span-4 text-[10px] text-destructive uppercase tracking-widest font-bold mt-1">Remove</button>
                      </div>
                    ))}
                    {newOffering.time_slots.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No time slots added. Students will need this for clash detection.</p>}
                  </div>

                  <button type="submit" className="w-full bg-primary text-white py-2 rounded-lg font-semibold flex justify-center gap-2 items-center hover:bg-primary/90"><Plus className="w-4 h-4" /> Publish Offering</button>
                </form>
              </div>
              <div className="lg:col-span-2">
                <h3 className="font-bold mb-4">Existing Course Offerings</h3>
                <div className="space-y-4">
                  {offerings.map(o => (
                     <div key={o.offering_id} className="p-4 border border-border/50 shadow-sm rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center bg-card">
                       <div>
                         <p className="font-bold text-lg text-primary">{o.course_id} <span className="text-sm font-medium text-muted-foreground">| {o.semester_name}</span></p>
                         <p className="text-sm font-medium">{o.course_name}</p>
                         <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3"/> Prof. {o.teacher_name}</span>
                            <span className="font-semibold px-2 bg-muted rounded">Cap: {o.current_enrolled}/{o.max_capacity}</span>
                         </div>
                       </div>
                       <div className="mt-4 md:mt-0 bg-muted/30 p-3 rounded-lg border border-border/50 text-xs space-y-1 min-w-[150px]">
                         <p className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground mb-2 border-b pb-1">Schedule</p>
                         {o.time_slots && Array.isArray(o.time_slots) && o.time_slots.length > 0 ? (
                           o.time_slots.map((ts: any) => (
                             <p key={ts.id}>{ts.day.slice(0,3)}: {ts.start.slice(0,5)} - {ts.end.slice(0,5)}</p>
                           ))
                         ) : <p className="italic text-muted-foreground">No schedule.</p>}
                       </div>
                     </div>
                  ))}
                  {offerings.length === 0 && <p className="text-muted-foreground">No offerings created yet.</p>}
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
