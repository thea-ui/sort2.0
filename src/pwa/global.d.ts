/// <reference types="vite-plugin-pwa/client" />

/**
 * Global typings for the install prompt captured by the inline boot script in
 * index.html and for the browser-only `navigator.standalone` (iOS).
 */

interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>;
  prompt: () => Promise<void>;
}

interface Window {
  __sortPwaInstallEvent?: BeforeInstallPromptEvent | null;
}

interface Navigator {
  readonly standalone?: boolean;
}
