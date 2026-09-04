// NiniMed Mobile Service Worker v1.0.0
const CACHE_NAME = "ninimed-mobile-v1";
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/locations",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
  "/icons/icon-maskable.svg",
];

// Install Event — Pre-cache critical application shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("ServiceWorker pre-cache warning:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event — Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event — Network-first for dynamic API routes, cache-first for assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests, WebSocket / analytics, and SSE real-time streaming endpoints
  if (
    request.method !== "GET" ||
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.pathname.includes("/stream") ||
    request.headers.get("accept")?.includes("text/event-stream")
  ) {
    return;
  }

  // API calls: Network-first with graceful offline JSON fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful GET API responses for offline resilience
          if (response.status === 200 && url.pathname.includes("/locations")) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(
            JSON.stringify({
              success: false,
              offline: true,
              message: "Device is currently offline. Viewing cached clinical snapshot.",
            }),
            {
              headers: { "Content-Type": "application/json" },
            }
          );
        })
    );
    return;
  }

  // Navigation requests: Network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offlinePage = await caches.match(OFFLINE_URL);
          if (offlinePage) return offlinePage;
          return new Response(
            "<!DOCTYPE html><html><body><h1>Offline</h1><p>Please check your connection and reload.</p></body></html>",
            { headers: { "Content-Type": "text/html" }, status: 503 }
          );
        })
    );
    return;
  }

  // Static Assets: Cache-first / Stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          return cachedResponse || new Response(null, { status: 404 });
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// Push Notifications Event
self.addEventListener("push", (event) => {
  let data = {
    title: "NiniMed Health Alert",
    body: "You have a new healthcare update from NiniMed Clinical Network.",
    icon: "/icons/icon-192.svg",
    badge: "/icons/icon-192.svg",
    url: "/patient/dashboard",
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/icons/icon-192.svg",
    badge: data.badge || "/icons/icon-192.svg",
    vibrate: [100, 50, 100, 50, 150],
    data: {
      url: data.url || "/patient/dashboard",
    },
    actions: [
      { action: "open", title: "View Details" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification Click Event — Direct App Deep-linking
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/patient/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
