-- Basic roles and permissions
INSERT INTO roles (name, description) VALUES
  ('Admin', 'Full access'),
  ('Accountant', 'Accounting operations'),
  ('StoreKeeper', 'Inventory operations'),
  ('Sales', 'Sales operations'),
  ('ProductionManager', 'Production operations'),
  ('DeliverySupervisor', 'Distribution operations')
ON CONFLICT DO NOTHING;

-- Basic chart of accounts
INSERT INTO accounts (code, name, type) VALUES
  ('1100', 'الصندوق', 'asset'),
  ('1200', 'حسابات العملاء', 'asset'),
  ('1300', 'مخزون مواد خام', 'asset'),
  ('1310', 'مخزون منتجات تامة', 'asset'),
  ('3100', 'رأس المال', 'equity'),
  ('2100', 'حسابات الموردين', 'liability'),
  ('4100', 'إيرادات المبيعات', 'revenue'),
  ('5100', 'تكلفة البضاعة المباعة', 'expense')
ON CONFLICT DO NOTHING;

-- Backup history seed
INSERT INTO backup_history (file_name, size_mb, status, notes)
VALUES ('backup_2026_02_01.sql', 12.4, 'completed', 'نسخة كاملة')
ON CONFLICT DO NOTHING;
