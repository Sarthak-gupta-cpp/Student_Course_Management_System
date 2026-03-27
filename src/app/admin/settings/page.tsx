"use client";

import { useEffect, useState } from "react";
import { Loader2, Settings2, Save, CalendarClock, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    registration_start: "",
    registration_end: "",
    drop_start: "",
    drop_end: "",
  });
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const json = await res.json();
      if (json.settings) {
        // Form needs YYYY-MM-DDThh:mm format
        const formatForInput = (dateString: string) => {
          if (!dateString) return "";
          // The DB returns UTC, assuming we want local time in the input 
          // or at least valid formatting suitable for datetime-local
          try {
             const d = new Date(dateString);
             // shift back offset to render correctly in datetime-local
             const offset = d.getTimezoneOffset() * 60000;
             const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 16);
             return localISOTime;
          } catch(e) {
             return "";
          }
        };

        setSettings({
          registration_start: formatForInput(json.settings.registration_start),
          registration_end: formatForInput(json.settings.registration_end),
          drop_start: formatForInput(json.settings.drop_start),
          drop_end: formatForInput(json.settings.drop_end),
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // Send valid dates or empty strings
      const payload = {
         registration_start: settings.registration_start ? new Date(settings.registration_start).toISOString() : null,
         registration_end: settings.registration_end ? new Date(settings.registration_end).toISOString() : null,
         drop_start: settings.drop_start ? new Date(settings.drop_start).toISOString() : null,
         drop_end: settings.drop_end ? new Date(settings.drop_end).toISOString() : null,
      };

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: json.error || 'Failed to update settings' });
      } else {
        setMessage({ type: 'success', text: 'System settings updated globally.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setSaving(false);
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
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      
      <div className="flex items-center gap-4 mb-8 text-foreground">
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Settings2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">System Configuration</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage global registration and drop windows</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-card rounded-2xl border border-border shadow-sm p-6 md:p-8">
        
        {message && (
          <div className={cn(
            "p-4 rounded-xl mb-8 text-sm font-medium",
            message.type === 'error' ? "bg-red-500/10 text-red-600 border border-red-500/20" : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
          )}>
            {message.text}
          </div>
        )}

        <div className="space-y-8">
          {/* Registration Window */}
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <CalendarClock className="w-5 h-5 text-blue-500" />
              Registration Window
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-6 rounded-xl border border-border/50">
              <div>
                <label className="block text-sm font-medium mb-2">Opens At</label>
                <input 
                  type="datetime-local" 
                  value={settings.registration_start}
                  onChange={(e) => setSettings({...settings, registration_start: e.target.value})}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Closes At</label>
                <input 
                  type="datetime-local" 
                  value={settings.registration_end}
                  onChange={(e) => setSettings({...settings, registration_end: e.target.value})}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 px-1">During this window, students can see the "Enroll" button and build their timetable.</p>
          </div>

          <div className="h-px bg-border w-full" />

          {/* Drop Window */}
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-orange-500" />
              Drop Window
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-6 rounded-xl border border-border/50">
              <div>
                <label className="block text-sm font-medium mb-2">Opens At</label>
                <input 
                  type="datetime-local" 
                  value={settings.drop_start}
                  onChange={(e) => setSettings({...settings, drop_start: e.target.value})}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Closes At</label>
                <input 
                  type="datetime-local" 
                  value={settings.drop_end}
                  onChange={(e) => setSettings({...settings, drop_end: e.target.value})}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                />
              </div>
            </div>
             <p className="text-xs text-muted-foreground mt-2 px-1">During this window, enrolled students can drop classes and free up capacity.</p>
          </div>
        </div>

        <div className="mt-10 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Configuration
          </button>
        </div>

      </form>
    </div>
  );
}
