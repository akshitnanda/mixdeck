"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type InstallChoice = { outcome: "accepted" | "dismissed"; platform: string };

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

type PwaContextValue = {
  canInstall: boolean;
  installed: boolean;
  offlineReady: boolean;
  offlineSupported: boolean;
  online: boolean;
  install: () => Promise<boolean>;
};

const PwaContext = createContext<PwaContextValue>({
  canInstall: false,
  installed: false,
  offlineReady: false,
  offlineSupported: true,
  online: true,
  install: async () => false,
});

export function PwaProvider({ children }: { children: ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [offlineSupported, setOfflineSupported] = useState(true);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const initialStateTimer = window.setTimeout(() => {
      setOnline(window.navigator.onLine);
      setInstalled(window.matchMedia("(display-mode: standalone)").matches);
      setOfflineSupported("serviceWorker" in navigator);
    }, 0);

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    const handleWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "MIXDECK_OFFLINE_READY") setOfflineReady(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    navigator.serviceWorker?.addEventListener("message", handleWorkerMessage);

    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then(() => navigator.serviceWorker.ready)
        .then((registration) => {
          const resourceUrls = performance.getEntriesByType("resource")
            .map((entry) => entry.name)
            .filter((url) => url.startsWith(window.location.origin));
          registration.active?.postMessage({
            type: "MIXDECK_CACHE_URLS",
            urls: [...new Set([window.location.href, ...resourceUrls])],
          });
        })
        .catch(() => {
          setOfflineReady(false);
          setOfflineSupported(false);
        });
    }

    return () => {
      window.clearTimeout(initialStateTimer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      navigator.serviceWorker?.removeEventListener("message", handleWorkerMessage);
    };
  }, []);

  const value = useMemo<PwaContextValue>(() => ({
    canInstall: Boolean(installPrompt) && !installed,
    installed,
    offlineReady,
    offlineSupported,
    online,
    install: async () => {
      if (!installPrompt) return false;
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setInstallPrompt(null);
      return choice.outcome === "accepted";
    },
  }), [installPrompt, installed, offlineReady, offlineSupported, online]);

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa() {
  return useContext(PwaContext);
}
