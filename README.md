# TIDA Academy — From Survival to System

A Swahili-first practical AI and digital business learning platform by TIDA TZ.

## Stack
- React + TypeScript + Vite
- Supabase Auth and PostgreSQL with Row Level Security
- Vercel hosting

## Local development
1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Run `npm run dev`

## Current implementation
- Responsive Swahili-first public landing page
- Student sign-up/sign-in interface wired to Supabase Auth
- Student workspace shell with learning, projects, assignments and community areas
- Initial isolated database schema and RLS migration in `supabase/migrations/`

## Remaining before production
- Create a dedicated TIDA Academy Supabase project and apply/verify the migration
- Configure environment variables and role provisioning
- Complete lesson player, assignment submission/review, community moderation, AI coach and payment workflows
- Run production QA and package Android app for Google Play

No sample student records, fabricated testimonials, or fake performance metrics are included.

## Security
Never expose a Supabase service-role key in browser code. The frontend uses only a publishable key; all exposed tables must have RLS policies.
