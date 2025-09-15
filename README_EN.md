# Click & Scrape - Chrome Extension

An intelligent Chrome browser extension for visual web element selection and optimal CSS selector generation. Specially optimized with algorithms for lists, tables, and similar elements.

## 🆕 V1.2 Major Algorithm Improvements

### Smart List Element Recognition
When selecting list items, table rows, or other similar sibling elements, the extension now:

1. **Auto-detects Similarity**: Identifies if elements are in similar sibling lists
2. **Prioritizes Parent+Index**: Uses stable selectors like `#list-container > li:nth-of-type(3)`
3. **Avoids Content Dependency**: Reduces priority of text-content-based selectors (as content is most volatile)

### Before vs After Comparison

**Scenario: Select the second item in a product list**
```html
<ul id="product-list">
  <li>iPhone 15 Pro - Premium flagship phone</li>
  <li>MacBook Air - Lightweight laptop</li>  <!-- Selected this -->
  <li>iPad Pro - Professional tablet</li>
</ul>
```

| Before | After |
|--------|-------|
| `li:contains("MacBook Air...")` | `#product-list > li:nth-of-type(2)` |
| ❌ Breaks when content changes | ✅ Structure-based, more stable |
| ❌ Verbose and hard to read | ✅ Clean and clear |

## Features

- 🎯 **Smart Visual Selection**: Mouse hover highlighting of elements
- 🔧 **List Element Optimization**: Special handling for similar sibling elements ⭐ **New**
- 📝 **Multiple Selector Generation**: Auto-generates various types of CSS selectors
- 📊 **History Table**: Records all selected element info with quality indicators
- 💾 **Persistent Storage**: Uses localStorage to save history
- 🚀 **One-Click Launch**: Click extension icon to start selection mode
- 📋 **One-Click Copy**: Click selector code to copy to clipboard

## Installation

1. Open Chrome browser and go to `chrome://extensions`
2. Turn on **Developer mode** toggle in the top right
3. Click **Load unpacked** button in the top left
4. Select this project folder

After installation, you'll see the "Click & Scrape" extension icon in your browser toolbar.

## Usage

### Basic Operation

1. **Start Selection Mode**
   - Click the "Click & Scrape" extension icon in your browser toolbar
   - Extension will directly enter element selection mode (no popup required)

2. **Select Elements**
   - Move mouse over target elements, they will be highlighted with blue border
   - A blue information panel appears in the top right, showing current hover element info in real-time
   - Click target element to complete selection

3. **View Results**
   - After selecting element, information panel automatically updates
   - Shows current element info and history table

4. **Exit Selection Mode**
   - Press `ESC` key to exit selection mode

### Information Panel Features

The information panel has two sections:

#### Current Element Info
- **Tag**: HTML tag name
- **Text**: Element text content
- **Best Selector**: Recommended optimal CSS selector

#### History Table
Contains the following columns:
- **Tag**: Element tag name
- **Content**: Element text content (truncated display)
- **Selector**: CSS selector (click to copy)
- **Quality**: Selector quality indicators
- **Time**: Selection timestamp

### Advanced Features

1. **Copy Selectors**
   - Click selector code in history table to copy to clipboard
   - Visual feedback on copy (background color change)

2. **Clear History**
   - Click "Clear" button in information panel
   - Confirm to clear all history

3. **Persistent Storage**
   - History automatically saved to localStorage
   - History remains after browser restart
   - Saves up to 20 history entries

## Generated Selector Types

The extension intelligently generates multiple types of CSS selectors, adjusting priority based on element environment:

### 🎯 General Priority (Independent Elements)
1. **ID Selector**: `#elementId` - Most precise and stable
2. **Test Attribute Selector**: `[data-testid="value"]` - Test-friendly
3. **Important Attribute Selector**: `[name="value"]`, `[aria-label="value"]`, etc.
4. **Class Selector**: `.className` - Single or multiple class combinations
5. **Parent-based Selector**: `#parent > div`
6. **Text Content Selector**: `div:contains("text")` (non-standard CSS)

### 🔧 List Element Special Priority ⭐ **New**
When detecting elements in similar sibling lists:
1. **ID Selector**: `#elementId` - Still highest priority
2. **Parent+Index Selector**: `#parent > li:nth-of-type(2)` - 🚀 **Prioritized**
3. **Test Attribute Selector**: Reduced priority
4. **Other Attribute/Class Selectors**: Reduced priority
5. **Text Content Selector**: Significantly downgraded (as content in lists is most volatile)

### 📊 Selector Quality Indicators
History table displays quality markers:
- ✅🔒 **ID/Test Attributes**: Most stable, recommended for production
- ✅🔒 **Class Selectors**: Relatively stable
- ⚠️ **Position Index**: May be affected by structural changes
- ⚠️ **Others**: Use with caution

### 🎯 Applicable List Types
- `<ul>`, `<ol>` list items
- `<table>` table rows/cells
- Product cards/grid layouts
- Navigation menu items
- Any structurally similar sibling elements

## Technical Features

- **Popup-free Design**: Click extension icon to start directly, cleaner operation
- **Real-time Preview**: Real-time element info display on mouse hover
- **Smart Selectors**: Auto-generates multiple selector types for different use cases
- **Tabular History**: Clear history table with information at a glance
- **Local Storage**: Uses localStorage for data persistence

## Use Cases

- **Frontend Development**: Quickly get CSS selectors for page elements
- **Automated Testing**: Generate reliable selectors for test scripts
- **Web Analysis**: Analyze page structure and element relationships
- **Learning & Research**: Understand different selector generation rules

## 🧪 Testing & Validation

The project includes a test page `test.html` to verify algorithm improvements:

```bash
# Open test page in browser
open test.html
```

### Test Scenarios
1. **Unordered Lists**: Verify list item selector generation
2. **Product Grids**: Verify card element selector generation
3. **Data Tables**: Verify table row selector generation
4. **Independent Elements**: Verify traditional selector generation for non-list elements

### Expected Results
- Elements in multi-table environments generate unique selectors (like `#today-airdrops td:nth-of-type(1)`)
- No more non-unique selectors (like `tr > td:nth-child(1)`)
- Prioritize stable selectors using ancestor ID/attribute combinations
- History table shows correct quality indicator markers

### 🔧 Debug Testing
Run debug script in page console:
```bash
# Open alpha.html page in browser
open test/alpha.html

# Load debug script content in console
# (Copy content from debug-console.js and paste into console)
```

**Console Test Command Examples:**
```javascript
// Test specific element selector generation
const element = document.querySelector('#today-airdrops td');
testElementSelector(element, 'Table Cell');

// Verify selector uniqueness
const selector = '#today-airdrops td:nth-of-type(1)';
console.log('Uniqueness:', document.querySelectorAll(selector).length === 1);
```

## 💻 Technical Implementation

### Core Algorithm Functions
- `isElementInSimilarSiblingsList()` - Detect similar sibling elements
- `getElementStructuralFeatures()` - Analyze element structural features
- `generateParentBasedIndexSelector()` - Generate parent element + index selectors
- `areFeaturesStructurallySimilar()` - Judge structural similarity

### Optimization Logic
1. Identify typical repeating structures like list items, table rows
2. Compare sibling element structural features (child elements, classes, etc.)
3. Adjust selector type priority in similar environments
4. Provide more stable positioning solutions for list elements

## Notes

- 🎯 **Algorithm Optimization**: List elements prioritize parent element + index, avoiding dependency on volatile text content
- 📝 **Selector Recommendations**: ID selectors remain most stable choice, followed by test attribute selectors
- 💾 **Storage Limits**: History saves up to 20 entries, automatically deletes oldest when exceeded
- ⌨️ **Quick Operations**: Use ESC key to exit selection mode anytime
- 🔐 **Permission Requirements**: Extension requires "activeTab" and "scripting" permissions to inject scripts

## 📝 Changelog

### v1.2 - Core Algorithm Refactor 🚀 **Latest**
- ⚡ **Complete rewrite of selector generation algorithm**, solving uniqueness issues in multi-table environments
- 🎯 **Implemented ancestor-based selectors**: Automatically searches up for uniquely identified ancestor elements
- 🔍 **New specificity scoring system**: Ensures selectors are sorted by stability and uniqueness
- 🛡️ **Enhanced uniqueness validation**: All selectors guaranteed to uniquely match on page
- 📊 **Optimized algorithm priorities**: ID > Test Attributes > Ancestor Path > Other Solutions
- 🔧 **Solved key issues**: No longer generates non-unique selectors like `tr > td:nth-child(1)`
- 📋 **New debugging tools**: Console test script and detailed testing documentation

### v1.1 - List Element Algorithm Optimization
- ✨ Added automatic similar sibling element detection
- 🎯 Implemented smart parent element + index selector generation
- 📊 Optimized selector priority sorting logic
- 📉 Reduced text content selector priority in list environments
- 🧪 Added comprehensive test cases and documentation
- 📈 Improved selector stability for list/table elements

### v1.0 - Basic Features
- 🎉 Basic CSS selector generation functionality
- 📋 History recording and copy features
- 🎨 Draggable information panel
- 💾 Local storage support

## 🚀 Publication Ready

This extension is ready for Chrome Web Store publication with:
- ✅ Complete English documentation
- ✅ Professional icon design (16x16, 48x48, 128x128)
- ✅ Optimized manifest.json
- ✅ Automated packaging script
- ✅ Comprehensive marketing materials

## 📞 Support

For technical issues or feature requests, please check the project documentation or submit an issue report.
