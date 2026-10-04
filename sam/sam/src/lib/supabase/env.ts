// NEXT_PUBLIC_* values are inlined at build time, so each must be referenced literally.
// Supabase now calls this key "publishable"; the older name is "anon". Either works.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!;
