# Google OAuth sign-in

Tartly uses Google as its only interactive sign-in. The email/password login
form is removed from `/login`; the API endpoints remain for existing
integrations and admin-created accounts.

## Flow

1. `/login` renders the Tartly lockup and a single **Continue with Google**
   link to `/api/auth/google`.
2. The landing hero **Start tracking** form posts to `/api/auth/google` with
   `returnUrl=/onboarding` and the domain the visitor typed. `/signup` is a
   redirect to the same flow, so no password signup screen is reachable.
3. `GET /api/auth/google` creates a random `state`, seals
   `{ state, returnUrl }` in an encrypted, short-lived cookie
   (`rl_google_oauth`, 10 minutes), and redirects to Google. A landing-page
   domain is added to the sealed `returnUrl` as `/onboarding?website=...`.
4. Google redirects to `/api/auth/google/callback`.
5. The callback requires the URL `state` to match the signed cookie value.
   It exchanges the code, reads the OpenID userinfo profile, and accepts the
   identity only when Google reports `email_verified: true`.
6. An existing Google subject wins. Otherwise a matching normalized email is
   linked to the Google subject. A new email creates the user, personal
   workspace, and `OWNER` membership. Deleted and suspended accounts are never
   revived.
7. A durable PostgreSQL session is created with the existing HttpOnly
   `rl_session` cookie, then the browser returns to the sealed `returnUrl`
   (default `/app`). Onboarding pre-fills the website carried from the landing
   page.

## Configuration

Create an OAuth 2.0 **Web application** in Google Cloud Console.

Authorized redirect URI:

```text
https://tartly.in/api/auth/google/callback
http://localhost:3000/api/auth/google/callback   # local only
```

Environment:

```dotenv
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
# Optional when the callback host differs from APP_URL.
GOOGLE_REDIRECT_URI=
```

`APP_URL` must be the public origin in production. Without it the callback URI
is derived from the request host, which is acceptable locally but fragile
behind multiple proxy hosts.

Missing credentials do not crash the page: the login button returns
`/login?error=google-unavailable`.

## Data model

Migration `20261109120000_google_oauth`:

- `user.google_id VARCHAR(255)` with a unique index (multiple `NULL` values are
  allowed for password/admin accounts).
- `user.password` becomes nullable because Google-created accounts have no
  password hash.

## Security notes

- State is signed and encrypted with `APP_SECRET`, and compared in constant
  time.
- The callback is rate limited by hashed IP (30 attempts / 15 minutes).
- Google access tokens, client secrets, and email addresses are not logged.
- Linking requires a Google-verified email; an existing account is never
  linked on an unverified address.
- The OAuth state cookie is `HttpOnly`, `SameSite=Lax`, scoped to
  `/api/auth/google`, and `Secure` whenever the session cookie is secure.
