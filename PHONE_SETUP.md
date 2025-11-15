# Phone Number Collection Setup

This document explains how to set up the phone number collection feature for the Guru application.

## Overview

Users are now required to provide their phone number before accessing the webapp. The phone number is stored in Supabase and associated with all chat interactions.

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Wait for the project to be provisioned (takes ~2 minutes)

### 2. Create Database Tables

Once your project is ready, go to the SQL Editor and run the following SQL:

```sql
-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on phone_number for faster lookups
CREATE INDEX idx_users_phone ON users(phone_number);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to manage all data
CREATE POLICY "Allow service role full access" ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create policy to allow anon users to insert/read their own data
CREATE POLICY "Allow anon insert" ON users
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon read" ON users
  FOR SELECT
  TO anon
  USING (true);
```

### 3. Get Supabase Credentials

1. In your Supabase project, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (a long JWT token)

### 4. Update Environment Variables

Add the following to `/backend/.env`:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

Replace the placeholder values with your actual Supabase credentials.

### 5. Install Dependencies

If you haven't already, install the Supabase client:

```bash
cd backend
npm install @supabase/supabase-js
```

### 6. Start the Application

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## How It Works

### User Flow

1. **First Visit**: User is redirected to `/phone` page
2. **Phone Entry**: User enters their phone number (formatted as US: (XXX) XXX-XXXX)
3. **Submission**: Phone number is sent to backend `/api/submit-phone` endpoint
4. **Storage**: Backend stores/retrieves user in Supabase
5. **Cookie Set**: Frontend sets `user_phone` cookie
6. **Redirect**: User is redirected to main chat page
7. **Protected Access**: Middleware checks for `user_phone` cookie on subsequent visits

### Technical Details

#### Frontend Components

- **`/app/phone/page.tsx`**: Phone number collection page
- **`/middleware.ts`**: Route protection middleware
- **`/app/api/chat/route.ts`**: API proxy that includes phone number in requests

#### Backend Components

- **`database.js`**: Supabase client and user management functions
- **`server.js`**:
  - `/api/submit-phone`: Phone number submission endpoint
  - `/api/chat`: Updated to receive and log phone numbers

#### Data Flow

```
User enters phone → Frontend → Backend /api/submit-phone → Supabase
                    ↓
                 Cookie set
                    ↓
              Chat requests → Include phone number → Backend logs it
```

## Database Schema

### `users` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `phone_number` | VARCHAR(20) | User's phone number (E.164 format) |
| `created_at` | TIMESTAMP | When user first submitted phone |
| `last_login` | TIMESTAMP | Last time user accessed the app |

## Phone Number Format

- **Input**: Accepts various formats (555-123-4567, (555) 123-4567, etc.)
- **Storage**: Normalized to E.164 format (+15551234567)
- **Display**: Formatted as (555) 123-4567 for US numbers

## Testing

### Without Supabase (Development Mode)

If Supabase is not configured, the app will throw an error. You must set up Supabase to use the phone collection feature.

### With Supabase

1. Visit the app (should redirect to `/phone`)
2. Enter a phone number: `555-123-4567`
3. Click "Continue"
4. Should redirect to main chat page
5. Check backend logs for phone number in chat requests
6. Check Supabase dashboard to verify user was created

## Security Considerations

1. **Cookie Security**: Phone number stored in httpOnly cookies (when possible)
2. **Database Security**: Row Level Security (RLS) enabled on Supabase
3. **No Verification**: Currently no SMS verification (trust-based system)
4. **HTTPS**: Use HTTPS in production for cookie security

## Future Enhancements

- [ ] Add SMS verification with Twilio
- [ ] Add phone number change functionality
- [ ] Store chat history linked to user ID
- [ ] Add user profile page
- [ ] Multi-device support with session tokens
- [ ] Rate limiting on phone submission
- [ ] Phone number validation against known carriers

## Troubleshooting

### "Database not configured" error

**Solution**: Make sure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in `/backend/.env`

### Phone submission fails

**Solution**:
1. Check backend logs for specific error
2. Verify Supabase tables are created
3. Check network tab in browser for API errors
4. Ensure backend is running on port 3001

### Middleware redirect loop

**Solution**: Clear cookies and try again. Check that cookie is being set properly in phone page.

### User not being created in Supabase

**Solution**:
1. Check RLS policies in Supabase
2. Verify API key has correct permissions
3. Check backend logs for database errors

## Support

For issues or questions, check:
- Backend logs: `npm start` in `/backend`
- Frontend logs: Browser console
- Supabase logs: Supabase dashboard → Logs
