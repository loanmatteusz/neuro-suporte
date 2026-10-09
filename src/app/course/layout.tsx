import { SiteFooter } from "@/components/brand/site-footer";
import { CourseHeader } from "@/components/course/course-header";
import { getSiteSettings } from "@/data/settings";
import { requireUser } from "@/lib/session";

export default async function CourseLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([requireUser(), getSiteSettings()]);
  return (
    <div className="flex min-h-dvh flex-col">
      <CourseHeader userName={user.name} isAdmin={user.role === "admin"} />
      <div className="flex-1">{children}</div>
      <SiteFooter psychologistName={settings.psychologistName} crp={settings.crp} />
    </div>
  );
}
