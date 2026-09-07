-- Update or insert super admin user abebetadesse1@gmail.com with password Ninielda@&1
UPDATE users 
SET 
  password_hash = encode(digest('Ninielda@&1', 'sha256'), 'hex'),
  role = 'system_admin',
  full_name = 'Abebe Tadesse',
  is_admin_granted_by_super_admin = TRUE,
  is_active = TRUE
WHERE email = 'abebetadesse1@gmail.com';

-- Verify
SELECT id, email, password_hash, full_name, role, is_admin_granted_by_super_admin, is_active 
FROM users 
WHERE email = 'abebetadesse1@gmail.com';
