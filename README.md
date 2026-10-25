<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/6f8b8aae-249b-453d-a14b-47e894f3589d

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Open on Android with Expo Go

The Android Expo Go app displays the existing web app in a WebView. Start both
servers in separate PowerShell terminals from the project root:

1. Install the Expo wrapper dependencies once:
   `Set-Location mobile`
   `npm install`
2. In the first terminal, start the web app:
   `node .\node_modules\vite\bin\vite.js --host 0.0.0.0 --port 3000`
3. In the second terminal, start Expo:
   `Set-Location mobile`
   `node .\node_modules\expo\bin\cli start --lan --go`
4. Install Expo Go on your Android phone. Connect the phone and computer to the
   same Wi-Fi network, then scan Expo's QR code with Expo Go.

The Expo app detects the computer's LAN address from the Expo development
server. To use a specific web server address, set `EXPO_PUBLIC_WEB_URL` before
starting Expo, for example:
`$env:EXPO_PUBLIC_WEB_URL = "http://192.168.1.25:3000"`.

## Build the Capacitor Android APK

**Prerequisites:** Node.js, Android SDK, and JDK 17 with `JAVA_HOME` configured.
Run these commands from the project root in PowerShell:

```powershell
npm install
npm run lint
npm run build
npx cap sync android
Set-Location android
.\gradlew.bat assembleDebug
```

The debug APK is written to
`android\app\build\outputs\apk\debug\app-debug.apk` (relative to project root).

## Firebase Spark assignment demo

The app uses Firebase Authentication and Firestore only; it does not call or
deploy Cloud Functions. The Firebase project configured in `.firebaserc` is
`resturent-6210f`. Enable Email/Password Authentication and Firestore in that
project, then publish only the Firestore rules and indexes:

```powershell
npm install -g firebase-tools
firebase login
firebase deploy --project resturent-6210f --only firestore:rules,firestore:indexes
```

The Spark-plan administrator is identified by the fixed Firebase Auth UID
`op2EtvYEBkb6yatyZFeIZ3IAdFC2` and verified email `admindashboard@gmail.com`.
The UID must belong to that account in this exact Firebase project. The app
does not create the account, change its password, or grant admin based on an
email-only client check. In Firebase Console, create or confirm the existing
Authentication user, verify the email, and compare its UID with the configured
UID before deploying rules. If the UID differs, stop and update both
`src/firebase/authorization.ts` and `firestore.rules` to the correct verified
UID before deployment.

The admin can approve/reject manager applications through a Firestore
transaction. Approval creates `managerRoles/{uid}` with role `manager`;
Firestore rules permit that write only from the fixed, verified admin identity.
Customers can create only their own pending application and cannot write role
records. Order and reservation status changes are direct Firestore writes
validated by rules, and customer order/reservation subscriptions are owner
filtered. Menu items are public-read and manager-write.

Local menu examples are shown with an explicit sample-menu label when Firestore
has no menu. Orders, reservations, customer profiles, and manager operations do
not use local storage as a success fallback. The app does not process payments,
and the dashboard reports order values rather than amounts collected.

### Manual verification checklist

- Sign up and sign in as a customer; verify the manager dashboard and role
  records cannot be opened or changed.
- As a customer, place a valid order; verify a Firestore order is created under
  that customer's UID and appears in My Orders.
- Try to read another customer's order/profile or modify an order status; each
  request must be denied.
- As the fixed verified admin, open the management dashboard; verify live
  orders and reservations load, and legal order/reservation status changes are
  reflected in customer tracking.
- Submit a manager application as a customer; verify it remains pending and
  cannot access management data. Approve it as admin and confirm the customer
  can access manager tools after refreshing role.
- Try to create `managerRoles/{uid}` as a customer, approve an application as a
  manager, or write invalid order/reservation transitions; each must be denied.
- Create/edit/disable a menu item as admin or approved manager, then verify the
  customer menu updates from Firestore. An empty Firestore menu should remain
  clearly distinguishable from local sample menu data.

Firestore security rules do not provide transactional table-overlap checks on
Spark. Manager reservation status updates work, but assigning tables with
guaranteed conflict prevention is unsupported without a trusted backend.
