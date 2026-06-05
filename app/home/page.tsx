import { requireUser } from "@/lib/auth";
import { HomeLanding } from "@/components/home-landing";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireUser();

  return (
    <HomeLanding
      user={{
        name: user.full_name || user.name || user.email,
        email: user.email,
        role: user.role
      }}
    />
  );
}
