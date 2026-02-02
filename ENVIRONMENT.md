# PGREP Environment Variables

Create a `.env.local` file in the project root with the following values:

```
STEAM_WEB_API_KEY=your_steam_web_api_key
LEETIFY_API_KEY=your_leetify_api_key
FACEIT_SERVER_API_KEY=your_faceit_server_api_key
FACEIT_CLIENT_API_KEY=your_faceit_client_api_key
LEETIFY_BASE_URL=https://api-public.cs-prod.leetify.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ADMIN_STATS_TOKEN=your_admin_stats_token
ADMIN_STEAM_IDS=comma_separated_admin_steam_ids
REFRESH_WORKER_KEY=your_refresh_worker_key
REFRESH_COOLDOWN_MINUTES=5
PROFILE_CACHE_MAX_AGE_MINUTES=360
RATE_LIMIT_MAX=120
RATE_LIMIT_WINDOW_MS=60000
FORCE_HTTPS=true
REFRESH_BACKOFF_BASE_SECONDS=60
REFRESH_BACKOFF_MAX_SECONDS=900
REFRESH_PROCESSING_TIMEOUT_MINUTES=15
REFRESH_QUEUE_TIMEOUT_MINUTES=120
CACHE_CLEANUP_DAYS=45
```

Notes:
- Keep keys server-side only. Never commit `.env.local`.
- The FACEIT server key is used in server API routes.

Windows quick create (PowerShell):
```
New-Item -Path . -Name ".env.local" -ItemType "File"
notepad .env.local
```
