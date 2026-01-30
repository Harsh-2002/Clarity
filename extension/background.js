// Background script for Clarity Bookmarks Extension
// Handles: auto-save, token refresh, offline detection, error states

// ============ State ============
let isOffline = false;

// ============ Initialization ============
chrome.runtime.onInstalled.addListener(async () => {
    await updatePopupState();
    await checkAndUpdateAllTabs();
});

chrome.runtime.onStartup.addListener(async () => {
    await updatePopupState();
});

// ============ Offline Detection ============
// Note: Service workers don't have navigator.onLine reliably
// We detect offline through fetch failures

function setOfflineState(offline) {
    isOffline = offline;
    if (offline) {
        // Show offline indicator
        chrome.action.setBadgeText({ text: '!' });
        chrome.action.setBadgeBackgroundColor({ color: '#9b9a97' });
        chrome.action.setTitle({ title: 'Clarity Bookmarks - Offline' });
    } else {
        // Clear offline indicator
        chrome.action.setBadgeText({ text: '' });
        chrome.action.setTitle({ title: 'Clarity Bookmarks' });
    }
}

// ============ Dynamic Popup Management ============
async function updatePopupState() {
    const config = await chrome.storage.local.get(['baseUrl', 'accessToken']);

    if (config.baseUrl && config.accessToken) {
        chrome.action.setPopup({ popup: '' });
    } else {
        chrome.action.setPopup({ popup: 'popup.html' });
    }
}

// Listen for storage changes (after login/logout)
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && (changes.accessToken || changes.baseUrl)) {
        updatePopupState();
    }
});

// ============ Extension Click Handler ============
chrome.action.onClicked.addListener(async (tab) => {
    const config = await chrome.storage.local.get(['baseUrl', 'accessToken', 'refreshToken']);

    if (!config.baseUrl || !config.accessToken) {
        await updatePopupState();
        return;
    }

    if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        return;
    }

    await toggleBookmark(tab, config);
});

// ============ Token Refresh ============
async function refreshAccessToken(config) {
    if (!config.refreshToken || !config.baseUrl) {
        return null;
    }

    try {
        const response = await fetch(`${config.baseUrl}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        // Save new token
        await chrome.storage.local.set({ accessToken: data.accessToken });

        return data.accessToken;
    } catch (error) {
        console.error('Token refresh failed:', error);
        return null;
    }
}

// ============ Session Expired - Clear Auth ============
async function handleSessionExpired() {
    await chrome.storage.local.remove(['accessToken', 'refreshToken']);
    await updatePopupState();

    // Show error badge briefly
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#e7000b' });
    chrome.action.setTitle({ title: 'Session expired - Click to login' });
}

// ============ API Request with Error Handling ============
async function apiRequest(url, options, config) {
    try {
        let response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.accessToken}`,
                ...(options?.headers || {})
            }
        });

        // Clear offline state on successful connection
        if (isOffline) {
            setOfflineState(false);
        }

        // Handle 401 - try token refresh
        if (response.status === 401) {
            const newToken = await refreshAccessToken(config);

            if (newToken) {
                // Retry with new token
                response = await fetch(url, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${newToken}`,
                        ...(options?.headers || {})
                    }
                });
            } else {
                // Token refresh failed - session expired
                await handleSessionExpired();
                return { error: 'session_expired' };
            }
        }

        if (!response.ok) {
            return { error: 'request_failed', status: response.status };
        }

        return { data: await response.json() };

    } catch (error) {
        // Network error - likely offline or server unreachable
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            setOfflineState(true);
            return { error: 'network_error' };
        }

        console.error('API request error:', error);
        return { error: 'unknown_error' };
    }
}

// ============ Toggle Bookmark ============
async function toggleBookmark(tab, config) {
    const encodedUrl = encodeURIComponent(tab.url);

    // Check current status
    const checkResult = await apiRequest(
        `${config.baseUrl}/api/bookmarks?url=${encodedUrl}`,
        { method: 'GET' },
        config
    );

    if (checkResult.error) {
        showErrorBadge(checkResult.error);
        return;
    }

    const exists = checkResult.data?.exists;

    if (exists) {
        // Remove bookmark
        const deleteResult = await apiRequest(
            `${config.baseUrl}/api/bookmarks?url=${encodedUrl}`,
            { method: 'DELETE' },
            config
        );

        if (!deleteResult.error) {
            updateIcon(false, tab.id);
        } else {
            showErrorBadge(deleteResult.error);
        }
    } else {
        // Add bookmark
        const addResult = await apiRequest(
            `${config.baseUrl}/api/bookmarks`,
            {
                method: 'POST',
                body: JSON.stringify({ url: tab.url })
            },
            config
        );

        if (!addResult.error) {
            updateIcon(true, tab.id);
        } else {
            showErrorBadge(addResult.error);
        }
    }
}

// ============ Error Badge ============
function showErrorBadge(errorType) {
    let title = 'Clarity Bookmarks';

    switch (errorType) {
        case 'network_error':
            title = 'Network error - Check connection';
            break;
        case 'session_expired':
            title = 'Session expired - Click to login';
            break;
        case 'request_failed':
            title = 'Request failed - Try again';
            break;
        default:
            title = 'Error occurred';
    }

    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#e7000b' });
    chrome.action.setTitle({ title });

    // Clear error badge after 5 seconds
    setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
        chrome.action.setTitle({ title: 'Clarity Bookmarks' });
    }, 5000);
}

// ============ Message Handling ============
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'updateIcon':
            updateIcon(message.bookmarked, sender.tab?.id);
            break;
        case 'loginComplete':
            updatePopupState();
            setOfflineState(false);
            break;
    }
});

// ============ Tab Listeners ============
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    await checkAndUpdateIcon(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
        await checkAndUpdateIcon(tabId);
    }
});

// ============ Keyboard Shortcut Handler ============
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'toggle-bookmark') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;

        const config = await chrome.storage.local.get(['baseUrl', 'accessToken', 'refreshToken']);
        if (!config.baseUrl || !config.accessToken) return;

        await toggleBookmark(tab, config);
    }
});

// ============ Icon Management ============
function updateIcon(isBookmarked, tabId) {
    const iconPath = isBookmarked ? {
        16: 'icons/icon-green-16.png',
        48: 'icons/icon-green-48.png',
        128: 'icons/icon-green-128.png'
    } : {
        16: 'icons/icon-16.png',
        48: 'icons/icon-48.png',
        128: 'icons/icon-128.png'
    };

    const title = isBookmarked ? 'Saved to Clarity' : 'Click to save';

    if (tabId) {
        chrome.action.setIcon({ path: iconPath, tabId });
        chrome.action.setBadgeText({ text: '', tabId });
        chrome.action.setTitle({ title, tabId });
    } else {
        chrome.action.setIcon({ path: iconPath });
        chrome.action.setBadgeText({ text: '' });
        chrome.action.setTitle({ title });
    }
}

async function checkAndUpdateIcon(tabId) {
    try {
        const tab = await chrome.tabs.get(tabId);
        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
            updateIcon(false, tabId);
            return;
        }

        const config = await chrome.storage.local.get(['baseUrl', 'accessToken', 'refreshToken']);
        if (!config.baseUrl || !config.accessToken) {
            updateIcon(false, tabId);
            return;
        }

        const encodedUrl = encodeURIComponent(tab.url);
        const result = await apiRequest(
            `${config.baseUrl}/api/bookmarks?url=${encodedUrl}`,
            { method: 'GET' },
            config
        );

        if (result.error) {
            updateIcon(false, tabId);
        } else {
            updateIcon(result.data?.exists || false, tabId);
        }
    } catch (error) {
        console.error('Failed to check bookmark status:', error);
        updateIcon(false, tabId);
    }
}

async function checkAndUpdateAllTabs() {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
        if (tab.id) {
            await checkAndUpdateIcon(tab.id);
        }
    }
}
