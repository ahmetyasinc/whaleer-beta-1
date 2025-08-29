"use client";
import { useEffect } from "react";
import WalletProviders from "@/context/WalletProviders";
import { AuthProvider } from "@/context/AuthContext";
import { ToastContainer } from "react-toastify";

function isBenignUserRejectMessage(maybe) {
  const m = String(maybe || "").toLowerCase();
  return (
    m.includes("user rejected") ||
    m.includes("rejected the request") ||
    m.includes("user closed") ||
    m.includes("walletsignmessageerror") ||
    m.includes("walletconnectionerror") ||
    m.includes("the popup has been closed") ||
    m.includes("window closed") ||
    m.includes("signature request canceled") ||
    m.includes("transaction cancelled") ||
    m.includes("walletnotselectederror")
  );
}

export default function ClientProviders({ children }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const onRejection = (ev) => {
      const msg = ev?.reason?.message || ev?.reason || "";
      if (isBenignUserRejectMessage(msg)) ev.preventDefault();
    };
    window.addEventListener("unhandledrejection", onRejection);

    const origError = console.error;
    console.error = (...args) => {
      const joined = args.map((a) => String(a)).join(" ");
      if (isBenignUserRejectMessage(joined)) return;
      origError(...args);
    };

    const onError = (ev) => {
      const msg = ev?.message || ev?.error?.message || "";
      if (isBenignUserRejectMessage(msg)) {
        ev.preventDefault?.();
        return true;
      }
    };
    window.addEventListener("error", onError, true);

    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError, true);
      console.error = origError;
    };
  }, []);

  return (
    <AuthProvider>
      <WalletProviders>{children}</WalletProviders>

      {/* 🔔 Tek ve global Toast container */}
      <ToastContainer
        position="top-right"
        newestOnTop
        closeOnClick
        pauseOnFocusLoss={false}
        theme="dark"
        limit={4}
        style={{ zIndex: 2147483647 }}
      />
    </AuthProvider>
  );
}
