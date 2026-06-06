'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Already installed (running in standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // iOS Safari — no beforeinstallprompt, show manual instructions
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    if (ios) {
      const dismissed = sessionStorage.getItem('installDismissed');
      if (!dismissed) {
        setIsIOS(true);
        setShow(true);
      }
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      const dismissed = sessionStorage.getItem('installDismissed');
      if (!dismissed) setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    sessionStorage.setItem('installDismissed', '1');
    setShow(false);
  }

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') setShow(false);
  }

  if (isInstalled || !show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-gray-900 text-white rounded-2xl p-4 shadow-xl flex items-start gap-3">
        <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">SS</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Install StoreSync</p>
          {isIOS ? (
            <p className="text-xs text-gray-300 mt-0.5">
              Tap <span className="font-semibold">Share</span> then <span className="font-semibold">"Add to Home Screen"</span> to install
            </p>
          ) : (
            <p className="text-xs text-gray-300 mt-0.5">
              Add to your home screen for the full app experience
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          {!isIOS && (
            <button
              onClick={install}
              className="text-xs font-semibold bg-green-600 text-white px-3 py-1.5 rounded-lg active:bg-green-700"
            >
              Install
            </button>
          )}
          <button
            onClick={dismiss}
            className="text-xs text-gray-400 px-3 py-1.5 rounded-lg active:bg-gray-800"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
