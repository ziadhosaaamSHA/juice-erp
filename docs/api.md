# API Spec (MVP)

Base URL: `/api/v1`

## Auth
- POST `/auth/login`
- POST `/auth/logout`
- GET `/auth/me`

## Accounting
- GET `/accounting/accounts`
- POST `/accounting/accounts`
- GET `/accounting/journal-entries`
- POST `/accounting/journal-entries`
- POST `/accounting/opening-capital`

## Inventory
- GET `/inventory/items`
- POST `/inventory/items`
- GET `/inventory/warehouses`
- POST `/inventory/warehouses`
- GET `/inventory/movements`
- POST `/inventory/adjustments`

## Production
- GET `/production/orders`
- POST `/production/orders`
- POST `/production/orders/:id/execute`

## Sales
- GET `/sales/invoices`
- POST `/sales/invoices`
- POST `/sales/invoices/:id/post`
- GET `/sales/returns`
- POST `/sales/returns`

## Purchases
- GET `/purchases/invoices`
- POST `/purchases/invoices`
- POST `/purchases/invoices/:id/post`

## CRM
- GET `/crm/customers`
- POST `/crm/customers`
- GET `/crm/suppliers`
- POST `/crm/suppliers`

## Distribution
- GET `/distribution/vehicles`
- POST `/distribution/vehicles`
- POST `/distribution/loads`
- POST `/distribution/settlements`

## Alerts
- GET `/alerts`
- POST `/alerts/:id/read`

## Messages
- POST `/messages/sms`
- POST `/messages/whatsapp`
- GET `/messages/logs`

## Reports
- GET `/reports/profit`
- GET `/reports/inventory`
- GET `/reports/customer-debt`
- GET `/reports/production-cost`
- GET `/reports/vehicle-custody`

## Sample Payloads (MVP)

### POST `/accounting/opening-capital`
```json
{ "entryDate": "2026-02-03", "amount": 500000 }
```

### POST `/purchases/invoices`
```json
{
  "invoiceNo": "P-1001",
  "supplierId": "uuid",
  "invoiceDate": "2026-02-03",
  "items": [{ "itemId": "uuid", "warehouseId": "uuid", "qty": 100, "unitPrice": 15 }]
}
```

### POST `/purchases/invoices/:id/post`
```json
{ "entryDate": "2026-02-03" }
```

### POST `/sales/invoices`
```json
{
  "invoiceNo": "S-1001",
  "customerId": "uuid",
  "invoiceDate": "2026-02-03",
  "items": [{ "itemId": "uuid", "warehouseId": "uuid", "qty": 50, "unitPrice": 25 }]
}
```

### POST `/sales/invoices/:id/post`
```json
{
  "entryDate": "2026-02-03",
  "itemsCost": [{ "itemId": "uuid", "unitCost": 12.5 }]
}
```

### POST `/production/orders`
```json
{
  "orderNo": "PR-001",
  "productionDate": "2026-02-03",
  "materials": [{ "itemId": "uuid", "qtyUsed": 40, "unitCost": 8 }],
  "outputs": [{ "itemId": "uuid", "qtyProduced": 30 }]
}
```

### POST `/production/orders/:id/execute`
```json
{ "entryDate": "2026-02-03", "warehouseId": "uuid" }
```
