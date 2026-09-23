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

## GitHub Pages deployment

GitHub Pages should publish from the `main` branch using the repository root:

1. Open the repository on GitHub.
2. Go to **Settings** → **Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and the `/ (root)` folder.
5. Save the settings.

GitHub Pages automatically serves `index.html` as the site entry point.

If the repository is named `cslid`, the default project URL will usually look like:

```text
https://YOUR-GITHUB-USERNAME.github.io/cslid/
```

## Local testing

The project is a static website and does not currently require a build step.

For the most reliable local testing, serve the project through a local web server instead of opening `index.html` directly:

```powershell
cd "path\to\cslid"
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

If Python is not installed, the site can also be tested using a static-server extension in your code editor.

## Supabase setup

The browser client configuration is in [`js/supabase.js`](./js/supabase.js).

The public Supabase URL and anonymous key are allowed to be used in frontend code. However, the database must be protected by correct Row Level Security (RLS) policies. The anonymous key must never be replaced with a Supabase service-role key.

To prepare the database:

1. Open the Supabase project.
2. Open **SQL Editor**.
3. Review [`supabase-schema.sql`](./supabase-schema.sql).
4. Run the schema only after checking the policies.
5. Confirm that private user data cannot be read or changed by another user.

The current application still contains prototype/demo behavior, including local browser storage and incomplete authentication. Do not use it to store sensitive user information or confidential investment data yet.

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

## Development guidelines

- Keep `index.html` focused on page structure.
- Put visual styling in `css/styles.css`.
- Put application behavior in `js/app.js`.
- Keep Supabase access helpers in `js/supabase.js`.
- Use relative paths so the site works under a GitHub Pages project URL.
- Do not commit passwords, service-role keys, private tokens, or confidential data.
- Test locally before pushing changes to `main`.
- Treat `main` as the deployable testing branch.

## Roadmap

### Phase 1: Secure foundation

- Implement Supabase Auth.
- Replace localStorage identity with `auth.users.id`.
- Rewrite database policies for least-privilege access.
- Add clear loading and error states.

### Phase 2: Product model

- Add separate founder and investor profiles.
- Add structured startup and fundraising information.
- Separate likes, passes, connection requests, matches, saved profiles, and blocked profiles.

### Phase 3: Release preparation

- Add moderation and reporting.
- Improve accessibility and mobile layouts.
- Add automated checks.
- Test the GitHub Pages deployment.
- Publish a clear privacy policy and terms before onboarding real users.

## License

No open-source license has been selected yet. Until a license is added, all rights are reserved by the project owner.
