# Dustin Courageous Adventure Club App

Standalone family and kid experience backed by the Dustin Courageous Adventure Club Supabase project.

See [Launch milestones](LAUNCH_MILESTONES.md) for the current implementation,
verification gaps, external dependencies and next delivery milestone.

## Development

1. Run `npm install`.
2. Run `npm run dev`.
3. Open the Vite development URL.

The Supabase publishable key is safe for browser use because database access is protected by Row Level Security. Never add a Supabase secret key or service-role key to this app.

## Deployment

Deploy this `club-app` directory as its own Netlify site or set it as the Netlify base directory for the Adventure Club subdomain.

Recommended production URL: `club.dustincourageous.com`.

## Initial foundation

The list below describes the original scaffold, not the current feature inventory.
Use the launch milestones above for current readiness and outstanding work.

- Guardian sign up and sign in
- Automatic profile creation through Supabase Auth
- Family hub creation
- Automatic free household membership assignment
- Protected child profiles
- Child selection
- XP, badge, streak, and challenge dashboard shell
- Parent family hub shell

The public Dustin Courageous website remains separate and is not modified by this app.
