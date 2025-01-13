# Find Element In Code

A Chrome extension that helps you extract HTML code from web elements and send it to your preferred code editor.

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Usage

1. Click the extension icon in your Chrome toolbar to enable the element selector
2. Hover over elements on the page to see them highlighted with a red overlay
3. Click on any highlighted element to:
   - Exit the selection mode
   - Extract its HTML code (currently logged to console)
   - Soon: Send the code to your preferred editor

## Development

This project uses pnpm for package management. To get started:

```bash
pnpm install
