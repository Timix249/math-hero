# Math Hero — Firebase + GitHub Pages PWA

## 1. Dateien hochladen
Alle Dateien in ein GitHub Repository hochladen:
- `index.html`
- `style.css`
- `app.js`
- `manifest.json`
- `sw.js`
- Ordner `assets`

## 2. GitHub Pages aktivieren
GitHub → Repository → Settings → Pages →  
Source: `Deploy from a branch` → Branch: `main` → Folder: `/root` → Save.

## 3. Firebase Projekt erstellen
Firebase Console → Add project → Web App registrieren.

Offizielle Firebase Web-Setup-Doku: https://firebase.google.com/docs/web/setup

## 4. Firebase Config einfügen
In `app.js` diese Stelle ersetzen:

```js
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID"
};
```

## 5. Firebase Authentication aktivieren
Firebase Console → Authentication → Sign-in method:
- Email/Password aktivieren
- Google aktivieren

## 6. Firestore aktivieren
Firebase Console → Firestore Database → Create database.

Start-Regeln zum Testen:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 7. Fertig
App auf GitHub Pages öffnen. Auf iPhone in Safari:
Teilen → Zum Home-Bildschirm.
