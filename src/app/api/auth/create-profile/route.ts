import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Server-side only: uses service_role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const { userId, displayName, role } = await request.json();

  if (!userId || !displayName || !role) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (role !== "teacher" && role !== "student") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Check if profile already exists
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single();

  if (existing) {
    return NextResponse.json({ profile: existing });
  }

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: userId,
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
