import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY

const supabase = createClient(supabaseUrl!, supabaseAnonKey!)

async function test() {
  const { data, error } = await supabase
    .from('client_certification_bodies')
    .select(`
      id,
      client_id,
      clients!inner ( id, is_active ),
      certification_bodies ( id, name, short_name )
    `)
  console.log("Error:", error)
  console.log("Data count:", data?.length)
  if (data?.length > 0) {
    console.log("Sample:", JSON.stringify(data[0], null, 2))
  }
}

test()
