# ERD (Textual)

- users 1..* user_roles *..1 roles
- roles 1..* role_permissions *..1 permissions
- accounts 1..* accounts (parent-child)
- journal_entries 1..* journal_lines *..1 accounts
- customers 1..* sales_invoices
- suppliers 1..* purchase_invoices
- items 1..* inventory_movements
- warehouses 1..* inventory_movements
- production_orders 1..* production_materials
- production_orders 1..* production_outputs
- sales_invoices 1..* sales_invoice_items
- purchase_invoices 1..* purchase_invoice_items
- vehicles 1..* custody_movements
- warehouses 1..* custody_movements
- items 1..* custody_movements

Notes:
- `journal_entries.source_type/source_id` links to any module (polymorphic).
- `inventory_movements.source_type/source_id` links to purchase/sales/production/custody.
- `custody_movements` records vehicle loads/returns/sales in the field.
