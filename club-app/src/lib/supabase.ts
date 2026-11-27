import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";

const fallbackUrl = "https://vrixketvinzhsfwwcqiu.supabase.co";
const fallbackPublishableKey = "sb_publishable_poxknCA711Rb-Vk6Tci7yg_uQnpDV6q";

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL || fallbackUrl,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || fallbackPublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
