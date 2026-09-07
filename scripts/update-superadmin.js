const crypto = require('crypto');
const postgres = require('postgres');

const email = 'abebetadesse1@gmail.com';
const password = 'Ninielda@&1';
const hash = crypto.createHash('sha256').update(password, 'utf8').digest('hex');

console.log('Target Email:', email);
console.log('Password SHA-256 Hash:', hash);

async function run() {
  const sql = postgres('postgres://postgres:postgres@localhost:5432/clinic_enterprise');
  try {
    const existing = await sql`SELECT id, email, role, password_hash, is_active FROM users WHERE email = ${email}`;
    console.log('Existing user:', existing);

    if (existing.length > 0) {
      const updated = await sql`
        UPDATE users 
        SET 
          password_hash = ${hash},
          role = 'system_admin',
          is_admin_granted_by_super_admin = TRUE,
          is_active = TRUE
        WHERE email = ${email}
        RETURNING id, email, role, is_active, is_admin_granted_by_super_admin
      `;
      console.log('Updated user in DB:', updated);
    } else {
      const [org] = await sql`SELECT id FROM organizations LIMIT 1`;
      const inserted = await sql`
        INSERT INTO users (
          id, organization_id, email, password_hash, full_name, role, department, is_admin_granted_by_super_admin, is_active
        ) VALUES (
          '5c254614-7cb0-4e72-a7cb-7bbe0a98c42d',
          ${org.id},
          ${email},
          ${hash},
          'Super Administrator (Abebe Tadesse)',
          'system_admin',
          'Enterprise IT & Clinical Governance',
          TRUE,
          TRUE
        )
        RETURNING id, email, role, is_active, is_admin_granted_by_super_admin
      `;
      console.log('Inserted user in DB:', inserted);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.end();
  }
}

run();
