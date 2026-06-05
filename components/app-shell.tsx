import { requireUser } from "@/lib/auth";
import { AppShellChrome } from "@/components/app-shell-chrome";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <AppShellChrome user={{ full_name: user.full_name, email: user.email, role: user.role }}>
      {children}
    </AppShellChrome>
  );
}
