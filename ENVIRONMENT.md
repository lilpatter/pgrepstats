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
```

Notes:
- Keep keys server-side only. Never commit `.env.local`.
- The FACEIT server key is used in server API routes.

Windows quick create (PowerShell):
```
New-Item -Path . -Name ".env.local" -ItemType "File"
notepad .env.local
```
