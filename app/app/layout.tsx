import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/db/current-business";
import { Sidebar } from "@/components/layout/sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const business = await getCurrentBusiness();

  if (!business) {
    return (
      <main className="flex min-h-svh items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-2">
          <h1 className="text-xl font-semibold">No business linked</h1>
          <p className="text-sm text-muted-foreground">
            Your account is signed in, but it isn&apos;t a member of any
            business yet. Ask an admin to add you to one, or run the dev seed in{" "}
            <code>supabase/seed.sql</code>.
          </p>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-sm font-medium underline underline-offset-4"
            >
              Sign out
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="flex h-svh overflow-hidden print:h-auto print:overflow-visible">
      <aside className="hidden h-svh w-60 shrink-0 flex-col border-r bg-background md:flex print:hidden">
        <Sidebar businessName={business.name} />
        <UserMenu email={user.email ?? ""} />
      </aside>
      <main className="relative flex flex-1 flex-col overflow-hidden print:overflow-visible">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[url('/bg-studio.webp')] bg-cover bg-center bg-no-repeat opacity-[0.05] dark:opacity-[0.05] print:hidden"
        />
        <div className="absolute right-6 top-6 z-20 print:hidden">
          <ThemeToggle />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-6 pr-16 sm:pr-20 print:overflow-visible">
          {children}
        </div>
      </main>
    </div>
  );
}
