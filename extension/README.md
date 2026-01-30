# Clarity Bookmarks Extension

One-click bookmark manager for your Clarity instance.

## Features

- **One-Click Toggle**: Click icon to save/remove current page
- **Badge Count**: Shows total bookmark count on extension icon
- **Keyboard Shortcut**: Press `Ctrl+Shift+B` (Mac: `Cmd+Shift+B`) to toggle bookmark without opening popup
- **Toast Notifications**: Visual feedback after save/remove actions
- **Dark Mode**: Automatically matches system theme with Clarity's design language
- **Secure Storage**: Tokens stored locally, all data centralized in your Clarity database

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this `extension` folder

## Setup

1. Click the extension icon
2. Enter your Clarity instance URL (e.g., `https://clarity.example.com`)
3. Enter your username and password
4. Click "Connect"

## Usage

### Quick Toggle
- Click extension icon → Click the bookmark toggle

### Keyboard Shortcut
- Press `Ctrl+Shift+B` (Mac: `Cmd+Shift+B`) to toggle bookmark without opening popup
- Customize shortcut at `chrome://extensions/shortcuts`

### Visual Indicators
- **Gray icon**: Page not bookmarked
- **Green icon**: Page is bookmarked
- **Badge number**: Total bookmarks count

## Reset Configuration

To reconfigure (change server or account):
1. Go to `chrome://extensions/`
2. Find "Clarity Bookmarks"
3. Click "Details"
4. Click "Clear data" under "Site access"
5. Click extension icon to set up again

## Privacy

- All bookmarks are stored in your Clarity database
- Only authentication tokens are stored locally
- No data is sent to third parties
- Extension requires `<all_urls>` permission only to check bookmark status on any page

## Development

```bash
# Files
manifest.json    # Extension configuration
popup.html       # Main popup UI
popup.js         # Popup logic
styles.css       # Styling (with dark mode)
background.js    # Service worker for shortcuts, badge, icon
icons/           # Extension icons
```
