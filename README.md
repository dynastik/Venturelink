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
- Safer rendering of user-generated text and HTTPS validation for startup contact URLs


## License

No open-source license has been selected yet. Until a license is added, all rights are reserved by the project owner.
