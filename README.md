<div align="center">

<img src="public/banner.png" alt="ChatterBox Banner" width="100%" />

<br/>

# 💬 ChatterBox

<p align="center">
  <b>Real-time encrypted messaging, reimagined.</b>
</p>

<p align="center">
  <sub>A modern, privacy-first chat app with end-to-end encryption, read receipts,<br/>message forwarding, and a stunning glassmorphic UI — built for mobile & desktop.</sub>
</p>

<br/>

<p align="center">
  <a href="https://github.com/vishal-git-dot/chatterbox/issues"><img src="https://img.shields.io/badge/🐛_Report_Bug-EF4444?style=for-the-badge&logoColor=white" /></a>
</p>

<p align="center">
  <img alt="status" src="https://img.shields.io/badge/status-active-22c55e?style=flat-square" />
  <img alt="license" src="https://img.shields.io/badge/license-MIT-7c3aed?style=flat-square" />
  <img alt="mobile" src="https://img.shields.io/badge/mobile-optimized-f59e0b?style=flat-square" />
  <img alt="encryption" src="https://img.shields.io/badge/e2e-encrypted-22c55e?style=flat-square" />
  <img alt="security" src="https://img.shields.io/badge/security-hardened-22c55e?style=flat-square" />
</p>

</div>

<br/>

---

<br/>

## ✨ What is ChatterBox?

> **A secure, real-time messaging platform where privacy meets beautiful design.**

<table>
<tr>
<td width="33%" align="center">
  <br/>
  🔐<br/><br/>
  <b>For privacy-first users</b><br/>
  <sub>End-to-end encrypted conversations using ECDH key exchange that stay between you and the recipient.</sub>
  <br/><br/>
</td>
<td width="33%" align="center">
  <br/>
  📱<br/><br/>
  <b>For mobile-first users</b><br/>
  <sub>Smooth, native-feeling experience optimized for touch interactions.</sub>
  <br/><br/>
</td>
<td width="33%" align="center">
  <br/>
  👥<br/><br/>
  <b>For teams & friends</b><br/>
  <sub>Reliable delivery with read receipts so you always know what's been seen.</sub>
  <br/><br/>
</td>
</tr>
</table>

<br/>

---

<br/>

## ⚡ Features

<table>
<tr>
<td width="50%">

### 🔒 End-to-End Encryption
ECDH key exchange (P-256) with AES-256-GCM. Messages are encrypted client-side before sending — nobody can read them in transit or at rest.

### ⚡ Real-Time Messaging
Instant delivery with typing indicators, online status, and presence tracking.

### ✅ Read Receipts
Double checkmarks show when messages are delivered and read.

</td>
<td width="50%">

### 📨 Message Forwarding
Share messages with other contacts in a single tap.

### 😄 Emoji Reactions
React to messages with emojis for quick, expressive responses.

### 🌗 Dark / Light Mode
Beautiful glassmorphic UI with seamless theme switching.

</td>
</tr>
</table>

<details>
<summary><b>🎁 And more...</b></summary>
<br/>

- ✅ Mobile-optimized responsive design
- 🚫 Block & unblock users
- 👤 Contact requests & user management
- 🔍 Instant contact search
- 🎨 Smooth animations & transitions
- 💎 Glassmorphic UI components

</details>

<br/>

---

<br/>

## 🛡️ Security Architecture

ChatterBox has been hardened for production and public deployment. Below is a summary of the implemented security measures.

### 🔐 Encryption — ECDH Key Exchange

Messages use a **two-layer encryption system**:

| Version | Method | Status |
|:-------:|--------|--------|
| `v2:` | ECDH (P-256) + AES-256-GCM | ✅ Current — used for all new messages |
| _(no prefix)_ | PBKDF2 + AES-256-GCM (chat-ID derived) | ⚠️ Legacy — backward-compatible read only |

- Each user generates an **ECDH key pair** on first login (stored in `localStorage`; private key never leaves the device)
- A **shared secret** is derived per conversation using each party's keys
- Every message uses a **random 96-bit IV** — no two encryptions are the same
- `v2:` prefix distinguishes new messages from legacy ones

### 🔒 Authorization Checks

| Action | Guard |
|--------|-------|
| Edit message | `message.senderId === currentUser.id` verified client-side before Firebase write |
| Delete message | Same sender check enforced before soft-delete |
| Firebase rules | `senderId` field validated server-side — only the original sender can write `editedAt` / `deleted` |

### ✅ Input Validation

| Input | Rule |
|-------|------|
| Message text | 1–5,000 characters, trimmed before encrypt & send |
| Display name | 1–50 characters (Firebase rule) |
| Email | Max 255 characters (Firebase rule) |
| Status | Enum: `online`, `offline`, `away` (Firebase rule) |
| Public key | Max 2,000 characters (Firebase rule) |
| Add-user identifier | 3–255 characters |

### 🚧 Remaining Limitations

> These are known trade-offs. Understand them before deploying publicly.

- **Private keys in `localStorage`** — Device compromise exposes private keys. A future improvement would use IndexedDB with non-exportable keys (`extractable: false`).
- **Client-side auth checks** — Edit/delete authorization is enforced client-side. The Firebase rules add a server-side layer, but combining both is best practice.
- **User enumeration** — All authenticated users can see the user list. This is intentional for a contact-discovery UX but means user emails/display names are visible to any logged-in user.
- **No rate limiting** — Firebase does not natively rate-limit writes. Consider Firebase App Check or a Cloud Function middleware for production.

<br/>

---

<br/>

## 🔥 Firebase Security Rules

> [!IMPORTANT]
> **You must deploy these rules to your Firebase project.** Without them, any authenticated user can read or overwrite any data.

### How to Apply

| # | Step |
|:-:|------|
| **1** | Open [Firebase Console](https://console.firebase.google.com/) → your project |
| **2** | Go to **Realtime Database → Rules** tab |
| **3** | Replace the contents with the rules below |
| **4** | Click **Publish** |

### Rules

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === $uid",
        ".validate": "newData.hasChildren(['id', 'email', 'displayName', 'status', 'lastSeen'])",
        "displayName": {
          ".validate": "newData.isString() && newData.val().length >= 1 && newData.val().length <= 50"
        },
        "email": {
          ".validate": "newData.isString() && newData.val().length <= 255"
        },
        "status": {
          ".validate": "newData.isString() && (newData.val() === 'online' || newData.val() === 'offline' || newData.val() === 'away')"
        }
      }
    },
    "messages": {
      "$chatId": {
        ".read": "auth != null && ($chatId.contains(auth.uid))",
        "$messageId": {
          ".write": "auth != null && ($chatId.contains(auth.uid))",
          ".validate": "newData.hasChildren(['senderId', 'receiverId', 'text', 'timestamp', 'read'])",
          "senderId": {
            ".validate": "newData.val() === auth.uid || (data.exists() && data.val() === newData.val())"
          },
          "text": {
            ".validate": "newData.isString() && newData.val().length <= 10000"
          },
          "editedAt": {
            ".validate": "data.parent().child('senderId').val() === auth.uid"
          },
          "deleted": {
            ".validate": "data.parent().child('senderId').val() === auth.uid && newData.val() === true"
          }
        }
      }
    },
    "contacts": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        "$contactId": {
          ".write": "auth != null && (auth.uid === $uid || auth.uid === $contactId)"
        }
      }
    },
    "contactRequests": {
      ".read": "auth != null",
      "$requestId": {
        ".write": "auth != null",
        ".validate": "newData.hasChildren(['fromUserId', 'toUserId', 'status', 'timestamp'])",
        "fromUserId": {
          ".validate": "!data.exists() ? newData.val() === auth.uid : true"
        },
        "status": {
          ".validate": "newData.isString() && (newData.val() === 'pending' || newData.val() === 'accepted' || newData.val() === 'declined')"
        }
      }
    },
    "blocked": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "typing": {
      "$typingKey": {
        ".read": "auth != null && $typingKey.contains(auth.uid)",
        ".write": "auth != null && $typingKey.beginsWith(auth.uid)"
      }
    },
    "viewing": {
      "$viewingKey": {
        ".read": "auth != null && $viewingKey.contains(auth.uid)",
        ".write": "auth != null && $viewingKey.beginsWith(auth.uid)"
      }
    },
    "notifications": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        "$notificationId": {
          ".write": "auth != null",
          "read": {
            ".write": "auth != null && auth.uid === $uid"
          }
        }
      }
    },
    "publicKeys": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === $uid",
        ".validate": "newData.isString() && newData.val().length <= 2000"
      }
    }
  }
}
```

### What Each Rule Does

| Node | Who Can Read | Who Can Write |
|------|-------------|--------------|
| `users/$uid` | Any authenticated user | Only the user themselves |
| `messages/$chatId` | Only participants of that chat | Only participants of that chat |
| `messages/$chatId/$msgId.editedAt` | — | Only original sender |
| `messages/$chatId/$msgId.deleted` | — | Only original sender |
| `contacts/$uid` | Only `$uid` | `$uid` or the contact being added |
| `blocked/$uid` | Only `$uid` | Only `$uid` |
| `typing/$key` | Participants only | Only the typing user |
| `publicKeys/$uid` | Any authenticated user | Only the key owner |

<br/>

---

<br/>

## 🔑 Public Repository Checklist

> [!CAUTION]
> **Before pushing to a public repo, verify ALL of the following:**

- [ ] `src/services/firebase.ts` contains **only placeholder values** (no real API keys)
- [ ] No `.env` files with real credentials are committed
- [ ] Firebase rules are **published** in the console (the `database.rules.json` file in this repo is for reference only — rules must be deployed via the console)
- [ ] Firebase **App Check** is enabled to prevent unauthorized API access from other origins
- [ ] Firebase Authentication has **Authorized Domains** configured (remove `localhost` for production)
- [ ] Storage rules restrict uploads to authenticated users only
- [ ] Review Firebase Console → **Usage & Billing** to set spend limits

<br/>

---

<br/>

## 🧱 Tech Stack

<div align="center">
<br/>

<img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
<img src="https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
<img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" />
<img src="https://img.shields.io/badge/shadcn/ui-000000?style=for-the-badge&logo=shadcnui&logoColor=white" />

<br/><br/>
</div>

---

<br/>

## 🚀 Quickstart

### Prerequisites
```
Node.js 18+  ·  npm  ·  Firebase project with Realtime Database
```

### Installation
```bash
# Clone the repository
git clone https://github.com/user/chatterbox.git
cd chatterbox

# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Build
```bash
npm run build
```

<br/>

---

<br/>

## 🔐 Firebase Setup — Required

> [!WARNING]
> **You must use your own Firebase credentials.** The project ships with placeholder values that won't work out of the box.

### Steps

| # | Action |
|:-:|--------|
| **1** | Go to [Firebase Console](https://console.firebase.google.com/) and create a new project |
| **2** | Enable **Authentication** → Email/Password |
| **3** | Enable **Realtime Database** |
| **4** | Enable **Storage** |
| **5** | Go to **Project Settings → Your Apps** → Register a Web App |
| **6** | Copy the config into `src/services/firebase.ts` |
| **7** | Deploy the security rules from the [section above](#-firebase-security-rules) |

<details>
<summary><b>📋 Example config</b></summary>

```ts
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

</details>

> [!CAUTION]
> Never commit real credentials to a public repository.

<br/>

---

<br/>

## 🗺️ Roadmap

| Status | Feature |
|:------:|---------|
| 🟡 | 🎤 Voice messages |
| 🟡 | 📎 File & image sharing |
| 🟡 | 👥 Group chats |
| 🟡 | 🔔 Push notifications |
| 🟡 | 📱 PWA support |
| 🟡 | 🔑 Firebase App Check integration |
| 🟡 | 💾 Non-exportable IndexedDB key storage |

<br/>

---

<br/>

## ❓ FAQ

<details>
<summary><b>🔒 Is my data encrypted?</b></summary>
<br/>
Yes — all messages are encrypted client-side using ECDH key exchange (P-256) + AES-256-GCM before being sent to the server. The server only ever sees ciphertext. Private keys never leave your device.
</details>

<details>
<summary><b>📱 Can I use this on mobile?</b></summary>
<br/>
Absolutely. The UI is fully responsive and optimized for touch interactions with smooth animations.
</details>

<details>
<summary><b>🛠️ Do I need my own Firebase project?</b></summary>
<br/>
Yes. You'll need to create a Firebase project, add your credentials to <code>src/services/firebase.ts</code>, and deploy the security rules. See the setup sections above.
</details>

<details>
<summary><b>🔑 Where are encryption keys stored?</b></summary>
<br/>
Your private key is generated in the browser and stored in <code>localStorage</code>. It never leaves your device. Your public key is uploaded to Firebase so your contacts can encrypt messages for you.
</details>

<details>
<summary><b>⚠️ Can I edit or delete other people's messages?</b></summary>
<br/>
No. Both client-side authorization checks and Firebase security rules ensure only the original sender can edit or delete a message.
</details>

<br/>

---

<br/>

## 🤝 Contributing

Contributions are welcome! Here's how:

```
1. Fork the repo
2. Create a branch    →  git checkout -b feature/my-feature
3. Commit changes     →  git commit -m "Add my feature"
4. Push               →  git push origin feature/my-feature
5. Open a PR          →  🎉
```

<br/>

---

<br/>

## 📄 License

This project is licensed under **MIT** — free for personal and commercial use.

<br/>

---

<br/>

<div align="center">

<sub>Made with 💜</sub>

<br/><br/>

<img src="https://img.shields.io/badge/⭐_Star_this_repo-F59E0B?style=for-the-badge" />

</div>
