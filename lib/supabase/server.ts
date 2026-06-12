import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Wrapped in React `cache()` so the many createClient() calls within one
 * request (layout, page, every lib/db function) share a single client and a
 * single cookies() read instead of rebuilding it each time. Outside a React
 * render (route handlers, server actions) cache() is a transparent
 * pass-through, so behavior there is unchanged.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have a proxy refreshing user sessions.
          }
        },
      },
    },
  );
});
