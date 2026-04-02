const url = `${process.env.VITE_SUPABASE_URL}/rest/v1/audits?select=id,scheduled_date,status&limit=10`;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
fetch(url, {
  headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
})
.then(res => res.json())
.then(data => console.log("Audits Sample:", JSON.stringify(data, null, 2)));
