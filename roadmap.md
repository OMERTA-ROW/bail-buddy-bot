# Postbail Roadmap

## Shipped
- Landing page, email auth, profiles
- Inmate watchlist (add / track / status timeline)
- Bondsman directory + bondsman signup
- Status event history

## In progress
- **Multi-account + payment layers** (requested 2026-09-02)
  - Account holders: individual logins, profiles, own watchlists — already exists, extending
  - Main funding account: shared pool with balance, contributions, payout history
  - Personal debit card: per-holder backup payment method (tokenized, no raw PAN stored)
  - Payment method management: add / remove / set default; pool owner controls draw permission + per-holder spending limits

- **Cosigners & documents** (requested 2026-09-09)
  - Cosigner intake (identity, address history, employer, relationship, gov ID upload) — shipped
  - Release custody plan per case, required before bond submission — shipped
  - Invite cosigner by email/SMS (record kept; real sending pending Twilio/email provider)
  - DocuSign e-signature layer: indemnity, bond application, disclosure — shipped, runs in
    simulation until DOCUSIGN_* secrets are added
  - Documents-on-file view with per-document status and timestamps — shipped

- **Card & phone activation** (requested 2026-09-09)
  - Unique 10-char activation code + 6-digit phone PIN per holder, generated on signup, regenerable
  - Wallet-card data + owner-only CSV export for a card printing vendor
  - `POST /api/public/activate-by-phone` accepts a PIN (JSON or Twilio form post, TwiML optional)
    and flips tracking active; protect with PHONE_ACTIVATION_SECRET once a line is provisioned
  - Tracking status, activation method, and timestamped activation log on the dashboard
  - Call-in number configurable by the funding account owner
  - Wallet card page (print/flip/QR) + physical-card fulfillment requests — shipped
  - $2 card fee (memorability by design) gating print/email/mail options, with receipt —
    shipped, simulated until Lovable Payments is enabled; confirmation email pending sending domain

## Next up
- **Call-in activation number** (requested 2026-07-19, not yet built)
  - Per-account activation PIN + per-inmate activation code
  - Phase 1: in-app activation (no telephony dependency)
  - Phase 2: Twilio IVR / SMS number so a holder can activate from the jail lobby by phone
- Real jail roster data (VINELink partnership, per-county scrapers)
- SMS/email alerts on status change (Twilio or GatewayAPI connector)

## Compliance guardrails (do not violate)
- Postbail is **not** a bail agency and **not** a money transmitter.
- The funding pool is an **earmarked ledger**, not custodial money. Disbursements are
  authorizations routed to a state-licensed bail agent — the app never posts bond directly.
- **Never store raw card numbers.** Payment methods hold processor tokens + brand/last4 only.
- Commercial bail is prohibited in IL, KY, OR, WI — referral and payout must stay disabled there.
- Fallback to a holder's personal card requires that holder's explicit, recorded consent.
