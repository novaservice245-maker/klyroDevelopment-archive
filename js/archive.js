// ==================== ARCHIVE PAGE LOGIC ====================
const API_URL = 'http://localhost:3000/api';
let allProducts = [];
let currentProduct = null;

// Beispiel Produkte - Du kannst diese später über API laden
const SAMPLE_PRODUCTS = [
    {
        id: 1,
        title: 'Photoshop UI Kit',
        category: 'photoshop',
        type: 'templates',
        description: 'Professionelles UI Kit für Photoshop mit über 100 Komponenten.',
        size: '245 MB',
        image: 'https://via.placeholder.com/300x300?text=Photoshop+UI+Kit',
        uploadDate: '2024-01-15',
        downloadUrl: '#'
    },
    {
        id: 2,
        title: 'Premiere Pro Transitions',
        category: 'premiere',
        type: 'presets',
        description: 'Umfangreiches Paket mit 50+ professionellen Übergängen.',
        size: '180 MB',
        image: 'https://via.placeholder.com/300x300?text=Transitions',
        uploadDate: '2024-01-10',
        downloadUrl: '#'
    },
    {
        id: 3,
        title: 'After Effects Motion Graphics',
        category: 'after-effects',
        type: 'templates',
        description: 'Ready-to-use Motion Graphics Templates für After Effects.',
        size: '512 MB',
        image: 'https://via.placeholder.com/300x300?text=Motion+Graphics',
        uploadDate: '2024-01-05',
        downloadUrl: '#'
    },
    {
        id: 4,
        title: 'Photoshop Brush Pack',
        category: 'photoshop',
        type: 'presets',
        description: '200+ professionelle Pinsel für digitales Malen und Design.',
        size: '95 MB',
        image: 'https://via.placeholder.com/300x300?text=Brush+Pack',
        uploadDate: '2024-01-01',
        downloadUrl: '#'
    }
];

// Check License bei Seitenladeload
window.addEventListener('load', () => {
    const licenseKey = localStorage.getItem('licenseKey');
    const userName = localStorage.getItem('userName');

    if (!licenseKey) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('userName').textContent = userName || 'VIP Member';
    
    // Lade Produkte
    loadProducts();
});

// Lade Produkte von API oder Beispiele
async function loadProducts() {
    try {
        const licenseKey = localStorage.getItem('licenseKey');
        const response = await fetch(`${API_URL}/products`, {
            headers: { 'Authorization': `Bearer ${licenseKey}` }
        });

        if (response.ok) {
            allProducts = await response.json();
        } else {
            // Fallback zu Beispiel-Produkten
            allProducts = SAMPLE_PRODUCTS;
        }
    } catch (error) {
        console.error('Fehler beim Laden der Produkte:', error);
        allProducts = SAMPLE_PRODUCTS;
    }

    renderProducts(allProducts);
}

// Render Produkte im Grid
function renderProducts(products) {
    const grid = document.getElementById('productsGrid');
    const noResults = document.getElementById('noResults');

    if (products.length === 0) {
        grid.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';
    grid.innerHTML = products.map(product => `
        <div class="product-card" onclick="openProductModal(${product.id})">
            <div class="product-image">
                <img src="${product.image}" alt="${product.title}" onerror="this.parentElement.textContent='📦'">
            </div>
            <div class="product-info">
                <p class="product-category">${product.category.toUpperCase()}</p>
                <h3 class="product-title">${product.title}</h3>
                <p class="product-type">${product.type}</p>
                <div class="product-footer">
                    <span class="product-date">${formatDate(product.uploadDate)}</span>
                    <span class="product-size">${product.size}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Öffne Product Modal
function openProductModal(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    currentProduct = product;
    document.getElementById('modalImage').src = product.image;
    document.getElementById('modalTitle').textContent = product.title;
    document.getElementById('modalDescription').textContent = product.description;
    document.getElementById('modalCategory').textContent = product.category;
    document.getElementById('modalType').textContent = product.type;
    document.getElementById('modalSize').textContent = product.size;

    document.getElementById('productModal').style.display = 'block';
}

// Schließe Modal
function closeModal() {
    document.getElementById('productModal').style.display = 'none';
    currentProduct = null;
}

// Download Produkt
function downloadProduct() {
    if (!currentProduct) return;

    alert(`"${currentProduct.title}" wird heruntergeladen...`);
    // Hier könnte die echte Download-Logik implementiert werden
    
    if (currentProduct.downloadUrl && currentProduct.downloadUrl !== '#') {
        window.location.href = currentProduct.downloadUrl;
    }
    
    closeModal();
}

// Filter & Search
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const selectedCategories = Array.from(document.querySelectorAll('.filter-checkbox:checked'))
        .map(cb => cb.value);
    const sortBy = document.getElementById('sortSelect').value;

    let filtered = allProducts.filter(product => {
        const matchesSearch = product.title.toLowerCase().includes(searchTerm) ||
                            product.description.toLowerCase().includes(searchTerm);
        const matchesCategory = selectedCategories.length === 0 || 
                               selectedCategories.includes(product.category);
        
        return matchesSearch && matchesCategory;
    });

    // Sortiere
    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'oldest':
                return new Date(a.uploadDate) - new Date(b.uploadDate);
            case 'name-asc':
                return a.title.localeCompare(b.title);
            case 'name-desc':
                return b.title.localeCompare(a.title);
            case 'newest':
            default:
                return new Date(b.uploadDate) - new Date(a.uploadDate);
        }
    });

    renderProducts(filtered);
}

// Reset Filter
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('sortSelect').value = 'newest';
    renderProducts(allProducts);
}

// Logout
function logout() {
    if (confirm('Möchtest du dich wirklich abmelden?')) {
        localStorage.removeItem('licenseKey');
        localStorage.removeItem('userName');
        localStorage.removeItem('expiresAt');
        window.location.href = 'index.html';
    }
}

// Hilfsfunktion: Datum formatieren
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE');
}

// Schließe Modal wenn außerhalb geklickt wird
window.addEventListener('click', (e) => {
    const modal = document.getElementById('productModal');
    if (e.target === modal) {
        closeModal();
    }
});

// Listener für Filter
document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', applyFilters);
});