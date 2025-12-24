# 925 ADHD Member App

Member dashboard and login system for 925 ADHD.

## Setup

This app uses [Supabase](https://supabase.com) for authentication.

### Files
- `index.html` - Redirects to login
- `login.html` - Magic link & Google login
- `dashboard.html` - Member dashboard (protected)

### Deployment
1. Enable GitHub Pages in repo settings
2. Point `app.925adhd.com` to this GitHub Pages site
3. Configure Supabase redirect URLs to match

### Supabase Config
- Project URL: `https://ietkanacfoyoswioapqg.supabase.co`
- Redirect URLs needed:
  - `https://app.925adhd.com/dashboard.html`
  - `https://app.925adhd.com/login.html`
