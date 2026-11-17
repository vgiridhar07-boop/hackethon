-- Seed 03: Pan-India Universal & Departmental Helplines Directory
INSERT INTO departments_helplines (id, organization_name, department_name, category, contact_number, primary_phone_raw, callable_uri, is_tollfree, operational_hours, geolocation_scope, priority_tier)
VALUES
  ('nat-1-line', NULL, NULL, 'Emergency', '112', '112', 'tel:112', FALSE, '24x7', 'Pan-India', 1),
  ('nat-2-line', NULL, NULL, 'Drainage', '112', '112', 'tel:112', FALSE, '24x7', 'Pan-India', 1),
  ('nat-3-line', NULL, NULL, 'Garbage', '112', '112', 'tel:112', FALSE, '24x7', 'Pan-India', 1),
  ('nat-4-line', NULL, NULL, 'Consumer', '112', '112', 'tel:112', FALSE, '24x7', 'Pan-India', 1),
  ('nat-5-line', NULL, NULL, 'General', '112', '112', 'tel:112', FALSE, '24x7', 'Pan-India', 1),
  ('nat-6-line', NULL, NULL, 'General', '112', '112', 'tel:112', FALSE, '24x7', 'Pan-India', 1),
  ('nat-7-line', NULL, NULL, 'General', '112', '112', 'tel:112', FALSE, '24x7', 'Pan-India', 1),
  ('nat-8-line', NULL, NULL, 'General', '112', '112', 'tel:112', FALSE, '24x7', 'Pan-India', 1),
  ('nat-9-line', NULL, NULL, 'General', '112', '112', 'tel:112', FALSE, '24x7', 'Pan-India', 1)
ON CONFLICT (id) DO NOTHING;
