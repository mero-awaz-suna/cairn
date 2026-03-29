import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignored — cookies will still be set on the response
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Check if user profile exists
        const { data: profile } = await supabase
          .from("users")
          .select("id, academic_stage, consented_to_terms_at")
          .eq("supabase_auth_id", user.id)
          .single();

        if (!profile) {
          // First-time user — create profile stub
          const { error: insertError } = await supabase.from("users").upsert(
            {
              supabase_auth_id: user.id,
            },
            { onConflict: "supabase_auth_id" }
          );

          if (insertError) {
            console.error("[Auth Callback] Failed to create user profile:", insertError);
          }

          return NextResponse.redirect(`${origin}/onboarding`);
        }

        // User exists but hasn't completed onboarding
        if (!profile.consented_to_terms_at) {
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
