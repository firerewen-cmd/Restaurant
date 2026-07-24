// ==========================================
// RECENSIONI & FEEDBACK REALTIME H24
// ==========================================

let reviewsCache = [];
let chartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadReviews();
    setupReviewsRealtime();
});

async function loadReviews() {
    const { data, error } = await window.db
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return console.error('Errore recensioni:', error);

    reviewsCache = data || [];
    renderReviews();
    updateChart();
}

function setupReviewsRealtime() {
    window.db
        .channel('realtime-recensioni')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'feedback' },
            (payload) => {
                reviewsCache.unshift(payload.new);
                renderReviews(true);
                updateChart();
            }
        )
        .subscribe();
}

function renderReviews(isNew = false) {
    const container = document.getElementById('reviewsContainer');
    if (reviewsCache.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted);">Nessuna recensione ricevuta finora.</p>`;
        return;
    }

    container.innerHTML = reviewsCache.map((rev, index) => {
        const stelle = rev.stelle || rev.voto || 5;
        const stars = '★'.repeat(stelle) + '☆'.repeat(5 - stelle);
        const date = rev.created_at ? new Date(rev.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Oggi';
        const animClass = (isNew && index === 0) ? 'new-arrival' : '';

        return `
            <div class="review-card ${animClass}">
                <div class="review-header">
                    <div>
                        <span class="review-stars">${stars}</span>
                        <span class="review-table-tag" style="margin-left: 8px;">TAVOLO ${rev.tavolo || 'N/D'}</span>
                    </div>
                    <span class="review-date">${date}</span>
                </div>
                ${rev.commento ? `<p class="review-comment">"${rev.commento}"</p>` : ''}
            </div>
        `;
    }).join('');
}

function updateChart() {
    const ctx = document.getElementById('ratingsChart');
    if (!ctx) return;

    const counts = [0, 0, 0, 0, 0];
    reviewsCache.forEach(r => {
        const v = r.stelle || r.voto || 5;
        if (v >= 1 && v <= 5) counts[v - 1]++;
    });

    if (chartInstance) chartInstance.destroy();

    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#059669';

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['1 ★', '2 ★', '3 ★', '4 ★', '5 ★'],
            datasets: [{
                data: counts,
                backgroundColor: primaryColor,
                borderRadius: 0
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}