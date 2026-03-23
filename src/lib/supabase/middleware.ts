import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/", "/login", "/signup"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as any)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // Redirect unauthenticated users to login (unless on a public route)
  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const dest = profile?.role === "teacher" ? "/teacher/dashboard" : "/student/join";
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = dest;
    return NextResponse.redirect(redirectUrl);
  }

  // Role-based route guards
  if (user && (pathname.startsWith("/teacher") || pathname.startsWith("/student"))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile) {
      // Teachers can't access student routes
      if (profile.role === "teacher" && pathname.startsWith("/student")) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/teacher/dashboard";
        return NextResponse.redirect(redirectUrl);
      }
      // Students can't access teacher routes
      if (profile.role === "student" && pathname.startsWith("/teacher")) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/student/join";
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return supabaseResponse;
}
