"use strict";

const SUPABASE_URL =
    "https://qgtacmzjaomfalfowhtj.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Ctp3nPGdtIo0bbl8VfYi2A_jwOxBC71";

window.nexoraSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);