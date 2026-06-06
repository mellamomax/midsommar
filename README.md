# Midsommar

Mobilapp for midsommar pa Taltrastvagen.

## Backend

- Supabase project: `wugavohwdfuhahbwxcea`
- Region: `eu-north-1`
- URL: `https://wugavohwdfuhahbwxcea.supabase.co`
- Shared state table: `public.app_state`
- Image bucket: `proofs`

The app stores the current profile/page locally per device, but syncs party data through Supabase:

- OSA
- points
- missions
- bingo
- proof images
- match votes
- vote corrections
- five-game scores

## Deploy

This is a static site. Deploy the repository root to Vercel with no build command and no output directory.

Local preview:

```powershell
python -m http.server 5174 --bind 127.0.0.1
```

