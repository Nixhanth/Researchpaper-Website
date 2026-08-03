# Onboarding Session Architecture - Implementation Summary

## Problem Statement
The system was creating partial user records in the database during authentication BEFORE onboarding completion. This caused critical issues:
- **Null username errors**: Users existed without required fields like `displayName`
- **@mention crashes**: System called `toLower Case()` on null usernames
- **Data integrity issues**: Incomplete user records polluted the database

## Solution Implemented
Implemented delayed user creation using temporary onboarding sessions. Users are now created in the database ONLY after 100% complete onboarding.

---

## Architecture Changes

### 1. New Entity: OnboardingSession
**File**: `model/OnboardingSession.java`

Stores temporary authentication data before user creation:
- Session token (UUID-based)
- Email and OAuth provider details
- Full name and avatar from OAuth
- Hashed password (for step 0: password setting)
- Current onboarding step
- 24-hour expiration

### 2. Modified OAuth Flow
**Files**: 
- `service/CustomOAuth2UserService.java`
- `security/OAuth2SuccessHandler.java`

**Old Flow**: OAuth login → Create User immediately → Create Profile → Redirect

**New Flow**:
```
OAuth login
   ↓
Check if user exists in DB (completed onboarding before)
   ├─ YES → Update OAuth info, generate JWT, redirect to app
   └─ NO  → Create OnboardingSession, redirect with session_token
               ↓
            Frontend onboarding flow (password → form 1 → form 2)
               ↓
            /complete-oauth-onboarding endpoint
               ↓
            Create User + Profile atomically
               ↓
            Generate JWT, delete session, log in
```

### 3. New Auth Endpoints

#### `/api/auth/complete-oauth-onboarding`
- Accepts `sessionToken` + `ProfileDto`
- Validates session (not expired)
- Creates User + ResearcherProfile + AcademicDetail atomically
- All required fields (including username) must be present
- Deletes session after successful creation
- Returns JWT for authenticated access

#### Updated `/api/auth/set-password`
- Now accepts optional `sessionToken` parameter
- For OAuth users: stores hashed password in OnboardingSession
- For existing users: updates password directly

#### Updated `/api/auth/complete-onboarding`
- Now checks for `X-Session-Token` header
- If present, delegates to `/complete-oauth-onboarding`
- Otherwise, handles existing user profile completion

### 4. User Info Endpoint
**File**: `controller/UserController.java`

Updated `/api/v1/users/me` to handle onboarding sessions:
- Accepts `X-Session-Token` header
- If valid session: returns minimal user info with `ROLE_ONBOARDING`
- Provides email, name, avatar from session
- Frontend can access onboarding flow before DB user exists

---

## Frontend Integration Required

### 1. OAuth Callback Handler
Update to detect `session_token` vs `token` in URL:
```typescript
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
const sessionToken = params.get('session_token');

if (sessionToken) {
  // Store in sessionStorage or state
  // Redirect to onboarding wizard
} else if (token) {
  // Normal login flow
}
```

### 2. API Client Updates
Add session token to API requests during onboarding:
```typescript
// In api.ts or axios interceptor
if (sessionToken) {
  config.headers['X-Session-Token'] = sessionToken;
}
```

### 3. Onboarding Wizard
**File**: `components/OnboardingWizard.tsx`

Update to use session token for OAuth users:
- Step 0 (password): Call `/set-password?sessionToken=xxx`
- Final submission: Call `/complete-oauth-onboarding?sessionToken=xxx`
- After success: Clear sessionToken, log in with returned JWT

---

## Key Rules Enforced

1. ✅ **No partial users**: User record created ONLY after 100% onboarding
2. ✅ **Username required**: `displayName` is validated and must be unique before user creation
3. ✅ **Atomic creation**: User + Profile + AcademicDetail created in single transaction
4. ✅ **Session expiry**: 24-hour limit prevents abandoned sessions
5. ✅ **Clean data**: Sessions are deleted after successful user creation

---

## Database Schema
New table: `onboarding_sessions`
```
id                   UUID PRIMARY KEY
session_token        VARCHAR(255) UNIQUE NOT NULL
email                VARCHAR(255) NOT NULL
provider_id          VARCHAR(255)
auth_provider        ENUM('LOCAL', 'GOOGLE', 'ORCID')
full_name            VARCHAR(255)
avatar_url           TEXT
password             VARCHAR(255)  -- Hashed
current_step         INTEGER DEFAULT 0
created_at           TIMESTAMP NOT NULL
expires_at           TIMESTAMP NOT NULL
```

---

## Security Considerations

1. **Session tokens** are UUIDs, cryptographically random
2. **Passwords** are BCrypt hashed before storing in session
3. **Expiration** enforced at 24 hours
4. **Cleanup** happens on successful creation or expiry
5. **No access** to main app features until user exists in DB

---

## Testing Checklist

- [ ] Google OAuth: Verify session created, not user
- [ ] Password step: Verify password stored in session
- [ ] Onboarding completion: Verify user created atomically
- [ ] Username validation: Verify uniqueness checked
- [ ] Session expiry: Verify 24-hour timeout works
- [ ] Existing user: Verify OAuth login without onboarding
- [ ] @mention system: Verify no null username errors
- [ ] Local signup: Verify existing flow still works

---

## Migration Notes
- Existing incomplete OAuth users should complete onboarding on next login
- Database will auto-create `onboarding_sessions` table via Hibernate
- No migration script needed (ddl-auto: create)
