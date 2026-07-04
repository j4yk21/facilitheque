import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  // Identify the caller from their session cookies — never trust a
  // client-supplied userId, or anyone could create profiles for
  // arbitrary accounts.
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { displayName, role } = await request.json();

  if (!displayName || !role) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (role !== "teacher" && role !== "student") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Server-side only: uses service_role key to bypass RLS
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check if profile already exists
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (existing) {
    return NextResponse.json({ profile: existing });
  }

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: user.id,
      display_name: displayName,
      role,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile });
}
