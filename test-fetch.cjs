const url = `${process.env.VITE_SUPABASE_URL}/rest/v1/client_certification_bodies?select=id,client_id,clients!inner(id,is_active),certification_bodies(id,name,short_name)`;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

fetch(url, {
  headers: {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`
  }
})
.then(res => res.json())
.then(data => {
  if (data.error || data.message || data.code) {
    console.error("Error:", data);
  } else {
    console.log("Count:", data.length);
    if (data.length > 0) {
      console.log("Sample:", JSON.stringify(data[0]));
    }
  }
})
.catch(err => console.error("Network error:", err));
