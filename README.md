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
- Investor pitch-generation prototype
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

Run the current `supabase-schema.sql` in the Supabase SQL Editor before using these controls. The schema enforces a maximum of 20 new connection requests per account per 24 hours and 100 messages per account per hour, in addition to the browser’s immediate feedback limits. Users can report or block a person from an open message thread. Blocking removes the connection and conversation and prevents new requests or messages in either direction.

From **Profile**, a signed-in user can download a JSON export of their account data or permanently delete the account and associated application data. Account deletion is irreversible. Keep a backup of important data before testing it.

If message sends fail after deploying the safety controls, run `supabase-messaging-fix.sql` in the Supabase SQL Editor. This is a non-destructive migration that replaces the action-limit triggers without dropping application tables or data. Deploy the updated `js/app.js` and `js/supabase.js` as well.


## License

No open-source license has been selected yet. Until a license is added, all rights are reserved by the project owner.
