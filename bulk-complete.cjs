const url = `${process.env.VITE_SUPABASE_URL}/rest/v1/audits?scheduled_date=gte.2025-01-01&scheduled_date=lte.2026-03-31&status=neq.completed&status=neq.cancelled`;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log("Attempting to complete audits for 2025-2026...");

fetch(url, {
  method: 'PATCH',
  headers: {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify({ status: 'completed' })
})
.then(res => res.json())
.then(data => {
  console.log("Audits Update Result:", JSON.stringify(data, null, 2));
})
.catch(err => console.error("Error updating audits:", err));

const taskUrl = `${process.env.VITE_SUPABASE_URL}/rest/v1/audit_tasks?due_date=gte.2025-01-01&due_date=lte.2026-03-31&status=neq.completed`;
fetch(taskUrl, {
  method: 'PATCH',
  headers: {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify({ status: 'completed' })
})
.then(res => res.json())
.then(data => {
  console.log("Tasks Update Result:", JSON.stringify(data, null, 2));
})
.catch(err => console.error("Error updating tasks:", err));
