import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign in",
};

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app/dashboard");
  }

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center bg-[url('/bg-studio.webp')] bg-cover bg-center px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-black/90" />
      <div className="relative w-full max-w-[26rem]">
        {/* Anchored just above the card so the spacing holds on any
            viewport height; in flow on small screens to avoid clipping. */}
        <div className="mb-4 flex justify-center sm:absolute sm:bottom-full sm:left-1/2 sm:mb-0 sm:-translate-x-1/2 sm:pb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sunshine-hot-cars-logo.avif"
            alt="Sunshine Hot Cars logo"
            className="h-24 w-auto object-contain sm:h-32"
          />
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
