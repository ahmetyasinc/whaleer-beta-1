import { NextResponse } from "next/server";
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

const locales = ["en", "tr"];
const defaultLocale = "en";

function detectLocale(request) {
  const langCookie = request.cookies.get("lang")?.value;
  if (locales.includes(langCookie)) return langCookie;

  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const languages = new Negotiator({ headers }).languages();
  return defaultLocale //match(languages, locales, defaultLocale);
}

export function middleware(request) {

  const { pathname } = request.nextUrl;
  const cookies = request.cookies;
  const refreshToken = cookies.get("refresh_token")?.value;

  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}`)
  );

  if (pathnameIsMissingLocale) {
    const locale = detectLocale(request);
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
  }

  const locale = pathname.split("/")[1]; // "/en/login" → "en"
  const pathWithoutLocale = pathname.slice(locale.length + 1); // "/login"

  if (refreshToken && (pathWithoutLocale === "login" || pathWithoutLocale === "register")) {
    return NextResponse.redirect(new URL(`/${locale}/profile`, request.url));
  }
  
  const isProtectedRoute = pathWithoutLocale === "/profile" || pathWithoutLocale.startsWith("/profile/");
  if (!refreshToken && isProtectedRoute) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"], 
};