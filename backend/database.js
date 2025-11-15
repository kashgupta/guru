import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase connection
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// Normalize phone number to E.164 format
function normalizePhoneNumber(phoneNumber) {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');

  // If it starts with 1 and has 11 digits (US/Canada), keep as is
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return '+' + cleaned;
  }

  // If it has 10 digits, assume US/Canada and add +1
  if (cleaned.length === 10) {
    return '+1' + cleaned;
  }

  // If it already starts with country code
  if (cleaned.length > 10) {
    return '+' + cleaned;
  }

  return phoneNumber; // Return as-is if we can't parse it
}

// User management functions
export async function createOrGetUser(phoneNumber) {
  if (!supabase) {
    throw new Error('Database not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env');
  }

  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  // Check if user exists
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('phone_number', normalizedPhone)
    .single();

  if (existingUser) {
    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('phone_number', normalizedPhone);

    return existingUser;
  }

  // Create new user
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert([
      {
        phone_number: normalizedPhone,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      }
    ])
    .select()
    .single();

  if (createError) {
    throw createError;
  }

  return newUser;
}

export async function getUserByPhone(phoneNumber) {
  if (!supabase) {
    throw new Error('Database not configured');
  }

  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('phone_number', normalizedPhone)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
    throw error;
  }

  return data;
}

export default supabase;
