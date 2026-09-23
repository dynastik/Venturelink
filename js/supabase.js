// Paste the public values from your Supabase Dashboard here.
        const SUPABASE_URL = "https://tudqrcmdncncoqctfdrj.supabase.co/rest/v1/";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1ZHFyY21kbmNuY29xY3RmZHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNzc3ODYsImV4cCI6MjEwNTY1Mzc4Nn0.BPcwINWu203NrWqj17-5wwcPqk8all8uhOhwmDr4860";
        const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes("your-actual"));
        const SUPABASE_BASE_URL = SUPABASE_URL.replace(/\/rest\/v1\/?$/, "");

        // The anon key is designed for browser use; protect your database with RLS policies.
        const supabaseClient = window.supabase.createClient(SUPABASE_BASE_URL, SUPABASE_ANON_KEY);
        window.SUPABASE_CONFIGURED = SUPABASE_CONFIGURED;

        async function loadData() {
            if (!SUPABASE_CONFIGURED) {
                console.info("Supabase is ready for configuration. Add your project URL and anon key.");
                return;
            }
            console.info("Supabase client initialized. Run supabase-schema.sql to create the cslid tables.");
        }

        async function saveToSupabase(table, row) {
            if (!SUPABASE_CONFIGURED) return null;
            const { data, error } = await supabaseClient.from(table).upsert(row).select().single();
            if (error) {
                console.error(`Supabase ${table} save failed:`, error.message);
                return null;
            }
            return data;
        }
        async function fetchFromSupabase(table) {
            if (!SUPABASE_CONFIGURED) return [];
            const { data, error } = await supabaseClient.from(table).select('*');
            if (error) {
                console.error(`Supabase ${table} load failed:`, error.message);
                return [];
            }
            return data || [];
        }
        window.saveToSupabase = saveToSupabase;
        window.fetchFromSupabase = fetchFromSupabase;

        loadData();
