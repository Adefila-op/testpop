const fs = require('fs');
const text = fs.readFileSync('SUPABASE_SCHEMA.sql', 'utf8');
const lines = text.split(/\r?\n/);
let errors = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.startsWith('CREATE POLICY "')) {
    const policy = line.match(/CREATE POLICY "([^"]+)" ON ([^\s]+)/);
    if (policy) {
      const name = policy[1];
      const table = policy[2];
      const prev = (lines[i-1] || '').trim();
      if (!prev.startsWith(`DROP POLICY IF EXISTS "${name}" ON ${table}`)) {
        errors.push({ line: i+1, name, table, prev });
      }
    }
  }
}
if (errors.length === 0) {
  console.log('OK: All CREATE POLICY statements have a preceding DROP POLICY IF EXISTS.');
} else {
  console.log('MISSING DROP POLICY for the following CREATE POLICY statements:');
  errors.forEach(e => console.log(`line ${e.line}: ${e.name} on ${e.table} (prev="${e.prev}")`));
}
