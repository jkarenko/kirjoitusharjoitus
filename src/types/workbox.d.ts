declare module 'workbox-precaching';
declare module 'workbox-routing';
declare module 'workbox-strategies';
declare module 'workbox-expiration';
declare module 'workbox-cacheable-response';

interface ManifestEntry {
  url: string;
  revision: string | null;
}

interface ServiceWorkerGlobalScope extends WindowOrWorkerGlobalScope {
  __WB_MANIFEST: ManifestEntry[];
}
