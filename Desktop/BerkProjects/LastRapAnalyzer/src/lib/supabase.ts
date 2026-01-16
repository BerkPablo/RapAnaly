
import { createClient } from '@supabase/supabase-js';

// Access environment variables (Vite allows access via import.meta.env)
// We use fallback values to prevent crash if not yet set, but auth will fail.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yxcfsimhrittpynxfyec.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_8ZGFvFsovYN7ml6wMM7Kzw_HSJVhCsO';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
