// ==========================================
// VISTA CLIENTE REALTIME H24
// ==========================================

let categoriesCache = [];
let dishesCache = [];
let outOfStockTags = new Set();
let currentTable = "1";

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Rileva il numero del tavolo dall'URL (es. index.html?tavolo=4)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('tavolo')) {
        currentTable = urlParams.get('tavolo');
    }
    document.getElementById('tableDisplay').textContent = `TAVOLO ${currentTable}`;

    // 2. Inizializza i componenti grafici delle stelle
    initStarRating();

    // 3. Carica inizialmente i dati
    await loadClientData();

    // 4. Connette il client in REALTIME al database di Supabase
    setupClientRealtime();

    // Event listener per l'invio della recensione
    document.getElementById('clientReviewForm').addEventListener('submit', handleSendReview);
});

// ------------------------------------------
// 1. CARICAMENTO E RENDERING
// ------------------------------------------
async function loadClientData() {
    // A. Scarica le categorie
    const { data: catData } = await window.db.from('categorie').select('*').order('id', { ascending: true });
    categoriesCache = catData || [];

    // B. Scarica gli ingredienti esauriti
    const { data: outData } = await window.db.from('ingredienti_esauriti').select('tag_nome');
    outOfStockTags = new Set((outData || []).map(item => item.tag_nome.toLowerCase()));

    // C. Scarica i piatti
    const { data: dishData } = await window.db.from('piatti').select('*').order('id', { ascending: true });
    dishesCache = dishData || [];

    renderClientUI();
}

function renderClientUI() {
    // Rendering Tab Categorie
    const tabsContainer = document.getElementById('clientCategoryTabs');
    let tabsHTML = `<button class="cat-tab active" onclick="filterClientCategory('all')">TUTTI</button>`;
    categoriesCache.forEach(cat => {
        tabsHTML += `<button class="cat-tab" onclick="filterClientCategory(${cat.id})">${cat.nome.toUpperCase()}</button>`;
    });
    tabsContainer.innerHTML = tabsHTML;

    // Rendering Griglia Menu
    const menuContainer = document.getElementById('clientMenuContainer');
    menuContainer.innerHTML = '';

    if (categoriesCache.length === 0) {
        menuContainer.innerHTML = `<p style="color: var(--text-muted); text-align: center;">Menu in aggiornamento...</p>`;
        return;
    }

    categoriesCache.forEach(cat => {
        const categoryDishes = dishesCache.filter(d => d.categoria_id === cat.id);
        if (categoryDishes.length === 0) return;

        let sectionHTML = `
            <div class="dish-section" id="client-cat-${cat.id}">
                <div class="category-heading">${cat.nome}</div>
        `;

        categoryDishes.forEach(dish => {
            // Controllo se il piatto contiene ingredienti esauriti
            const tags = dish.ingredienti_tags ? dish.ingredienti_tags.split(',').map(t => t.trim().toLowerCase()) : [];
            const isOutOfStock = tags.some(t => outOfStockTags.has(t)) || dish.disponibile === false;

            // Allergeni UE
            const allergens = dish.allergeni || [];
            const allergensHTML = allergens.map(a => `<span class="client-allergen-badge">⚠️ ${a}</span>`).join('');

            sectionHTML += `
                <div class="client-dish-card ${isOutOfStock ? 'disabled' : ''}">
                    <div class="dish-top">
                        <span class="dish-name">${dish.nome}</span>
                        <span class="dish-price">€${parseFloat(dish.prezzo).toFixed(2)}</span>
                    </div>
                    ${dish.descrizione ? `<div class="dish-description">${dish.descrizione}</div>` : ''}
                    <div class="allergens-row">${allergensHTML}</div>
                </div>
            `;
        });

        sectionHTML += `</div>`;
        menuContainer.innerHTML += sectionHTML;
    });
}

// ------------------------------------------
// 2. FILTRAGGIO CATEGORIE
// ------------------------------------------
function filterClientCategory(catId) {
    document.querySelectorAll('.cat-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    if (catId === 'all') {
        document.querySelectorAll('.dish-section').forEach(sec => sec.style.display = 'block');
    } else {
        document.querySelectorAll('.dish-section').forEach(sec => {
            sec.style.display = (sec.id === `client-cat-${catId}`) ? 'block' : 'none';
        });
    }
}

// ------------------------------------------
// 3. REALTIME SYNC (Aggiornamento istantaneo)
// ------------------------------------------
function setupClientRealtime() {
    window.db
        .channel('client-live-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'piatti' }, () => loadClientData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categorie' }, () => loadClientData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredienti_esauriti' }, () => loadClientData())
        .subscribe();
}

// ------------------------------------------
// 4. GESTIONE RECENSIONI CLIENTE
// ------------------------------------------
function initStarRating() {
    const stars = document.querySelectorAll('#starRatingContainer .star');
    const ratingInput = document.getElementById('selectedRating');

    stars.forEach((star, index) => {
        // Valore iniziale di default a 5 stelle
        if (index < 5) star.classList.add('active');

        star.addEventListener('click', () => {
            const value = parseInt(star.getAttribute('data-value'));
            ratingInput.value = value;

            stars.forEach((s, i) => {
                if (i < value) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        });
    });
}

async function handleSendReview(e) {
    e.preventDefault();
    const stelle = parseInt(document.getElementById('selectedRating').value);
    const commento = document.getElementById('reviewComment').value.trim();

    const { error } = await window.db.from('recensioni').insert([
        { stelle, commento, tavolo: currentTable }
    ]);

    if (error) {
        alert('Errore durante l\'invio della recensione. Riprova!');
        console.error(error);
        return;
    }

    alert('Grazie per la tua recensione! È stata inviata al ristoratore.');
    document.getElementById('reviewComment').value = '';
}