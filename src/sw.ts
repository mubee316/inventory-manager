/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import { Serwist, NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'serwist';

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (string | { url: string; revision: string | null })[];
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) => url.hostname.includes('firestore.googleapis.com'),
      handler: new NetworkFirst(),
    },
    {
      matcher: ({ url }) => url.hostname.includes('firebase.googleapis.com'),
      handler: new StaleWhileRevalidate(),
    },
    {
      matcher: ({ url }) => url.hostname.includes('firebasestorage.googleapis.com'),
      handler: new CacheFirst(),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
