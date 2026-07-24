// ==========================================
// EDITOR MENU DETTAGLIATO CON REALTIME H24
// ==========================================

const ALLERGENI_UE = [
    "Glutine", "Crostacei", "Uova", "Pesce", 
    "Arachidi", "Soia", "Latte", "Frutta a guscio", 
    "Sedano", "Senape", "Sesamo", "Anidride Solforosa", 
    "Lupini", "Molluschi"
];

let categorieCache = [];
let piattiCache = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof checkAuth === 'function') {
        const user = await checkAuth();
        if (!user) return;
    }

    initAllergensSelector();
    await loadCategories();
    await loadDishes();
    setupRealtimeSubscription();

    document.getElementById('dishForm').addEventListener('submit', handleSaveDish);
    document.getElementById('categoryForm').addEventListener('submit', handleSaveCategory);
});

function setupRealtimeSubscription() {
    window.db
        .channel('schema-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_piatti' }, () => loadDishes())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_categorie' }, () => loadCategories())
        .subscribe();
}

async function loadCategories() {
    const { data, error } = await window.db.from('menu_categorie').select('*').order('id', { ascending: true });
    if (error) return console.error('Errore categorie:', error);
    categorieCache = data || [];
    renderCategoriesUI();
}

async function loadDishes() {
    const { data, error } = await window.db.from('menu_piatti').select('*').order('id', { ascending: true });
    if (error) return console.error('Errore piatti:', error);
    piattiCache = data || [];
    renderDishesUI();
}

function renderCategoriesUI() {
    const tabsContainer = document.getElementById('categoryTabs');
    const selectCategory = document.getElementById('dishCategory');

    let tabsHTML = `<button class="cat-btn active" onclick="filterCategory('all')">TUTTI I PIATTI</button>`;
    let selectHTML = `<option value="">Seleziona Categoria</option>`;

    categorieCache.forEach(cat => {
        tabsHTML += `<button class="cat-btn" onclick="filterCategory(${cat.id})">${cat.nome.toUpperCase()}</button>`;
        selectHTML += `<option value="${cat.id}">${cat.nome}</option>`;
    });

    tabsContainer.innerHTML = tabsHTML;
    selectCategory.innerHTML = selectHTML;
}

function renderDishesUI() {
    const container = document.getElementById('menuSectionsContainer');
    container.innerHTML = '';

    if (categorieCache.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted);">Nessuna categoria presente. Creane una per iniziare!</p>`;
        return;
    }

    categorieCache.forEach(cat => {
        const piattiCategoria = piattiCache.filter(p => p.categoria_id === cat.id);
        
        let sectionHTML = `
            <div class="category-section" id="cat-sec-${cat.id}">
                <h3 class="category-title">${cat.nome}</h3>
                <div class="menu-grid">
        `;

        if (piattiCategoria.length === 0) {
            sectionHTML += `<p style="color: var(--text-muted); font-size: 0.85rem;">Nessun piatto in questa categoria.</p>`;
        } else {
            piattiCategoria.forEach(dish => {
                const tags = dish.ingredienti_tags ? dish.ingredienti_tags.split(',') : [];
                const tagsHTML = tags.map(t => `<span class="tag-badge">${t.trim()}</span>`).join('');
                const allergens = dish.allergeni || [];
                const allergensHTML = allergens.map(a => `<span class="allergen-badge">⚠️ ${a}</span>`).join('');
                const isDisabledClass = dish.disponibile === false ? 'disabled' : '';

                sectionHTML += `
                    <div class="dish-card ${isDisabledClass}">
                        <div>
                            <div class="dish-header">
                                <span class="dish-title">${dish.nome}</span>
                                <span class="dish-price">€${parseFloat(dish.prezzo).toFixed(2)}</span>
                            </div>
                            <p class="dish-desc">${dish.descrizione || ''}</p>
                            <div class="tags-container">${tagsHTML}</div>
                            <div class="allergens-container">${allergensHTML}</div>
                        </div>
                        <div class="dish-actions">
                            <button class="btn btn-outline" style="font-size: 0.75rem; padding: 0.3rem 0.6rem;" onclick="editDish(${dish.id})">MODIFICA</button>
                            <button class="btn btn-outline" style="font-size: 0.75rem; padding: 0.3rem 0.6rem; color: var(--danger);" onclick="deleteDish(${dish.id})">ELIMINA</button>
                        </div>
                    </div>
                `;
            });
        }

        sectionHTML += `</div></div>`;
        container.innerHTML += sectionHTML;
    });
}

function initAllergensSelector() {
    const container = document.getElementById('allergensSelector');
    container.innerHTML = ALLERGENI_UE.map(a => `
        <label class="allergen-checkbox">
            <input type="checkbox" value="${a}" class="allergen-check">
            ${a}
        </label>
    `).join('');
}

function openDishModal() {
    document.getElementById('dishForm').reset();
    document.getElementById('dishId').value = '';
    document.getElementById('modalTitle').textContent = 'Nuovo Piatto';
    document.getElementById('dishModal').classList.add('active');
}

function closeDishModal() { document.getElementById('dishModal').classList.remove('active'); }
function openCategoryModal() { document.getElementById('categoryForm').reset(); document.getElementById('categoryModal').classList.add('active'); }
function closeCategoryModal() { document.getElementById('categoryModal').classList.remove('active'); }

async function handleSaveDish(e) {
    e.preventDefault();
    const id = document.getElementById('dishId').value;
    const nome = document.getElementById('dishName').value;
    const prezzo = parseFloat(document.getElementById('dishPrice').value);
    const categoria_id = parseInt(document.getElementById('dishCategory').value);
    const descrizione = document.getElementById('dishDescription').value;
    const ingredienti_tags = document.getElementById('dishIngredientsTags').value;
    const allergeni = Array.from(document.querySelectorAll('.allergen-check:checked')).map(c => c.value);

    const dishData = { nome, prezzo, categoria_id, descrizione, ingredienti_tags, allergeni, disponibile: true };

    if (id) {
        await window.db.from('menu_piatti').update(dishData).eq('id', id);
    } else {
        await window.db.from('menu_piatti').insert([dishData]);
    }

    closeDishModal();
}

async function handleSaveCategory(e) {
    e.preventDefault();
    const nome = document.getElementById('categoryName').value;
    await window.db.from('menu_categorie').insert([{ nome }]);
    closeCategoryModal();
}

async function deleteDish(id) {
    if (confirm('Sei sicuro di voler eliminare questo piatto?')) {
        await window.db.from('menu_piatti').delete().eq('id', id);
    }
}