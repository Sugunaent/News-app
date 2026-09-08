INSERT INTO levels (id, name, minimum_xp, display_order)
VALUES 
  (gen_random_uuid(), 'Noob', 0, 1),
  (gen_random_uuid(), 'Rookie', 100, 2),
  (gen_random_uuid(), 'Pro', 500, 3),
  (gen_random_uuid(), 'Master', 1000, 4)
ON CONFLICT DO NOTHING;