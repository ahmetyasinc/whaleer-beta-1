from fastapi import APIRouter

router = APIRouter()

# OBSOLETE ROUTES
# The following routes have been replaced by Supabase Auth (or should be).
# - GET /api/auth/google/start
# - GET /auth/google/callback
#
# Google Authentication should be configured in Supabase Dashboard.
# Frontend should use supabase.auth.signInWithOAuth({ provider: 'google' })
