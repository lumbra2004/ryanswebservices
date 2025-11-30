// Supabase Configuration
// These credentials are safe to expose client-side (anon key is designed for public use)
const SUPABASE_URL = 'https://auth.ryanswebservices.com';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqbHVkbGVzd2l1cWx2b3NicHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTU0NDIsImV4cCI6MjA3OTU5MTQ0Mn0.VNvo4tjz_HafmQsvVkCBRiq8WmLrlhkPavNaB_3Exig';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
