-- Seed 04: PDF-Verified Departmental Officers & Whitelisted Field Operatives
INSERT INTO users (user_id, phone_number, phone_number_sha256, phone_number_aes_enc, full_name, preferred_lang, role, default_district_id)
VALUES
  ('11111111-1111-4111-8111-111111111111', '9440818047', 'sha256_9440818047', 'aes256_9440818047', 'Executive Engineer - PWD Roads', 'en', 'Department Operator', 1),
  ('22222222-2222-4222-8222-222222222222', '9100120900', 'sha256_9100120900', 'aes256_9100120900', 'Superintending Engineer - PHED Water', 'en', 'Department Operator', 1),
  ('33333333-3333-4333-8333-333333333333', '9849903325', 'sha256_9849903325', 'aes256_9849903325', 'Municipal Commissioner - Sanitation', 'en', 'Department Operator', 1),
  ('44444444-4444-4444-8444-444444444444', '8500001912', 'sha256_8500001912', 'aes256_8500001912', 'Divisional Engineer - DISCOM Power', 'en', 'Department Operator', 1),
  ('55555555-5555-4555-8555-555555555555', '9441244749', 'sha256_9441244749', 'aes256_9441244749', 'Chief Engineer - Guntur PWD Roads', 'en', 'Department Operator', 6),
  ('66666666-6666-4666-8666-666666666666', '9100121400', 'sha256_9100121400', 'aes256_9100121400', 'Chief Engineer - Guntur PHED Water', 'en', 'Department Operator', 6),
  ('77777777-7777-4777-8777-777777777777', '9849906101', 'sha256_9849906101', 'aes256_9849906101', 'Superintendent - Guntur Sanitation', 'en', 'Department Operator', 6),
  ('88888888-8888-4888-8888-888888888888', '9440815049', 'sha256_9440815049', 'aes256_9440815049', 'Divisional Engineer - Guntur DISCOM', 'en', 'Department Operator', 6)
ON CONFLICT (phone_number) DO NOTHING;
