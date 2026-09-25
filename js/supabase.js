
        const SUPABASE_URL = "https://tudqrcmdncncoqctfdrj.supabase.co/rest/v1/";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1ZHFyY21kbmNuY29xY3RmZHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNzc3ODYsImV4cCI6MjEwNTY1Mzc4Nn0.BPcwINWu203NrWqj17-5wwcPqk8all8uhOhwmDr4860";
        const SUPABASE_CONFIGURED = Boolean(
            SUPABASE_URL &&
            SUPABASE_ANON_KEY &&
            SUPABASE_ANON_KEY !== "******" &&
            !SUPABASE_ANON_KEY.includes("your-actual")
        );
        window.SUPABASE_CONFIGURED = SUPABASE_CONFIGURED;
        window.SUPABASE_CONFIGURATION_ERROR = SUPABASE_CONFIGURED
            ? ''
            : 'Supabase is not configured. Add the anon public key in js/supabase.js.';
        const SUPABASE_BASE_URL = SUPABASE_URL.replace(/\/rest\/v1\/?$/, "");

        // The anon key is designed for browser use; protect your database with RLS policies.
        const supabaseClient = window.supabase.createClient(SUPABASE_BASE_URL, SUPABASE_ANON_KEY);
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
        async function getSupabaseUser() {
            if (!SUPABASE_CONFIGURED) return null;
            const { data, error } = await supabaseClient.auth.getUser();
            if (error) {
                console.error('Supabase user lookup failed:', error.message);
                return null;
            }
            return data.user || null;
        }
        async function requireSupabaseUser() {
            const user = await getSupabaseUser();
            if (!user) throw new Error('You must be signed in to perform this action.');
            return user;
        }
        function onSupabaseAuthStateChange(callback) {
            if (!SUPABASE_CONFIGURED) return () => {};
            const { data } = supabaseClient.auth.onAuthStateChange((event, session) => {
                callback(event, session ? session.user : null);
            });
            return () => data.subscription.unsubscribe();
        }
        async function signUpWithPassword(email, password, name, role) {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: { data: { name, role } }
            });
            if (error) throw error;
            return data;
        }
        async function signInWithPassword(email, password) {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            return data;
        }
        async function signOutUser() {
            const { error } = await supabaseClient.auth.signOut();
            if (error) throw error;
        }
        window.saveToSupabase = saveToSupabase;
        window.fetchFromSupabase = fetchFromSupabase;
        window.getSupabaseUser = getSupabaseUser;
        window.requireSupabaseUser = requireSupabaseUser;
        window.onSupabaseAuthStateChange = onSupabaseAuthStateChange;
        window.signUpWithPassword = signUpWithPassword;
        window.signInWithPassword = signInWithPassword;
        window.signOutUser = signOutUser;

        loadData();
// Paste the public values from your Supabase Dashboard here.
        const SUPABASE_URL = "https://tudqrcmdncncoqctfdrj.supabase.co/rest/v1/";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1ZHFyY21kbmNuY29xY3RmZHJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNzc3ODYsImV4cCI6MjEwNTY1Mzc4Nn0.BPcwINWu203NrWqj17-5wwcPqk8all8uhOhwmDr4860";
        const SUPABASE_CONFIGURED = Boolean(
            SUPABASE_URL &&
            SUPABASE_ANON_KEY &&
            SUPABASE_ANON_KEY !== "******" &&
            !SUPABASE_ANON_KEY.includes("your-actual")
        );
        window.SUPABASE_CONFIGURED = SUPABASE_CONFIGURED;
        window.SUPABASE_CONFIGURATION_ERROR = SUPABASE_CONFIGURED
            ? ''
            : 'Supabase is not configured. Add the anon public key in js/supabase.js.';
        const SUPABASE_BASE_URL = SUPABASE_URL.replace(/\/rest\/v1\/?$/, "");

        // The anon key is designed for browser use; protect your database with RLS policies.
        const supabaseClient = window.supabase.createClient(SUPABASE_BASE_URL, SUPABASE_ANON_KEY);
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
        async function getSupabaseUser() {
            if (!SUPABASE_CONFIGURED) return null;
            const { data, error } = await supabaseClient.auth.getUser();
            if (error) return null;
            return data.user || null;
        }
        async function signUpWithPassword(email, password, name) {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: { data: { name } }
            });
            if (error) throw error;
            return data;
        }
        async function signInWithPassword(email, password) {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            return data;
        }
        async function signOutUser() {
            const { error } = await supabaseClient.auth.signOut();
            if (error) throw error;
        }
        window.saveToSupabase = saveToSupabase;
        window.fetchFromSupabase = fetchFromSupabase;
        window.getSupabaseUser = getSupabaseUser;
        window.signUpWithPassword = signUpWithPassword;
        window.signInWithPassword = signInWithPassword;
        window.signOutUser = signOutUser;

        loadData();
