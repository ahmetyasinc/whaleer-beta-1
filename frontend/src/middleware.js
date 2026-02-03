import { NextResponse } from "next/server";
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

const locales = ["en", "tr"];
const defaultLocale = "en";

function safeParseJSON(s) { try { return JSON.parse(s); } catch { return null; } }
function languageFromWhSettingsCookie(req) {
  const raw = req.cookies.get("wh_settings")?.value;
  if (!raw) return null;
  const obj = safeParseJSON(decodeURIComponent(raw));
  const lng = obj?.language;
  return locales.includes(lng) ? lng : null;
}
function languageFromHeaders(req) {
  const headers = Object.fromEntries(req.headers);
  const languages = new Negotiator({ headers }).languages();
  return match(languages, locales, defaultLocale);
}
// Öncelik: lang cookie → wh_settings.language → Accept-Language
function detectLocale(req) {
  const lang = req.cookies.get("lang")?.value;
  if (locales.includes(lang)) return lang;
  const fromSettings = languageFromWhSettingsCookie(req);
  if (fromSettings) return fromSettings;
  return languageFromHeaders(req);
}
function withLangCookie(res, locale) {
  res.cookies.set({
    name: "lang",
    value: locale,
    path: "/",
    sameSite: "lax",
    // secure: true, // prod HTTPS'te aç
  });
  return res;
}
function splitLocalePath(pathname) {
  const parts = pathname.replace(/^\/+/, '').split('/');
  const maybe = parts[0];
  if (locales.includes(maybe)) {
    return { hasLocale: true, locale: maybe, rest: parts.slice(1).join('/') };
  }
  return { hasLocale: false, locale: null, rest: parts.join('/') };
}

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const { hasLocale, locale: urlLocale, rest } = splitLocalePath(pathname);

  const wantLocale = detectLocale(request);

  // 1) locale segment YOKSA → cookie/algoritmayla tespit edilen locale’e yönlendir
  if (!hasLocale) {
    const url = new URL(`/${wantLocale}/${rest}`, request.url);
    return withLangCookie(NextResponse.redirect(url), wantLocale);
  }

  // 2) URL'deki locale, lang cookie’den FARKLIYSA → cookie öncelikli olacak şekilde URL'i düzelt
  const cookieLang = request.cookies.get("lang")?.value;
  if (cookieLang && locales.includes(cookieLang) && cookieLang !== urlLocale) {
    const url = new URL(`/${cookieLang}/${rest}`, request.url);
    return withLangCookie(NextResponse.redirect(url), cookieLang);
  }

  // 3) Auth guard kaldırıldı - Client side AuthContext kullanıyor
  // const refreshToken = request.cookies.get("refresh_token")?.value;
  // ... eski kod ...

  // 4) Devam: lang cookie yoksa mevcut URL locale’ini lang olarak set et
  if (!cookieLang || !locales.includes(cookieLang)) {
    const res = NextResponse.next();
    return withLangCookie(res, urlLocale || defaultLocale);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
