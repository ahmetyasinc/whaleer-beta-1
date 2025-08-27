"use client";

import WalletProviders from "@/context/WalletProviders";
import { AuthProvider } from "@/context/AuthContext";

export default function ClientProviders({ children }) {
  return (
    <AuthProvider>
      <WalletProviders>{children}</WalletProviders>
    </AuthProvider>
  );
}
