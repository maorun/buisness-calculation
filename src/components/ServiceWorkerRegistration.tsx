"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker
      .register("/sw.js")
      .catch((error) => console.error("Service-Worker-Registrierung fehlgeschlagen", error));
  }, []);

  return null;
}
