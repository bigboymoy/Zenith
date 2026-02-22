# Zenith — Notifications Specification

Spec for notification events, channels, user controls, and push implementation. **No implementation in this doc** — design and technical approach only.

---

## 1. Events that trigger a notification

Notifications should be sent when the following events occur (or are about to occur). Each event can be mapped to in-app and/or push as defined in §2.

| Event | Description | When to fire |
|-------|-------------|--------------|
| **Challenge ending soon** | User has an active challenge (e.g. weekly) that is close to its deadline. | e.g. 24 hours before challenge end; optionally 3 days before. |
| **Streak at risk** | User has a streak but has not logged a workout today and the “streak grace” window (e.g. yesterday) is about to expire. | End of day (e.g. 8 PM local) if no activity today and streak &gt; 0. |
| **New achievement** | User just unlocked an achievement. | Immediately after achievement is earned (often in-app only; push optional). |
| **First week reminder** | User is in Day 2–3 with &lt; 2 workouts (see FIRST_WEEK_SPEC.md). | Once per user when condition is met; can be in-app only or one push. |
| **Week one complete** | User hit 3+ workouts and Day 7 (see FIRST_WEEK_SPEC.md). | Once when condition is met; in-app celebration; push optional. |
| **Daily quest / reminder** | Optional nudge to complete daily quests. | e.g. Once per day at a user-chosen time if quests are incomplete. |
| **Leaderboard / social** | Optional: friend or rival passed you, or you moved up. | When rank changes (if social features exist). |

**Priority for v1:** Challenge ending soon, streak at risk, new achievement. First week and week-one can start as in-app only.

---

## 2. Preferred channels: in-app vs push

- **In-app:** Toast, banner, or modal inside the app. Best for: new achievement, first-week reminder, week-one celebration, and any “right now” feedback. No permission required.
- **Push (remote):** Delivered when app is in background or closed. Best for: challenge ending soon, streak at risk, and time-sensitive reminders. Requires user opt-in and device/permission support.

**Default mapping:**

| Event | In-app | Push |
|-------|--------|------|
| Challenge ending soon | Yes (e.g. banner when opening app) | Yes (recommended) |
| Streak at risk | Yes | Yes (recommended) |
| New achievement | Yes (toast) | Optional |
| First week reminder | Yes | Optional (once) |
| Week one complete | Yes | Optional |
| Daily quest reminder | Yes | Optional, user preference |

---

## 3. User controls (opt-in, frequency)

- **Opt-in:** Push notifications must be opt-in. Do not prompt immediately on first launch; tie to a relevant moment (e.g. after first workout, or on “Challenge ending soon” in-app message with “Get reminders next time”).
- **Settings:** Provide a **Notifications** (or **Settings → Notifications**) screen where the user can:
  - Turn **push on/off** globally.
  - Turn **categories** on/off (e.g. “Challenges”, “Streaks”, “Achievements”, “Reminders”).
  - Set **quiet hours** (optional): no push in a time range (e.g. 10 PM – 8 AM local).
  - Set **frequency** for reminders (e.g. “Remind me at most once per day” for streak/quest reminders).
- **Storage:** Persist choices in user profile (e.g. Firestore `users` doc: `notificationPreferences`) or local storage for client-only logic; server-side senders must respect these flags when implementing push.

---

## 4. How to implement push (Capacitor Push, FCM)

- **Stack:** Use **Firebase Cloud Messaging (FCM)** for payload and delivery. For a hybrid/cross-platform app, use **Capacitor Push Notifications** plugin to register the device and receive FCM tokens; send messages from a backend or Firebase Cloud Functions.
- **Capacitor:**
  - Install `@capacitor/push-notifications`.
  - Request permission when the user opts in; register for push and obtain the FCM token (via Capacitor’s API or Firebase’s SDK integration).
  - Store the FCM token per device (e.g. in Firestore: `users/{uid}/devices/{deviceId}` or a `fcmTokens` map on the user doc) so the backend can target the user.
  - Handle foreground/background: show in-app UI when app is open; rely on system tray when in background.
- **FCM:**
  - Use FCM HTTP v1 API or Admin SDK to send messages. Payload can be data-only (app handles UI) or include `notification` for system display.
  - Target by token(s) associated with the user. For “challenge ending soon” or “streak at risk”, compute eligible users in a scheduled job (Cloud Function on schedule, or app-side trigger that calls a send endpoint), then send one message per user/device respecting opt-out and frequency.
- **Web-only:** If the app is web-only first, use the **Firebase Web SDK** for FCM (browser push). Same token storage and backend send logic; no Capacitor. Add Capacitor when building native/hybrid.
- **No implementation in this repo yet:** This spec does not require implementing push; it only defines the approach (Capacitor + FCM, token storage, and backend/scheduled send).

---

## Summary

- **Events:** Challenge ending soon, streak at risk, new achievement, first week reminder, week one complete, optional daily quest and leaderboard.
- **Channels:** In-app for instant feedback; push for time-sensitive reminders (opt-in).
- **Controls:** Opt-in for push; per-category and frequency/quiet-hours in settings.
- **Push implementation:** Capacitor Push Notifications + FCM; store tokens per user; send via FCM API/Cloud Functions; respect preferences and frequency.
