// Clarity Extension - Login Popup Script
// Only handles first-time setup/login

const setupForm = document.getElementById('setupForm');
const setupError = document.getElementById('setupError');

// Setup form handler
setupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const baseUrl = document.getElementById('setupBaseUrl').value.trim().replace(/\/$/, '');
    const username = document.getElementById('setupUsername').value.trim();
    const password = document.getElementById('setupPassword').value;

    const submitButton = setupForm.querySelector('button[type="submit"]');
    const originalText = 'Connect'; // Assuming default text

    submitButton.disabled = true;
    // Add spinner SVG
    submitButton.innerHTML = `
        <svg class="spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Connecting...
    `;

    hideError(setupError);

    try {
        // Validate URL format
        try {
            new URL(baseUrl);
        } catch {
            throw new Error('Invalid URL format');
        }

        const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Login failed');
        }

        const data = await response.json();

        await chrome.storage.local.set({
            baseUrl,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken
        });

        // Notify background script to update popup state
        chrome.runtime.sendMessage({ action: 'loginComplete' });

        // Success message
        submitButton.textContent = 'Connected!';
        submitButton.style.background = '#16a34a'; // Success green

        // Close popup after brief delay
        setTimeout(() => {
            window.close();
        }, 800);

    } catch (error) {
        console.error('Setup error:', error);
        showError(setupError, error.message || 'Failed to connect');
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
});

function showError(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
}

function hideError(element) {
    element.classList.add('hidden');
}
