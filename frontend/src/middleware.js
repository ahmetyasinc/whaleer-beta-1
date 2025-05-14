import { NextResponse } from "next/server";

export function middleware(request) {
    const url = request.nextUrl;
    const allCookies = request.cookies.getAll();
    const accessToken = allCookies.find(cookie => cookie.name === 'access_token')?.value;

    // Kullanıcının erişim tokenı varsa ve login/register sayfalarına girmeye çalışıyorsa
    if (accessToken && (url.pathname === "/login" || url.pathname === "/register")) {
        return NextResponse.redirect(new URL("/profile", request.url));
    }

    // Kullanıcının erişim tokenı yoksa ve profile ile başlayan sayfalara erişmeye çalışıyorsa
    if (!accessToken && url.pathname.startsWith("/profile")) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
}

// Middleware'in çalışacağı rotaları belirtiyoruz
export const config = {
    matcher: ["/profile/:path*", "/login", "/register"]
};
