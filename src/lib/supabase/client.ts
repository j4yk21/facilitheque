import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Guard: never expose the service_role key to the browser
if (supabaseAnonKey?.startsWith("sb_secret_")) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY contains a service_role secret key. " +
      "This key must NEVER be exposed to the browser. " +
      'Use the anon (public) key instead — it starts with "eyJ...".'
  );
}

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Disable navigator.locks to prevent deadlocks caused by
      // React Strict Mode double-mounting effects in development.
      lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
        return await fn();
      },
    },
  });
}
