# New UI/UX Workflow Guide

## Overview
We have refactored the application to replace inline forms with a modern, modal-based interface. This improves usability by reducing clutter and focusing on data presentation.

## Key Changes

### 1. Modals instead of Inline Forms
- **Old Way**: Forms were displayed directly on the page, taking up space and creating visual noise.
- **New Way**: Forms are hidden by default. Click the **"New [Item]"** button in the section header to open a modal for data entry.
- **Benefits**:
  - Cleaner interface.
  - Better focus on tables and specific tasks.
  - Consistent design language.

### 2. Quick Action Menu
- **Old Way**: Browser-native `prompt()` dialog (popup).
- **New Way**: Custom-styled modal offering clear distinct buttons for common actions:
  - New Sales Invoice
  - New Purchase Invoice
  - New Production Order
  - Add New Item

### 3. Posting Invoices
- The "Post" (ترحيل) button now opens a dedicated confirmation modal where you can enter the specific Entry Date and Costs before finalizing.

## How to Use

### Adding a New Sale
1. Navigate to **Sales**.
2. Click **"New Invoice"** (فاتورة جديدة) button at the top right of the list.
3. Fill in the form in the modal.
4. Click **"Save"**. The modal closes and the list refreshes.

### Quick Actions
1. Click the **"Quick Action"** button in the top navigation bar.
2. Select the desired action from the list.
3. The corresponding page and modal will open automatically.

## Developer Notes
- **Globally Exposed Functions**: `openModal(id)` and `closeModal(id)` are available on the `window` object.
- **Modal HTML**: All modals are defined at the bottom of `index.html`.
- **Event Listeners**: Handled in `main.js` inside `bindForms()`.
