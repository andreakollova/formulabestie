import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          team_id: string | null
          fav_driver_id: string | null
          secondary_driver_id: string | null
          country: string | null
          f1_story: string | null
          onboarded: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      fg_races: {
        Row: {
          id: string
          slug: string
          name: string
          circuit: string
          country: string
          race_start: string
          quali_start: string | null
          status: 'upcoming' | 'pre-race' | 'live' | 'post-race' | 'finished'
          season: number
          round: number
          created_at: string
        }
      }
      fg_chat_messages: {
        Row: {
          id: string
          race_id: string | null
          driver_id: string | null
          room: string
          user_id: string
          text: string
          mood: string | null
          created_at: string
        }
        Insert: {
          race_id?: string | null
          driver_id?: string | null
          room: string
          user_id: string
          text: string
          mood?: string | null
        }
      }
      fg_race_entries: {
        Row: {
          id: string
          race_id: string
          user_id: string
          attended: boolean
          prediction_p1: string | null
          prediction_p2: string | null
          prediction_p3: string | null
          prediction_fl: string | null
          dnf_prediction: string | null
          mood_tag: string | null
          journal_entry: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['fg_race_entries']['Row']> & {
          race_id: string
          user_id: string
        }
        Update: Partial<Database['public']['Tables']['fg_race_entries']['Row']>
      }
      fg_follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
      }
    }
  }
}
