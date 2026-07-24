// ==========================================
// GESTIONE INGREDIENTI & ESAURITI LIVE
// ==========================================

let ingredientsCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Carica la lista degli ingredienti usati nei tag dei piatti
    await loadIngredients();

    // 2. Ascolta modifiche in tempo reale sulle disponibilità
    setupIngredientsRealtime();
});

async function loadIngredients() {
    // Scarichiamo tutti i tag degli ingredienti dai piatti
    const { data: dishes, error } = await window.db.from('piatti').select('ingredienti_tags');
    if (error) {
        console.error('Errore recupero ingredienti:', error);
        return;
    }

    // Estraiamo tutti i tag unici (es. mozzarella, pomodoro, origano)
    const tagsSet = new Set();
    dishes.forEach(d => {
        if (d.ingredienti_tags) {
            d.ingredienti_tags.split(',').forEach(tag => {
                const cleanTag = tag.trim().toLowerCase();
                if (cleanTag) tagsSet.add(cleanTag);
            });
        }
    });

    // Scarichiamo gli ingredienti attualmente segnati come esauriti
    const { data: outOfStockData } = await window.db.from('ingredienti_esauriti').select('tag_nome');
    const outSet = new Set((outOfStockData || []).map(item => item.tag_nome));

    ingredientsCache = Array.from(tagsSet).map(tag => ({
        tag: tag,
        disponibile: !outSet.has(tag)
    }));

    renderIngredientsUI();
}

function renderIngredientsUI() {
    const container = document.getElementById('ingredientsContainer');
    
    if (ingredientsCache.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted);">Nessuna materia prima o tag inserito nei piatti del menu.</p>`;
        return;
    }

    container.innerHTML = ingredientsCache.map(ing => `
        <div class="ingredient-card">
            <div class="ingredient-info">
                <span class="ingredient-name">${ing.tag}</span>
                <span class="ingredient-status ${ing.disponibile ? 'status-available' : 'status-out'}">
                    ${ing.disponibile ? '● DISPONIBILE' : '✖ TERMINATO'}
                </span>
            </div>
            <label class="switch">
                <input type="checkbox" ${ing.disponibile ? 'checked' : ''} onchange="toggleIngredient('${ing.tag}', this.checked)">
                <span class="slider"></span>
            </label>
        </div>
    `).join('');
}

async function toggleIngredient(tag, isAvailable) {
    if (isAvailable) {
        // Se è di nuovo disponibile, lo rimuoviamo dalla tabella degli esauriti
        await window.db.from('ingredienti_esauriti').delete().eq('tag_nome', tag);
    } else {
        // Se è esaurito, lo inseriamo nella tabella degli esauriti
        await window.db.from('ingredienti_esauriti').insert([{ tag_nome: tag }]);
    }
    
    // Aggiorniamo la cache locale
    const item = ingredientsCache.find(i => i.tag === tag);
    if (item) item.disponibile = isAvailable;
    renderIngredientsUI();
}

function setupIngredientsRealtime() {
    window.db
        .channel('realtime-ingredienti')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'ingredienti_esauriti' },
            () => {
                loadIngredients();
            }
        )
        .subscribe();
}