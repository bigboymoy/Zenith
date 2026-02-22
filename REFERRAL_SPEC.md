# Referral Spec (Zenith)

One-page specification for how referrals work. No implementation.

## Overview

Users can invite friends via an **invite code** or **referral link**. When the invitee signs up and meets the conversion criteria, both inviter and invitee receive a reward (e.g. bonus XP).

## Invite Code / Link

- **Invite code:** Short, user-scoped code (e.g. 6–8 alphanumeric) generated once per user and shown in Profile (e.g. “Your code: ABC12XY”). Invitee enters this code during signup or in Settings after signup.
- **Referral link:** Alternatively (or in addition), a link that encodes the inviter: e.g. `https://app.zenith.example/invite?ref=ABC12XY` or `https://app.zenith.example/r/ABC12XY`. Visiting the link pre-fills or stores the referrer for attribution at signup.

## Rewards

- **Inviter:** Bonus XP when an referred user converts (e.g. +100 XP per successful referral, cap per user or per month if desired).
- **Invitee:** Bonus XP on signup when they used a valid code/link (e.g. +50 XP “welcome bonus” for referred users only).

Exact amounts and caps are product decisions; the system should support configurable rewards.

## Tracking (Data Model)

- **Option A – `referrals` collection:**  
  - Document per referral event, e.g. `referrals/{referralId}`.  
  - Fields: `inviterUserId`, `inviteeUserId`, `inviteCode` (or link ref), `status` (`pending` | `converted`), `createdAt`, `convertedAt` (when invitee met criteria).  
  - Enables analytics and idempotent reward payouts.

- **Option B – `referralCode` on users:**  
  - On `users/{uid}` add `referralCode` (inviter’s code for this user) and optionally `referredByUserId`.  
  - Inviter list can be derived by querying `users` where `referredByUserId == inviterUid` (requires index).  
  - Rewards paid by scanning for new users with `referredByUserId` set and applying bonus XP to both sides.

- **Recommended:** Use both: store `referralCode` / `referredByUserId` on the invitee’s user doc for simple lookups, and write a `referrals` document per conversion for audit and idempotent reward application (so the same referral doesn’t grant XP twice).

## Conversion Criteria

Define when “conversion” happens, e.g.:

- Invitee completed signup (account created), or  
- Invitee completed signup and logged first workout (stronger signal).

Rewards are granted only when conversion criteria are met; pending referrals can be updated from `pending` to `converted` and then trigger XP grants.

## Flow Summary

1. Inviter gets a code/link from Profile (or dedicated “Invite” screen).
2. Invitee uses link or enters code at signup (or in Settings).
3. App stores referrer on invitee (e.g. `referredByUserId`, `referralCode`) and optionally creates a `referrals` doc with `status: pending`.
4. When invitee meets conversion criteria, set `status: converted`, `convertedAt`, and award bonus XP to inviter and invitee (and update user docs / XP in Firestore).
5. Idempotency: only grant rewards once per referral (e.g. check `referrals` or a “rewardGranted” flag before adding XP).
