'use client';

import LeftMenu from "@/components/profile_component/leftmenu";

export default function ClientLayoutWrapper({ children, locale }) {
  return (
    <div className="min-h-screen w-screen hard-gradient">
      <LeftMenu locale={locale} />
      <main>{children}</main>
    </div>
  );
}
