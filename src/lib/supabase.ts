import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  throw new Error(
    'Supabase 연결 정보가 없어요. .env.example을 .env로 복사하고 ' +
      'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY를 채워주세요.',
  )
}

export const supabase = createClient<Database>(url, anonKey)
