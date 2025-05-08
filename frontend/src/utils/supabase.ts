import { createClient } from "@supabase/supabase-js";

// Use the environment variables provided by the user
const supabaseUrl = "https://qijsgfwyhsuwekiubvbc.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpanNnZnd5aHN1d2VraXVidmJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MDI4NzMsImV4cCI6MjA2MTQ3ODg3M30.zJbq70qlGKOcd1oswlEkK5MiTqhqzxQ0Im9IevmnG8I";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is missing. Ensure they are set correctly.");
  // In a real app, you might want to throw an error or display a message to the user.
}

// Create and export the Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Keep user sessions persisted across browser tabs/windows
    persistSession: true,
    // Automatically refresh the auth token
    autoRefreshToken: true,
    // Detect session automatically from the URL, required for OAuth and password recovery flows
    detectSessionInUrl: true,
  },
});



// Helper function to get user profile data (including validation status)
export async function getUserProfile(userId: string) {
  if (!userId) {
    console.error("getUserProfile called with no userId");
    return null; // Or throw an error, depending on desired handling
  }
  try {
    const { data, error } = await supabase
      .from('users') // Correct table
      .select('id, statut_validation') // Select only needed fields
      .eq('id', userId)
      .single(); // Expect only one profile per user ID

    if (error) {
      if (error.code === 'PGRST116') {
         // PGRST116: PostgREST error code for "Resource Not Found" (0 rows)
         console.warn(`No profile found for user ID: ${userId}`);
         return null; // User exists in auth, but not in users table yet or was deleted
      } else {
        // Other potential errors (network, RLS, etc.)
        throw error;
      }
    }
    return data;
  } catch (err: any) {
    console.error("Error fetching user profile:", err.message);
    // Rethrow or return null based on how you want to handle errors upstream
    throw err; // Rethrow to let the calling component handle it (e.g., show error message)
  }
}

