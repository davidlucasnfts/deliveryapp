import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://gkzdqnhhecfwkmrsfrcj.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdremRxbmhoZWNmd2ttcnNmcmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODkyMTYsImV4cCI6MjA5MTE2NTIxNn0.O2ADkwDJ6k7oa_QnMIHaA1IjVP4j_c_z-SQOTqaIS6s'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)