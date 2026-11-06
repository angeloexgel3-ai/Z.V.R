# Z.V.R Clan Gateway Links & Official Facebook Profile Integration

The portal links are configured to point directly to the official clan destinations:
1. **Official Z.V.R Messenger Group Chat**: `https://m.me/j/jqFOlcjcyHiKLSUN/?send_source=gc%3Acopy_invite_link_t`
2. **Official Z.V.R Clan Leadership Facebook Profile**: `https://www.facebook.com/profile.php?id=61590405043340` (used for "Forgot Password?", Admin Assistance, and Official Page links)

### Confirmed System Architecture

- **Official Facebook Profile**: `https://www.facebook.com/profile.php?id=61590405043340` is the direct channel for contacting clan leadership and password assistance.
- **Official Messenger Group Chat**: All group chat actions and redirects point to `https://m.me/j/jqFOlcjcyHiKLSUN/?send_source=gc%3Acopy_invite_link_t`.

---

### 1. Overview & Core Concept

- **What It Does**: Provides clean, direct routing for both the Z.V.R Group Chat and the official Z.V.R Facebook profile for member inquiries, clan recruitment, and password assistance.
- **Target Audience**: Z.V.R members needing to join the GC or contact leadership via Facebook.
- **Key Value**: Direct, verified communication channels with no broken or truncated links.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **GC Gateway**: After entering the passcode `ZVR09152025`, members click **"Pumunta sa Messenger GC"** to open `https://m.me/j/jqFOlcjcyHiKLSUN/?send_source=gc%3Acopy_invite_link_t`.
  2. **Forgot Password / Contact Admin**: Members clicking "Forgot password?" are presented with direct options:
     - Direct button to **Message Clan Leadership on Facebook** (`https://www.facebook.com/profile.php?id=61590405043340`).
     - Direct button to open the Messenger Group Chat invite link.
     - Passcode hint toggle (`ZVR09152025`).
  3. **Footer & Navigation**: Includes quick links to both the Messenger GC and the Official Facebook Profile.

---

### 3. Key Product Decisions & Trade-Offs

- **Dedicated Constant Exports**:
  - `MESSENGER_GC_LINK`: Dedicated invite URL to the group chat (`https://m.me/j/jqFOlcjcyHiKLSUN/?send_source=gc%3Acopy_invite_link_t`).
  - `CLAN_FB_PROFILE_LINK`: Dedicated URL to the official profile (`https://www.facebook.com/profile.php?id=61590405043340`).

---

### 4. Technical Architecture & Data Strategy

```
┌──────────────────────────────────────────────────────────────┐
│                    Z.V.R Clan Data Layer                     │
│  MESSENGER_GC_LINK = "https://m.me/j/jqFOlcjcyHiKLSUN/..."   │
│  CLAN_FB_PROFILE   = "https://www.facebook.com/profile.php..."│
└──────────────────────────────┬───────────────────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
┌──────────────────────┐ ┌───────────────┐ ┌────────────────────┐
│   TopNav Component   │ │  Login/Forgot │ │   VerifiedScreen   │
│ GC & FB Profile btns │ │  FB Leadership│ │ "Buksan GC" action │
└──────────────────────┘ └───────────────┘ └────────────────────┘
```
