"use client";
import { useEffect } from "react";
export default function PwaRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      window.isSecureContext &&
      "serviceWorker" in navigator
    ) {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          // Instalação é opcional: falha do SW mantém o site funcionando online.
        });
    }
  }, []);
  return null;
}
