import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";

export default async function Home() {
  const session = await auth();

  // Route protection rules apply in middleware too, but here we provide automatic redirection
  // based on role upon visiting the root url 'localhost:3000/'
  
  if (!session || !session.user) {
    redirect("/auth/signin");
  }

  const role = session.user.role;

  if (role === "STUDENT") {
    redirect("/student/dashboard");
  } else if (role === "TEACHER") {
    redirect("/teacher/dashboard");
  } else if (role === "ADMIN") {
    redirect("/admin/dashboard");
  } else if (role === "PENDING_ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center -mt-16 text-center">
        <div className="bg-card p-8 rounded-2xl border border-border shadow-xl max-w-md w-full">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Awaiting Approval</h1>
          <p className="text-muted-foreground text-sm">
            Your account is currently in a <strong>PENDING_ADMIN</strong> state. 
            An existing administrator must review and approve your account before you can access the system.
          </p>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen flex items-center justify-center text-center">
      <p>Unknown Role Detected. Please contact support.</p>
    </div>
  );
}
