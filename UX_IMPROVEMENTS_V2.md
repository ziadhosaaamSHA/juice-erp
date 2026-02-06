# UX Enhancements v2

## Summary
We have significantly upgraded the user experience with better visual hierarchy, icons, and interactive elements.

## New Features

### 1. Page Insights
At the top of each major section (Sales, Purchases, Inventory, Production), you will now see **Insight Cards** summarizing key metrics instantly:
- **Sales**: Total Revenue, Invoice Count, Pending vs Posted.
- **Inventory**: Total Items, Critical Stock.
- **Production**: Active Orders, Efficiency Stats.

### 2. Search & Filtering
- Added a **Search Bar** to every data table.
- Real-time filtering by Name, ID, or Status as you type.

### 3. Visual Improvements
- **Icons**: Every action button now includes a relevant icon (using Boxicons) for faster recognition.
- **Bigger Buttons**: Primary actions are larger and more "clickable".
- **Better Contrast**: Adjusted colors in the "Quick Action" menu for better readability.

### 4. Code Changes
- **`index.html`**: Added Insights placeholders and Search inputs.
- **`styles.css`**: New styles for `.page-insights`, `.insight-card`, and improved `.modal .nav-item`.
- **`main.js`**: Added `filterTable()` and `renderPageInsights()` logic.

## Usage
- **Search**: Just type in the search box above any table; rows will filter automatically.
- **Quick Action**: Click the button in the top bar to see the new icon-enhanced menu.
