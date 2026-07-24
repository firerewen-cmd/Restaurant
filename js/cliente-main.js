// ==========================================
// LOGICA CLIENTE CON LOOK PROFESSIONALE
// ==========================================

let currentTable = "1";
let categoriesCache = [];
let dishesCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Recupera il numero del tavolo dall'URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('tavolo')) {
        currentTable = urlParams.get('tavolo');
    }
    document.getElementById('tableDisplay').textContent = `TAVOLO ${currentTable}`;

    // 2. Inizializza stelle del feedback moderne
    initStarRating();

    // 3. Carica il menu
    await loadMenu();

    // 4. Attiva il Realtime per il menu
    setupRealtime();

    // 5. Invia Feedback
    document.getElementById('submitFeedback').addEventListener('click', handleSendReview);
});

// -- GESTIONE DELLE STELLE DEL FEEDBACK --
function initStarRating() {
    const stars = document.querySelectorAll('#starRatingContainer .star');
    const textArea = document.getElementById('reviewText');

    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            const value = star.getAttribute('data-value');
            
            // Attiva le stelle fino a quella cliccata
            stars.forEach((s, i) => {
                if (i < value) s.classList.add('active');
                else s.classList.remove('active');
            });
            
            textArea.setAttribute('data-rating', value); // Memorizza il voto
        });
    });
}

// -- POPOLAMENTO DEL MENU PROFESSIONALE --
async function loadMenu() {
    // Recupera Categorie e Piatti
    const { data: catData } = await window.db.from('menu_categorie').select('*').order('id', { ascending: true });
    categoriesCache = catData || [];

    const { data: dishData } = await window.db.from('menu_piatti').select('*').order('id', { ascending: true });
    dishesCache = dishData || [];

    renderMenuUI();
}

function renderMenuUI() {
    const container = document.getElementById('menuContainer');
    container.innerHTML = ''; // Svuota il contenitore

    if (categoriesCache.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: var(--space-m);">Menu in aggiornamento. Torna a trovarci presto!</p>`;
        return;
    }

    // Per ogni categoria...
    categoriesCache.forEach(cat => {
        // Filtra i piatti per questa categoria
        const categoryDishes = dishesCache.filter(dish => dish.categoria_id === cat.id);
        if (categoryDishes.length === 0) return; // Salta categorie vuote

        // Crea sezione HTML professionale per la categoria
        let sectionHTML = `
            <section>
                <h2 class="category-title">${cat.nome}</h2>
                <div class="menu-section">
        `;

        // Aggiungi i piatti
        categoryDishes.forEach(dish => {
            const isOutOfStockClass = dish.disponibile === false ? 'esaurito' : '';
            
            sectionHTML += `
                <article class="dish-card ${isOutOfStockClass}">
                    <div class="dish-header">
                        <span class="dish-name">${dish.nome}</span>
                        <span class="dish-price">€${parseFloat(dish.prezzo).toFixed(2)}</span>
                    </div>
                    ${dish.descrizione ? `<p class="dish-desc">${dish.descrizione}</p>` : ''}
                </article>
            `;
        });

        sectionHTML += `</div></section>`;
        container.innerHTML += sectionHTML;
    });
}

// -- REALTIME: Aggiorna il menu se cambia qualcosa (es. piatto finito) --
function setupRealtime() {
    window.db
        .channel('menu-client-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_piatti' }, () => loadMenu())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_categorie' }, () => loadMenu())
        .subscribe();
}

// -- INVIA FEEDBACK PROFESSIONALE --
async function handleSendReview() {
    const textArea = document.getElementById('reviewText');
    const commento = textArea.value.trim();
    const stelle = parseInt(textArea.getAttribute('data-rating')) || 0; // Prende il voto memorizzato
    
    if (stelle === 0) {
        alert('Per favore, seleziona una valutazione in stelle!');
        return;
    }

    // Invia a Supabase (tabella 'feedback')
    const { error } = await window.db.from('feedback').insert([
        { stelle, commento, tavolo: currentTable }
    ]);

    if (error) {
        alert('Errore durante l\'invio del feedback. Riprova!');
        return;
    }

    // Messaggio di successo elegante
    alert('Grazie per la tua recensione! È stata inviata con successo.');
    textArea.value = '';
    // Resetta le stelle
    document.querySelectorAll('#starRatingContainer .star').forEach(s => s.classList.remove('active'));
    textArea.removeAttribute('data-rating');
}