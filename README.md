# cslid.

> **Status: Testing / Pre-release**

cslid. is a startup launchpad and founder-investor matching prototype. It is designed to help founders present their startups, discover potential investors or collaborators, share progress updates, and prepare fundraising material.

This project is currently in testing. It is not yet ready for real users or production investment decisions.

## Current features

- Startup matching/swipe deck
- Startup profile creation
- Founder profile area
- Startup directory
- Journey/feed posts
- Basic messaging interface
- Launch Center with startup preparation tools
- Template-based pitch text generator (not connected to an AI service)
- Light and dark themes
- Supabase client integration scaffold

## Repository structure

```text
cslid/
├── index.html              # GitHub Pages entry point and page markup
├── favicon.svg             # Website favicon
├── README.md               # Project documentation
├── supabase-schema.sql     # Database tables and policies
├── css/
│   └── styles.css          # Custom styles
└── js/
    ├── app.js              # Application behavior and UI logic
    └── supabase.js         # Supabase client and database helpers
```

## Current testing status

The current MVP includes:

- Supabase email/password authentication, session restoration, logout, and password reset
- Founder and investor roles with role-aware navigation
- Role-specific workspaces: founders manage Launch Center and requests; investors discover startups in Match Deck
- UUID-based identities and ownership-based RLS policies
- Persistent startup profiles, journey posts, connection requests, matches, and messages
- Connection lifecycle: pending request, founder accept/reject, and shared match creation
- Central Connections screen for incoming, sent, and accepted connections
- Messaging restricted to accepted connections
- Conversation previews and local unread-message indicators for accepted connections
- Automatic Supabase refresh while signed in, plus a manual Connections refresh button
- Supabase Realtime updates for messages, connections, and matches
- Persistent browser sessions with automatic token refresh
- Founder startup drafts with explicit publish/unpublish control
- Safer rendering of user-generated text and HTTPS validation for startup contact URLs
- Basic safety controls: server-enforced connection/message limits, block/report actions, data export, and account deletion

## Safety and account controls

The `supabase-schema.sql` file is a **destructive full reset**: it deletes every Supabase Auth user and all cslid app data, then recreates the tables, policies, triggers, and RPC functions. Export anything you need first. After running it, create fresh test accounts. It enforces a maximum of 20 new connection requests per account per 24 hours and 100 messages per account per hour, in addition to browser-side feedback limits. Users can report or block a person from an open message thread. Blocking removes the connection and conversation and prevents new requests or messages in either direction.

From **Profile**, a signed-in user can download a JSON export of their account data or permanently delete the account and associated application data. Account deletion is irreversible. Keep a backup of important data before testing it.

Message delivery uses the authenticated `send_connection_message` RPC. The full-reset schema installs the correct message-only rate-limit trigger and RPC. After running it, deploy the updated `js/app.js` and `js/supabase.js`, then create fresh test accounts. The RPC derives the sender from `auth.uid()` and verifies the accepted connection and block state before inserting.

## Remaining beta limitations

- Feed like, comment, and share controls are visual placeholders and do not persist actions.
- Reports are stored for manual review in Supabase; there is no in-app moderator queue or notification.
- The pitch builder uses a fixed text template, not an AI service.
- Tailwind is loaded from its CDN, which is suitable for prototyping but not recommended for a production build.
- No automated test or build scripts are configured yet.

## License

No open-source license has been selected yet. Until a license is added, all rights are reserved by the project owner.
