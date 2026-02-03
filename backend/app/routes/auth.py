from fastapi import APIRouter

router = APIRouter()

# OBSOLETE ROUTES
# The following routes have been replaced by Supabase Auth on the Frontend:
# - POST /login/
# - POST /register/
# - POST /refresh-token/
#
# Authentication is now handled client-side using Supabase SDK.
# Backend verifies tokens using app.core.auth.verify_token
