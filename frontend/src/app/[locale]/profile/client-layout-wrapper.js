'use client';

import LeftMenu from "@/components/profile_component/leftmenu";

export default function ClientLayoutWrapper({ children }) {
  return (
    <div className="min-h-screen w-screen hard-gradient">
      <LeftMenu />
      <main>{children}</main>
    </div>
  );
}
