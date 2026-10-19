import { WorkspaceProvider } from "@/components/workspace";
import { AppNav } from "@/components/nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <div className="min-h-screen md:grid md:grid-cols-[236px_1fr]">
        <AppNav />
        <main className="rise min-w-0 px-4 pb-28 pt-6 sm:px-6 md:px-10 md:pt-10">{children}</main>
      </div>
    </WorkspaceProvider>
  );
}
