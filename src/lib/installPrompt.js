// ─── PWA install prompt helper ───
// Captures the `beforeinstallprompt` event so the UI can fire it
// later when the user clicks our custom install button.

import React from 'react';

let deferredPrompt = null;

if (typeof window !== "undefined") {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window.dispatchEvent(new Event('gms:can-install'));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.dispatchEvent(new Event('gms:installed'));
  });
}

export function useInstallPrompt() {
  const [canInstall, setCanInstall] = React.useState(!!deferredPrompt);
  const [installed, setInstalled] = React.useState(false);
  const [isStandalone, setIsStandalone] = React.useState(() =>
    typeof window !== "undefined" && (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    )
  );

  React.useEffect(() => {
    const onCanInstall = () => setCanInstall(true);
    const onInstalled = () => { setInstalled(true); setCanInstall(false); };
    window.addEventListener('gms:can-install', onCanInstall);
    window.addEventListener('gms:installed', onInstalled);
    return () => {
      window.removeEventListener('gms:can-install', onCanInstall);
      window.removeEventListener('gms:installed', onInstalled);
    };
  }, []);

  async function promptInstall() {
    if (!deferredPrompt) return null;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    setCanInstall(false);
    return choice.outcome; // "accepted" | "dismissed"
  }

  return { canInstall, installed, isStandalone, promptInstall };
}
