// ==================== LICENSE KEY VALIDATION ====================
const API_URL = 'http://localhost:3000/api'; // Ändere je nach Deployment

document.getElementById('validationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const licenseKey = document.getElementById('licenseKey').value.trim();
    const errorMsg = document.getElementById('errorMessage');
    errorMsg.textContent = '';

    if (!licenseKey) {
        errorMsg.textContent = 'Bitte gib einen License Key ein!';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/validate-license`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ licenseKey })
        });

        const data = await response.json();

        if (response.ok && data.valid) {
            // Speichere den Key im LocalStorage
            localStorage.setItem('licenseKey', licenseKey);
            localStorage.setItem('userName', data.userName);
            localStorage.setItem('expiresAt', data.expiresAt);
            
            // Redirect zum Archiv
            window.location.href = 'archive.html';
        } else {
            errorMsg.textContent = data.message || 'Ungültiger License Key!';
        }
    } catch (error) {
        console.error('Fehler:', error);
        errorMsg.textContent = 'Verbindungsfehler. Bitte versuche es später erneut.';
    }
});

// Check ob Key bereits vorhanden ist
window.addEventListener('load', () => {
    const key = localStorage.getItem('licenseKey');
    if (key) {
        window.location.href = 'archive.html';
    }
});