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
    <main className="relative flex min-h-svh items-center justify-center bg-[url('/bg-studio.webp')] bg-cover bg-center px-4">
      <div className="pointer-events-none absolute inset-0 bg-black/90" />
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 rounded-lg p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sunshine-hot-cars-logo.avif"
          alt="Sunshine Hot Cars logo"
          className="h-32 w-auto object-contain"
        />
      </div>
      <div className="relative w-full max-w-[26rem]">
        <LoginForm />
      </div>
    </main>
  );
}
