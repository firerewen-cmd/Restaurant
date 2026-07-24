// Configurazione Supabase
const SUPABASE_URL = "https://sazqizeidcebjiuwhhcf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhenFpemVpZGNlYmppdXdoaGNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxOTg5NDUsImV4cCI6MjA5OTc3NDk0NX0.dFpnV1uDPmfFzVLB4sZG9UhsCV50nVMarlckcokUXa4";

// Inizializzazione del Client Globale
window.db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper Logout Globale per la Sidebar
async function logoutUser() {
    await window.db.auth.signOut();
    window.location.href = 'login.html';
}

// Helper Controllo Accesso
async function checkAuth() {
    const { data: { session } } = await window.db.auth.getSession();
    if (!session && !window.location.pathname.includes('login.html') && !window.location.pathname.includes('index.html')) {
        window.location.href = 'login.html';
        return null;
    }
    return session?.user;
}