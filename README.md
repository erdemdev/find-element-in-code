# Find Element In Code

A Chrome extension that helps developers quickly locate HTML elements in their codebase by providing direct links to the source code.

## Features

- **Visual Element Selection**: Click on any element to find its source code
- **Pattern Matching and Visual Grouping**: Group similar elements using regex patterns, highlighting matched elements with the same color
- **Exclusion Patterns**: Exclude specific elements from being selectable
- **File Type Filtering**: Specify which file types to search in source code
- **Editor Integration**: Open files directly in VS Code or Windsurf

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory

## Usage

1. Click the extension icon to activate element selection mode
2. Hover over elements to see their IDs
3. Click an element to search for it in your codebase

### Requirements

- [Find Element In Code (Bridge)](https://github.com/erdemdev/find-element-in-code-bridge) extension installed and connected in your code editor.

## Configuration

Access the options page to configure:

- **Preferred Editor**: Choose between VS Code and Windsurf
- **Exclusion Patterns**: Regex patterns for elements to ignore
- **Combining Patterns**: Patterns to group matching similar elements
- **File Extensions**: File types to include in the search

## How It Works

1. The extension creates a visual overlay on the webpage
2. Elements are grouped based on combining patterns
3. When clicked, it searches for the element's ID in your codebase

## License

MIT License - feel free to use and modify for your needs.
