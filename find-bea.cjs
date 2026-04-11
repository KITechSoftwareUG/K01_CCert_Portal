const url = `${process.env.VITE_SUPABASE_URL}/rest/v1/certification_bodies?name=ilike.*BEA Institut*&select=id,name,short_name`;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

fetch(url, { headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` } })
.then(res => res.json())
.then(data => console.log("BEA Body:", JSON.stringify(data, null, 2)));
