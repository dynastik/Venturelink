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

## Testing status

Before the first public release, this project still needs:

- Supabase Auth with email/password or magic-link login
- Session restoration and logout
- Founder and investor roles
- Ownership-based RLS policies
- Authenticated UUID-based user identities
- Secure validation of user input and URLs
- Safer rendering of database content
- Structured fundraising fields
- Real connection-request and match states
- Error handling and loading states
- Mobile and cross-browser testing
- Backup and moderation procedures

The current application contains prototype/demo behavior, including local browser storage and incomplete authentication. It should not yet be used to store sensitive user information or confidential investment data.

## License

No open-source license has been selected yet. Until a license is added, all rights are reserved by the project owner.
