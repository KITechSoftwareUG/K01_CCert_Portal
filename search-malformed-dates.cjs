const url = `${process.env.VITE_SUPABASE_URL}/rest/v1/audits?scheduled_date=gte.0001-01-01&scheduled_date=lte.0100-12-31&select=id,scheduled_date,client_id`;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log("Searching for audits with year < 0100...");

fetch(url, {
  headers: {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
  }
})
.then(res => res.json())
.then(data => {
  console.log("Malformed Audits:", JSON.stringify(data, null, 2));
})
.catch(err => console.error(err));

const taskUrl = `${process.env.VITE_SUPABASE_URL}/rest/v1/audit_tasks?due_date=gte.0001-01-01&due_date=lte.0100-12-31&select=id,due_date`;
fetch(taskUrl, {
  headers: {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
  }
})
.then(res => res.json())
.then(data => {
  console.log("Malformed Tasks:", JSON.stringify(data, null, 2));
})
.catch(err => console.error(err));
