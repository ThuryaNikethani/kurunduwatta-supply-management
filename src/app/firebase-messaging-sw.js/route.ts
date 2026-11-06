// Serves the push-notification service worker with the Firebase config
// filled in from environment variables (public files can't read env vars).

export const dynamic = "force-static";

export function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const js = `
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js");

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

const config = ${JSON.stringify(config)};
if (config.apiKey) {
  firebase.initializeApp(config);
  // Messages with a "notification" payload are shown automatically.
  firebase.messaging();
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && (event.notification.data.link || (event.notification.data.FCM_MSG && event.notification.data.FCM_MSG.data && event.notification.data.FCM_MSG.data.link))) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) { c.navigate(link); return c.focus(); }
      }
      return self.clients.openWindow(link);
    })
  );
});
`;
  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
      "Cache-Control": "no-cache",
    },
  });
}
