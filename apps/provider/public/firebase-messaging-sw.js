// FCM service worker — required for web push.
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

try {
  firebase.initializeApp({
    apiKey: '__FIREBASE_API_KEY__',
    projectId: '__FIREBASE_PROJECT_ID__',
    messagingSenderId: '__FIREBASE_MESSAGING_SENDER_ID__',
    appId: '__FIREBASE_APP_ID__',
  });
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const { title, body } = payload.notification ?? {};
    self.registration.showNotification(title ?? 'Urban Assist Pro', {
      body: body ?? '',
      icon: '/icon-192.png',
    });
  });
} catch (e) {
  // Placeholder values — no-op until real keys are dropped in.
}
