// ==========================================
// LOGICA DI BASE DASHBOARD & NAVIGAZIONE
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verifichiamo subito l'autenticazione dell'utente
    const user = await checkAuth();
    if (!user) return; // Se non è loggato, checkAuth() lo reindirizza al login

    // 2. Gestione Switch dei Tab (Navigazione Sidebar)
    const navLinks = document.querySelectorAll('.sidebar-menu .nav-link');
    const tabContents = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('pageTitle');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Rimuovi la classe active da tutti i link e dai tab
            navLinks.forEach(l => l.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Aggiungi la classe active al link cliccato
            link.classList.add('active');

            // Mostra la sezione corrispondente
            const targetTabId = link.getAttribute('data-tab');
            document.getElementById(targetTabId).classList.add('active');

            // Aggiorna il titolo nella Topbar
            pageTitle.textContent = link.textContent;
        });
    });

    // 3. Gestione Cambio Tema (Chiaro / Scuro)
    const themeBtn = document.getElementById('themeToggleBtn');
    
    // Controlla se il tema scuro era già salvato nel LocalStorage
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        themeBtn.textContent = '☀️ Tema Chiaro';
    }

    themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
            themeBtn.textContent = '☀️ Tema Chiaro';
        } else {
            localStorage.setItem('theme', 'light');
            themeBtn.textContent = '🌙 Tema Scuro';
        }
    });
});