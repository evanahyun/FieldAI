import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isDashboard = path.startsWith("/dashboard");
  const isLogin = path.startsWith("/login");
  const isSignup = path.startsWith("/signup");
  const isOnboarding = path.startsWith("/onboarding");
  const isDevTools = path.startsWith("/dev");

  if (isOnboarding) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/signup";
    redirectUrl.searchParams.set("setup", "company");
    return NextResponse.redirect(redirectUrl);
  }

  if (process.env.NODE_ENV === "production" && isDevTools) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  async function membership() {
    if (!user) return null;
    const { data } = await supabase.from("company_users").select("id").eq("user_id", user.id).maybeSingle();
    return data;
  }

  if (isLogin && user) {
    const m = await membership();
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = m ? "/dashboard" : "/signup";
    if (!m) redirectUrl.searchParams.set("setup", "company");
    return NextResponse.redirect(redirectUrl);
  }

  if (isSignup && user) {
    const m = await membership();
    if (m) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      return NextResponse.redirect(redirectUrl);
    }
    // Logged in without a company: allow /signup to finish workspace setup.
  }

  if (isDashboard && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (isDashboard && user) {
    const m = await membership();
    if (!m) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/signup";
      redirectUrl.searchParams.set("setup", "company");
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}
