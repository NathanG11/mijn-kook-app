import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fwfbnnrkmzargyqdhvul.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3ZmJubnJrbXphcmd5cWRodnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxODM1MTgsImV4cCI6MjA3MDc1OTUxOH0.UJXubLnIxa3XvPGTInaLkPu94xLAlw_NmUWKqLfJu2c'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)