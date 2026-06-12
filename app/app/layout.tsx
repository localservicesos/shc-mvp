import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/db/current-business";
import { Sidebar } from "@/components/layout/sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { MobileHeader } from "@/components/layout/mobile-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { FlashToast } from "@/components/flash-toast";

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
    <div className="flex h-svh flex-col overflow-hidden md:flex-row print:h-auto print:overflow-visible">
      <MobileHeader businessName={business.name} email={user.email ?? ""} />
      <aside className="hidden h-svh w-48 shrink-0 flex-col border-r bg-background md:flex xl:w-60 print:hidden">
        <Sidebar businessName={business.name} />
        <UserMenu email={user.email ?? ""} />
      </aside>
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden print:overflow-visible">
        <Suspense fallback={null}>
          <FlashToast />
        </Suspense>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[url('/bg-studio.webp')] bg-cover bg-center bg-no-repeat opacity-[0.05] dark:opacity-[0.05] print:hidden"
        />
        <div className="absolute right-6 top-6 z-20 hidden xl:block print:hidden">
          <ThemeToggle />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 xl:pr-20 print:overflow-visible">
          {children}
        </div>
      </main>
    </div>
  );
}
