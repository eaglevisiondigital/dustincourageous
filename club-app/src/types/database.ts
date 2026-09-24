export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievement_token_ledger: {
        Row: {
          amount: number
          challenge_series_id: string | null
          child_profile_id: string
          created_at: string
          description: string | null
          event_type: string
          id: string
          period_start: string | null
          source_id: string | null
          source_type: string | null
          token_type: string
        }
        Insert: {
          amount: number
          challenge_series_id?: string | null
          child_profile_id: string
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          period_start?: string | null
          source_id?: string | null
          source_type?: string | null
          token_type: string
        }
        Update: {
          amount?: number
          challenge_series_id?: string | null
          child_profile_id?: string
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          period_start?: string | null
          source_id?: string | null
          source_type?: string | null
          token_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_token_ledger_challenge_series_id_fkey"
            columns: ["challenge_series_id"]
            isOneToOne: false
            referencedRelation: "challenge_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievement_token_ledger_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "achievement_token_ledger_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          after_state: Json | null
          before_state: Json | null
          child_profile_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          household_id: string | null
          id: number
          metadata: Json
          request_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          child_profile_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          household_id?: string | null
          id?: never
          metadata?: Json
          request_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          child_profile_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          household_id?: string | null
          id?: never
          metadata?: Json
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "admin_audit_log_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      adventure_challenges: {
        Row: {
          adventure_id: string
          challenge_id: string
          created_at: string
          is_required: boolean
          sort_order: number
        }
        Insert: {
          adventure_id: string
          challenge_id: string
          created_at?: string
          is_required?: boolean
          sort_order?: number
        }
        Update: {
          adventure_id?: string
          challenge_id?: string
          created_at?: string
          is_required?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "adventure_challenges_adventure_id_fkey"
            columns: ["adventure_id"]
            isOneToOne: false
            referencedRelation: "adventures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adventure_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      adventure_content_links: {
        Row: {
          adventure_id: string
          content_item_id: string
          created_at: string
          is_required: boolean
          sort_order: number
        }
        Insert: {
          adventure_id: string
          content_item_id: string
          created_at?: string
          is_required?: boolean
          sort_order?: number
        }
        Update: {
          adventure_id?: string
          content_item_id?: string
          created_at?: string
          is_required?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "adventure_content_links_adventure_id_fkey"
            columns: ["adventure_id"]
            isOneToOne: false
            referencedRelation: "adventures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adventure_content_links_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      adventures: {
        Row: {
          access_level: string
          available_from: string | null
          available_until: string | null
          book_id: string | null
          completion_xp: number
          cover_asset_key: string | null
          created_at: string
          description: string | null
          estimated_days: number | null
          id: string
          instructions: string | null
          is_featured: boolean
          maximum_age: number | null
          metadata: Json
          minimum_age: number | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          access_level?: string
          available_from?: string | null
          available_until?: string | null
          book_id?: string | null
          completion_xp?: number
          cover_asset_key?: string | null
          created_at?: string
          description?: string | null
          estimated_days?: number | null
          id?: string
          instructions?: string | null
          is_featured?: boolean
          maximum_age?: number | null
          metadata?: Json
          minimum_age?: number | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          access_level?: string
          available_from?: string | null
          available_until?: string | null
          book_id?: string | null
          completion_xp?: number
          cover_asset_key?: string | null
          created_at?: string
          description?: string | null
          estimated_days?: number | null
          id?: string
          instructions?: string | null
          is_featured?: boolean
          maximum_age?: number | null
          metadata?: Json
          minimum_age?: number | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "adventures_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      app_admins: {
        Row: {
          created_at: string
          created_by: string | null
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          role: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      badge_awards: {
        Row: {
          awarded_at: string
          badge_id: string
          child_profile_id: string
          id: string
          metadata: Json
          source_id: string | null
          source_type: string | null
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          child_profile_id: string
          id?: string
          metadata?: Json
          source_id?: string | null
          source_type?: string | null
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          child_profile_id?: string
          id?: string
          metadata?: Json
          source_id?: string | null
          source_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "badge_awards_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_awards_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "badge_awards_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_rules: {
        Row: {
          activity_event_type: string | null
          badge_id: string
          challenge_type: string | null
          created_at: string
          id: string
          is_active: boolean
          metadata: Json
          rule_type: string
          streak_key: string | null
          threshold_value: number | null
          token_type: string | null
          updated_at: string
        }
        Insert: {
          activity_event_type?: string | null
          badge_id: string
          challenge_type?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          rule_type: string
          streak_key?: string | null
          threshold_value?: number | null
          token_type?: string | null
          updated_at?: string
        }
        Update: {
          activity_event_type?: string | null
          badge_id?: string
          challenge_type?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          rule_type?: string
          streak_key?: string | null
          threshold_value?: number | null
          token_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "badge_rules_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          badge_family_key: string | null
          badge_key: string
          badge_scope: string
          badge_tier: string | null
          created_at: string
          description: string | null
          icon_asset_key: string | null
          id: string
          is_active: boolean
          metadata: Json
          name: string
          rarity: string
          updated_at: string
        }
        Insert: {
          badge_family_key?: string | null
          badge_key: string
          badge_scope?: string
          badge_tier?: string | null
          created_at?: string
          description?: string | null
          icon_asset_key?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          rarity?: string
          updated_at?: string
        }
        Update: {
          badge_family_key?: string | null
          badge_key?: string
          badge_scope?: string
          badge_tier?: string | null
          created_at?: string
          description?: string | null
          icon_asset_key?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          rarity?: string
          updated_at?: string
        }
        Relationships: []
      }
      book_challenges: {
        Row: {
          book_id: string
          challenge_id: string
          created_at: string
          sort_order: number
        }
        Insert: {
          book_id: string
          challenge_id: string
          created_at?: string
          sort_order?: number
        }
        Update: {
          book_id?: string
          challenge_id?: string
          created_at?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "book_challenges_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      book_content_links: {
        Row: {
          book_id: string
          content_item_id: string
          created_at: string
          relationship_type: string
          sort_order: number
        }
        Insert: {
          book_id: string
          content_item_id: string
          created_at?: string
          relationship_type?: string
          sort_order?: number
        }
        Update: {
          book_id?: string
          content_item_id?: string
          created_at?: string
          relationship_type?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "book_content_links_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_content_links_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      book_devotional_series: {
        Row: {
          book_id: string
          created_at: string
          devotional_series_id: string
          sort_order: number
        }
        Insert: {
          book_id: string
          created_at?: string
          devotional_series_id: string
          sort_order?: number
        }
        Update: {
          book_id?: string
          created_at?: string
          devotional_series_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "book_devotional_series_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_devotional_series_devotional_series_id_fkey"
            columns: ["devotional_series_id"]
            isOneToOne: false
            referencedRelation: "devotional_series"
            referencedColumns: ["id"]
          },
        ]
      }
      book_identity_truths: {
        Row: {
          book_id: string
          created_at: string
          identity_truth_id: string
          sort_order: number
        }
        Insert: {
          book_id: string
          created_at?: string
          identity_truth_id: string
          sort_order?: number
        }
        Update: {
          book_id?: string
          created_at?: string
          identity_truth_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "book_identity_truths_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_identity_truths_identity_truth_id_fkey"
            columns: ["identity_truth_id"]
            isOneToOne: false
            referencedRelation: "identity_truths"
            referencedColumns: ["id"]
          },
        ]
      }
      book_power_verses: {
        Row: {
          book_id: string
          created_at: string
          power_verse_id: string
          sort_order: number
        }
        Insert: {
          book_id: string
          created_at?: string
          power_verse_id: string
          sort_order?: number
        }
        Update: {
          book_id?: string
          created_at?: string
          power_verse_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "book_power_verses_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_power_verses_power_verse_id_fkey"
            columns: ["power_verse_id"]
            isOneToOne: false
            referencedRelation: "power_verses"
            referencedColumns: ["id"]
          },
        ]
      }
      book_prayer_prompts: {
        Row: {
          book_id: string
          created_at: string
          prayer_prompt_id: string
          sort_order: number
        }
        Insert: {
          book_id: string
          created_at?: string
          prayer_prompt_id: string
          sort_order?: number
        }
        Update: {
          book_id?: string
          created_at?: string
          prayer_prompt_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "book_prayer_prompts_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_prayer_prompts_prayer_prompt_id_fkey"
            columns: ["prayer_prompt_id"]
            isOneToOne: false
            referencedRelation: "prayer_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          book_number: number | null
          completion_xp: number
          cover_asset_key: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json
          release_date: string | null
          slug: string
          status: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          book_number?: number | null
          completion_xp?: number
          cover_asset_key?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          release_date?: string | null
          slug: string
          status?: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          book_number?: number | null
          completion_xp?: number
          cover_asset_key?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          release_date?: string | null
          slug?: string
          status?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      challenge_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assignment_source: string
          challenge_id: string
          child_profile_id: string | null
          due_at: string | null
          household_id: string
          id: string
          metadata: Json
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_source?: string
          challenge_id: string
          child_profile_id?: string | null
          due_at?: string | null
          household_id: string
          id?: string
          metadata?: Json
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_source?: string
          challenge_id?: string
          child_profile_id?: string | null
          due_at?: string | null
          household_id?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "challenge_assignments_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_assignments_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "challenge_assignments_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_assignments_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_series: {
        Row: {
          cadence: string
          created_at: string
          description: string | null
          id: string
          metadata: Json
          name: string
          series_key: string
          status: string
          token_amount: number
          token_type: string
          updated_at: string
        }
        Insert: {
          cadence?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          name: string
          series_key: string
          status?: string
          token_amount?: number
          token_type?: string
          updated_at?: string
        }
        Update: {
          cadence?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          name?: string
          series_key?: string
          status?: string
          token_amount?: number
          token_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      challenge_steps: {
        Row: {
          challenge_id: string
          content_item_id: string | null
          created_at: string
          id: string
          instructions: string | null
          is_required: boolean
          metadata: Json
          sort_order: number
          title: string
          xp_reward: number
        }
        Insert: {
          challenge_id: string
          content_item_id?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          is_required?: boolean
          metadata?: Json
          sort_order?: number
          title: string
          xp_reward?: number
        }
        Update: {
          challenge_id?: string
          content_item_id?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          is_required?: boolean
          metadata?: Json
          sort_order?: number
          title?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenge_steps_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_steps_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          access_level: string
          available_from: string | null
          available_until: string | null
          challenge_series_id: string | null
          challenge_type: string
          created_at: string
          description: string | null
          id: string
          instructions: string | null
          is_featured: boolean
          maximum_age: number | null
          metadata: Json
          minimum_age: number | null
          parent_approval_required: boolean
          period_end: string | null
          period_start: string | null
          recurrence_rule: Json
          schedule_mode: string
          slug: string
          status: string
          title: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          access_level?: string
          available_from?: string | null
          available_until?: string | null
          challenge_series_id?: string | null
          challenge_type: string
          created_at?: string
          description?: string | null
          id?: string
          instructions?: string | null
          is_featured?: boolean
          maximum_age?: number | null
          metadata?: Json
          minimum_age?: number | null
          parent_approval_required?: boolean
          period_end?: string | null
          period_start?: string | null
          recurrence_rule?: Json
          schedule_mode?: string
          slug: string
          status?: string
          title: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          access_level?: string
          available_from?: string | null
          available_until?: string | null
          challenge_series_id?: string | null
          challenge_type?: string
          created_at?: string
          description?: string | null
          id?: string
          instructions?: string | null
          is_featured?: boolean
          maximum_age?: number | null
          metadata?: Json
          minimum_age?: number | null
          parent_approval_required?: boolean
          period_end?: string | null
          period_start?: string | null
          recurrence_rule?: Json
          schedule_mode?: string
          slug?: string
          status?: string
          title?: string
          updated_at?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenges_challenge_series_id_fkey"
            columns: ["challenge_series_id"]
            isOneToOne: false
            referencedRelation: "challenge_series"
            referencedColumns: ["id"]
          },
        ]
      }
      child_activity_events: {
        Row: {
          child_profile_id: string
          created_at: string
          description: string | null
          event_type: string
          household_id: string
          id: number
          metadata: Json
          source_id: string | null
          source_type: string | null
          title: string
          xp_delta: number | null
        }
        Insert: {
          child_profile_id: string
          created_at?: string
          description?: string | null
          event_type: string
          household_id: string
          id?: never
          metadata?: Json
          source_id?: string | null
          source_type?: string | null
          title: string
          xp_delta?: number | null
        }
        Update: {
          child_profile_id?: string
          created_at?: string
          description?: string | null
          event_type?: string
          household_id?: string
          id?: never
          metadata?: Json
          source_id?: string | null
          source_type?: string | null
          title?: string
          xp_delta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "child_activity_events_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "child_activity_events_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_activity_events_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      child_adventure_progress: {
        Row: {
          adventure_id: string
          child_profile_id: string
          completed_at: string | null
          created_at: string
          id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          adventure_id: string
          child_profile_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          adventure_id?: string
          child_profile_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_adventure_progress_adventure_id_fkey"
            columns: ["adventure_id"]
            isOneToOne: false
            referencedRelation: "adventures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_adventure_progress_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "child_adventure_progress_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      child_book_progress: {
        Row: {
          adventure_completed_at: string | null
          book_id: string
          child_profile_id: string
          completed_at: string | null
          created_at: string
          id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          adventure_completed_at?: string | null
          book_id: string
          child_profile_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          adventure_completed_at?: string | null
          book_id?: string
          child_profile_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_book_progress_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_book_progress_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "child_book_progress_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      child_challenge_progress: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          challenge_id: string
          child_profile_id: string
          completed_at: string | null
          created_at: string
          evidence_text: string | null
          id: string
          started_at: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          challenge_id: string
          child_profile_id: string
          completed_at?: string | null
          created_at?: string
          evidence_text?: string | null
          id?: string
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          challenge_id?: string
          child_profile_id?: string
          completed_at?: string | null
          created_at?: string
          evidence_text?: string | null
          id?: string
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_challenge_progress_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "child_challenge_progress_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      child_content_progress: {
        Row: {
          child_profile_id: string
          completed_at: string | null
          content_item_id: string
          created_at: string
          id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          child_profile_id: string
          completed_at?: string | null
          content_item_id: string
          created_at?: string
          id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          child_profile_id?: string
          completed_at?: string | null
          content_item_id?: string
          created_at?: string
          id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_content_progress_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "child_content_progress_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_content_progress_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
        ]
      }
      child_devotional_progress: {
        Row: {
          child_profile_id: string
          completed_at: string | null
          created_at: string
          devotional_day_id: string
          id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          child_profile_id: string
          completed_at?: string | null
          created_at?: string
          devotional_day_id: string
          id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          child_profile_id?: string
          completed_at?: string | null
          created_at?: string
          devotional_day_id?: string
          id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_devotional_progress_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "child_devotional_progress_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_devotional_progress_devotional_day_id_fkey"
            columns: ["devotional_day_id"]
            isOneToOne: false
            referencedRelation: "devotional_days"
            referencedColumns: ["id"]
          },
        ]
      }
      child_identity_progress: {
        Row: {
          child_profile_id: string
          favorited: boolean
          id: string
          identity_truth_id: string
          learned: boolean
          learned_at: string | null
          updated_at: string
        }
        Insert: {
          child_profile_id: string
          favorited?: boolean
          id?: string
          identity_truth_id: string
          learned?: boolean
          learned_at?: string | null
          updated_at?: string
        }
        Update: {
          child_profile_id?: string
          favorited?: boolean
          id?: string
          identity_truth_id?: string
          learned?: boolean
          learned_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_identity_progress_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "child_identity_progress_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_identity_progress_identity_truth_id_fkey"
            columns: ["identity_truth_id"]
            isOneToOne: false
            referencedRelation: "identity_truths"
            referencedColumns: ["id"]
          },
        ]
      }
      child_prayer_progress: {
        Row: {
          child_profile_id: string
          completed_at: string
          created_at: string
          id: string
          prayer_prompt_id: string
        }
        Insert: {
          child_profile_id: string
          completed_at?: string
          created_at?: string
          id?: string
          prayer_prompt_id: string
        }
        Update: {
          child_profile_id?: string
          completed_at?: string
          created_at?: string
          id?: string
          prayer_prompt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_prayer_progress_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "child_prayer_progress_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_prayer_progress_prayer_prompt_id_fkey"
            columns: ["prayer_prompt_id"]
            isOneToOne: false
            referencedRelation: "prayer_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      child_profiles: {
        Row: {
          avatar_key: string | null
          birth_year: number | null
          created_at: string
          created_by: string
          display_name: string
          household_id: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          avatar_key?: string | null
          birth_year?: number | null
          created_at?: string
          created_by: string
          display_name: string
          household_id: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_key?: string | null
          birth_year?: number | null
          created_at?: string
          created_by?: string
          display_name?: string
          household_id?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      child_scripture_progress: {
        Row: {
          child_profile_id: string
          created_at: string
          id: string
          last_reviewed_at: string | null
          memorized_at: string | null
          power_verse_id: string
          repetitions: number
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          child_profile_id: string
          created_at?: string
          id?: string
          last_reviewed_at?: string | null
          memorized_at?: string | null
          power_verse_id: string
          repetitions?: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          child_profile_id?: string
          created_at?: string
          id?: string
          last_reviewed_at?: string | null
          memorized_at?: string | null
          power_verse_id?: string
          repetitions?: number
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_scripture_progress_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "child_scripture_progress_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_scripture_progress_power_verse_id_fkey"
            columns: ["power_verse_id"]
            isOneToOne: false
            referencedRelation: "power_verses"
            referencedColumns: ["id"]
          },
        ]
      }
      child_series_streaks: {
        Row: {
          best_weeks: number
          challenge_series_id: string
          child_profile_id: string
          current_cycle: number
          current_weeks: number
          last_completed_period: string | null
          streak_started_period: string | null
          updated_at: string
        }
        Insert: {
          best_weeks?: number
          challenge_series_id: string
          child_profile_id: string
          current_cycle?: number
          current_weeks?: number
          last_completed_period?: string | null
          streak_started_period?: string | null
          updated_at?: string
        }
        Update: {
          best_weeks?: number
          challenge_series_id?: string
          child_profile_id?: string
          current_cycle?: number
          current_weeks?: number
          last_completed_period?: string | null
          streak_started_period?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_series_streaks_challenge_series_id_fkey"
            columns: ["challenge_series_id"]
            isOneToOne: false
            referencedRelation: "challenge_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_series_streaks_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "child_series_streaks_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      child_series_weekly_completions: {
        Row: {
          challenge_id: string
          challenge_series_id: string
          child_profile_id: string
          completed_at: string
          created_at: string
          id: string
          period_start: string
          progress_id: string
        }
        Insert: {
          challenge_id: string
          challenge_series_id: string
          child_profile_id: string
          completed_at?: string
          created_at?: string
          id?: string
          period_start: string
          progress_id: string
        }
        Update: {
          challenge_id?: string
          challenge_series_id?: string
          child_profile_id?: string
          completed_at?: string
          created_at?: string
          id?: string
          period_start?: string
          progress_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_series_weekly_completions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_series_weekly_completions_challenge_series_id_fkey"
            columns: ["challenge_series_id"]
            isOneToOne: false
            referencedRelation: "challenge_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_series_weekly_completions_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "child_series_weekly_completions_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_series_weekly_completions_progress_id_fkey"
            columns: ["progress_id"]
            isOneToOne: false
            referencedRelation: "child_challenge_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      child_step_progress: {
        Row: {
          challenge_step_id: string
          child_challenge_progress_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          challenge_step_id: string
          child_challenge_progress_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          challenge_step_id?: string
          child_challenge_progress_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_step_progress_challenge_step_id_fkey"
            columns: ["challenge_step_id"]
            isOneToOne: false
            referencedRelation: "challenge_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_step_progress_child_challenge_progress_id_fkey"
            columns: ["child_challenge_progress_id"]
            isOneToOne: false
            referencedRelation: "child_challenge_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      child_streaks: {
        Row: {
          best_count: number
          child_profile_id: string
          current_count: number
          last_activity_date: string | null
          streak_key: string
          updated_at: string
        }
        Insert: {
          best_count?: number
          child_profile_id: string
          current_count?: number
          last_activity_date?: string | null
          streak_key: string
          updated_at?: string
        }
        Update: {
          best_count?: number
          child_profile_id?: string
          current_count?: number
          last_activity_date?: string | null
          streak_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_streaks_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "child_streaks_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_inquiries: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_hash: string | null
          message: string
          metadata: Json
          name: string
          source_page: string | null
          status: string
          user_agent_hash: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_hash?: string | null
          message: string
          metadata?: Json
          name: string
          source_page?: string | null
          status?: string
          user_agent_hash?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_hash?: string | null
          message?: string
          metadata?: Json
          name?: string
          source_page?: string | null
          status?: string
          user_agent_hash?: string | null
        }
        Relationships: []
      }
      content_items: {
        Row: {
          access_level: string
          asset_key: string | null
          available_from: string | null
          available_until: string | null
          body: Json
          content_type: string
          created_at: string
          id: string
          is_featured: boolean
          maximum_age: number | null
          metadata: Json
          minimum_age: number | null
          slug: string
          status: string
          summary: string | null
          thumbnail_asset_key: string | null
          title: string
          updated_at: string
        }
        Insert: {
          access_level?: string
          asset_key?: string | null
          available_from?: string | null
          available_until?: string | null
          body?: Json
          content_type: string
          created_at?: string
          id?: string
          is_featured?: boolean
          maximum_age?: number | null
          metadata?: Json
          minimum_age?: number | null
          slug: string
          status?: string
          summary?: string | null
          thumbnail_asset_key?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          access_level?: string
          asset_key?: string | null
          available_from?: string | null
          available_until?: string | null
          body?: Json
          content_type?: string
          created_at?: string
          id?: string
          is_featured?: boolean
          maximum_age?: number | null
          metadata?: Json
          minimum_age?: number | null
          slug?: string
          status?: string
          summary?: string | null
          thumbnail_asset_key?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      devotional_days: {
        Row: {
          action_step: string | null
          body: string
          created_at: string
          day_number: number
          devotional_series_id: string
          id: string
          metadata: Json
          prayer_prompt: string | null
          scripture_passage_id: string | null
          title: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          action_step?: string | null
          body: string
          created_at?: string
          day_number: number
          devotional_series_id: string
          id?: string
          metadata?: Json
          prayer_prompt?: string | null
          scripture_passage_id?: string | null
          title: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          action_step?: string | null
          body?: string
          created_at?: string
          day_number?: number
          devotional_series_id?: string
          id?: string
          metadata?: Json
          prayer_prompt?: string | null
          scripture_passage_id?: string | null
          title?: string
          updated_at?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "devotional_days_devotional_series_id_fkey"
            columns: ["devotional_series_id"]
            isOneToOne: false
            referencedRelation: "devotional_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devotional_days_scripture_passage_id_fkey"
            columns: ["scripture_passage_id"]
            isOneToOne: false
            referencedRelation: "scripture_passages"
            referencedColumns: ["id"]
          },
        ]
      }
      devotional_series: {
        Row: {
          access_level: string
          available_from: string | null
          available_until: string | null
          created_at: string
          description: string | null
          id: string
          is_featured: boolean
          metadata: Json
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          access_level?: string
          available_from?: string | null
          available_until?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          metadata?: Json
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          access_level?: string
          available_from?: string | null
          available_until?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          metadata?: Json
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      entitlement_definitions: {
        Row: {
          created_at: string
          description: string | null
          entitlement_key: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          entitlement_key: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          entitlement_key?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      household_book_access: {
        Row: {
          book_id: string
          created_at: string
          ends_at: string | null
          household_id: string
          id: string
          source_id: string | null
          source_type: string
          starts_at: string
        }
        Insert: {
          book_id: string
          created_at?: string
          ends_at?: string | null
          household_id: string
          id?: string
          source_id?: string | null
          source_type: string
          starts_at?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          ends_at?: string | null
          household_id?: string
          id?: string
          source_id?: string | null
          source_type?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_book_access_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_book_access_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_consents: {
        Row: {
          action: string
          child_profile_id: string | null
          consent_key: string
          created_at: string
          guardian_user_id: string
          household_id: string
          id: string
          metadata: Json
          policy_version: string
        }
        Insert: {
          action: string
          child_profile_id?: string | null
          consent_key: string
          created_at?: string
          guardian_user_id: string
          household_id: string
          id?: string
          metadata?: Json
          policy_version: string
        }
        Update: {
          action?: string
          child_profile_id?: string | null
          consent_key?: string
          created_at?: string
          guardian_user_id?: string
          household_id?: string
          id?: string
          metadata?: Json
          policy_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_consents_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "household_consents_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_consents_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_entitlement_grants: {
        Row: {
          created_at: string
          ends_at: string | null
          entitlement_key: string
          household_id: string
          id: string
          metadata: Json
          source_id: string | null
          source_type: string
          starts_at: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          entitlement_key: string
          household_id: string
          id?: string
          metadata?: Json
          source_id?: string | null
          source_type: string
          starts_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          entitlement_key?: string
          household_id?: string
          id?: string
          metadata?: Json
          source_id?: string | null
          source_type?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_entitlement_grants_entitlement_key_fkey"
            columns: ["entitlement_key"]
            isOneToOne: false
            referencedRelation: "entitlement_definitions"
            referencedColumns: ["entitlement_key"]
          },
          {
            foreignKeyName: "household_entitlement_grants_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string
          household_id: string
          id: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          role: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          household_id: string
          id: string
          metadata: Json
          plan_id: string
          provider: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          household_id: string
          id?: string
          metadata?: Json
          plan_id: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          household_id?: string
          id?: string
          metadata?: Json
          plan_id?: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_subscriptions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      identity_truths: {
        Row: {
          access_level: string
          created_at: string
          explanation: string | null
          id: string
          identity_statement: string
          metadata: Json
          say_it: string | null
          scripture_passage_id: string | null
          slug: string
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          explanation?: string | null
          id?: string
          identity_statement: string
          metadata?: Json
          say_it?: string | null
          scripture_passage_id?: string | null
          slug: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          access_level?: string
          created_at?: string
          explanation?: string | null
          id?: string
          identity_statement?: string
          metadata?: Json
          say_it?: string | null
          scripture_passage_id?: string | null
          slug?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "identity_truths_scripture_passage_id_fkey"
            columns: ["scripture_passage_id"]
            isOneToOne: false
            referencedRelation: "scripture_passages"
            referencedColumns: ["id"]
          },
        ]
      }
      levels: {
        Row: {
          created_at: string
          description: string | null
          icon_asset_key: string | null
          id: string
          is_active: boolean
          level_number: number
          minimum_xp: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_asset_key?: string | null
          id?: string
          is_active?: boolean
          level_number: number
          minimum_xp: number
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_asset_key?: string | null
          id?: string
          is_active?: boolean
          level_number?: number
          minimum_xp?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_leads: {
        Row: {
          child_age: number | null
          child_first_name: string | null
          consent_text: string | null
          consented_at: string | null
          created_at: string
          email: string
          id: string
          ip_hash: string | null
          lead_type: string
          marketing_consent: boolean
          metadata: Json
          parent_guardian_consent: boolean
          parent_guardian_name: string | null
          source_page: string | null
          status: string
          user_agent_hash: string | null
        }
        Insert: {
          child_age?: number | null
          child_first_name?: string | null
          consent_text?: string | null
          consented_at?: string | null
          created_at?: string
          email: string
          id?: string
          ip_hash?: string | null
          lead_type: string
          marketing_consent?: boolean
          metadata?: Json
          parent_guardian_consent?: boolean
          parent_guardian_name?: string | null
          source_page?: string | null
          status?: string
          user_agent_hash?: string | null
        }
        Update: {
          child_age?: number | null
          child_first_name?: string | null
          consent_text?: string | null
          consented_at?: string | null
          created_at?: string
          email?: string
          id?: string
          ip_hash?: string | null
          lead_type?: string
          marketing_consent?: boolean
          metadata?: Json
          parent_guardian_consent?: boolean
          parent_guardian_name?: string | null
          source_page?: string | null
          status?: string
          user_agent_hash?: string | null
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          asset_key: string
          bucket_name: string
          checksum_sha256: string | null
          created_at: string
          created_by: string | null
          description: string | null
          entitlement_key: string | null
          id: string
          media_type: string
          metadata: Json
          mime_type: string | null
          object_path: string
          size_bytes: number | null
          status: string
          title: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          asset_key: string
          bucket_name: string
          checksum_sha256?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entitlement_key?: string | null
          id?: string
          media_type: string
          metadata?: Json
          mime_type?: string | null
          object_path: string
          size_bytes?: number | null
          status?: string
          title?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          asset_key?: string
          bucket_name?: string
          checksum_sha256?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entitlement_key?: string | null
          id?: string
          media_type?: string
          metadata?: Json
          mime_type?: string | null
          object_path?: string
          size_bytes?: number | null
          status?: string
          title?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_entitlement_key_fkey"
            columns: ["entitlement_key"]
            isOneToOne: false
            referencedRelation: "entitlement_definitions"
            referencedColumns: ["entitlement_key"]
          },
        ]
      }
      membership_plans: {
        Row: {
          annual_price_cents: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          monthly_price_cents: number | null
          name: string
          plan_key: string
          updated_at: string
        }
        Insert: {
          annual_price_cents?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_price_cents?: number | null
          name: string
          plan_key: string
          updated_at?: string
        }
        Update: {
          annual_price_cents?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          monthly_price_cents?: number | null
          name?: string
          plan_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          child_progress: boolean
          created_at: string
          email_enabled: boolean
          family_reminders: boolean
          marketing: boolean
          product_updates: boolean
          push_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          rewards: boolean
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          child_progress?: boolean
          created_at?: string
          email_enabled?: boolean
          family_reminders?: boolean
          marketing?: boolean
          product_updates?: boolean
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          rewards?: boolean
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          child_progress?: boolean
          created_at?: string
          email_enabled?: boolean
          family_reminders?: boolean
          marketing?: boolean
          product_updates?: boolean
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          rewards?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_entitlements: {
        Row: {
          created_at: string
          entitlement_key: string
          plan_id: string
        }
        Insert: {
          created_at?: string
          entitlement_key: string
          plan_id: string
        }
        Update: {
          created_at?: string
          entitlement_key?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_entitlements_entitlement_key_fkey"
            columns: ["entitlement_key"]
            isOneToOne: false
            referencedRelation: "entitlement_definitions"
            referencedColumns: ["entitlement_key"]
          },
          {
            foreignKeyName: "plan_entitlements_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      power_verses: {
        Row: {
          access_level: string
          available_from: string | null
          available_until: string | null
          created_at: string
          give_it_away: string | null
          id: string
          is_featured: boolean
          kid_explanation: string | null
          live_it: string | null
          memorize_xp: number
          metadata: Json
          say_it: string | null
          scripture_passage_id: string
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          access_level?: string
          available_from?: string | null
          available_until?: string | null
          created_at?: string
          give_it_away?: string | null
          id?: string
          is_featured?: boolean
          kid_explanation?: string | null
          live_it?: string | null
          memorize_xp?: number
          metadata?: Json
          say_it?: string | null
          scripture_passage_id: string
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          access_level?: string
          available_from?: string | null
          available_until?: string | null
          created_at?: string
          give_it_away?: string | null
          id?: string
          is_featured?: boolean
          kid_explanation?: string | null
          live_it?: string | null
          memorize_xp?: number
          metadata?: Json
          say_it?: string | null
          scripture_passage_id?: string
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "power_verses_scripture_passage_id_fkey"
            columns: ["scripture_passage_id"]
            isOneToOne: false
            referencedRelation: "scripture_passages"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_prompts: {
        Row: {
          access_level: string
          category: string
          created_at: string
          id: string
          metadata: Json
          prompt_text: string
          scripture_passage_id: string | null
          slug: string
          status: string
          title: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          access_level?: string
          category?: string
          created_at?: string
          id?: string
          metadata?: Json
          prompt_text: string
          scripture_passage_id?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          access_level?: string
          category?: string
          created_at?: string
          id?: string
          metadata?: Json
          prompt_text?: string
          scripture_passage_id?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "prayer_prompts_scripture_passage_id_fkey"
            columns: ["scripture_passage_id"]
            isOneToOne: false
            referencedRelation: "scripture_passages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_devices: {
        Row: {
          app_version: string | null
          created_at: string
          device_name: string | null
          device_token: string
          id: string
          is_active: boolean
          last_seen_at: string
          platform: string | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          device_name?: string | null
          device_token: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          platform?: string | null
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          device_name?: string | null
          device_token?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          platform?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          fulfilled_at: string | null
          fulfillment_reference: string | null
          id: string
          metadata: Json
          requested_at: string
          requested_by: string
          reward_unlock_id: string
          status: string
        }
        Insert: {
          fulfilled_at?: string | null
          fulfillment_reference?: string | null
          id?: string
          metadata?: Json
          requested_at?: string
          requested_by: string
          reward_unlock_id: string
          status?: string
        }
        Update: {
          fulfilled_at?: string | null
          fulfillment_reference?: string | null
          id?: string
          metadata?: Json
          requested_at?: string
          requested_by?: string
          reward_unlock_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_unlock_id_fkey"
            columns: ["reward_unlock_id"]
            isOneToOne: true
            referencedRelation: "reward_unlocks"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_unlocks: {
        Row: {
          child_profile_id: string
          id: string
          redeemed_at: string | null
          reward_id: string
          source_id: string | null
          unlock_source: string
          unlocked_at: string
        }
        Insert: {
          child_profile_id: string
          id?: string
          redeemed_at?: string | null
          reward_id: string
          source_id?: string | null
          unlock_source: string
          unlocked_at?: string
        }
        Update: {
          child_profile_id?: string
          id?: string
          redeemed_at?: string | null
          reward_id?: string
          source_id?: string | null
          unlock_source?: string
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_unlocks_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "reward_unlocks_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_unlocks_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          access_level: string
          asset_key: string | null
          created_at: string
          description: string | null
          id: string
          inventory_quantity: number | null
          is_active: boolean
          metadata: Json
          name: string
          reward_key: string
          reward_type: string
          updated_at: string
          xp_required: number | null
        }
        Insert: {
          access_level?: string
          asset_key?: string | null
          created_at?: string
          description?: string | null
          id?: string
          inventory_quantity?: number | null
          is_active?: boolean
          metadata?: Json
          name: string
          reward_key: string
          reward_type: string
          updated_at?: string
          xp_required?: number | null
        }
        Update: {
          access_level?: string
          asset_key?: string | null
          created_at?: string
          description?: string | null
          id?: string
          inventory_quantity?: number | null
          is_active?: boolean
          metadata?: Json
          name?: string
          reward_key?: string
          reward_type?: string
          updated_at?: string
          xp_required?: number | null
        }
        Relationships: []
      }
      scripture_passages: {
        Row: {
          copyright_note: string | null
          created_at: string
          id: string
          metadata: Json
          reference: string
          status: string
          theme_key: string | null
          translation: string
          updated_at: string
          verse_text: string
        }
        Insert: {
          copyright_note?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          reference: string
          status?: string
          theme_key?: string | null
          translation: string
          updated_at?: string
          verse_text: string
        }
        Update: {
          copyright_note?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          reference?: string
          status?: string
          theme_key?: string | null
          translation?: string
          updated_at?: string
          verse_text?: string
        }
        Relationships: []
      }
      series_badge_rules: {
        Row: {
          active_only_while_current_streak: boolean
          badge_id: string
          challenge_series_id: string
          consecutive_weeks_required: number
          created_at: string
          id: string
          is_active: boolean
          metadata: Json
          updated_at: string
        }
        Insert: {
          active_only_while_current_streak?: boolean
          badge_id: string
          challenge_series_id: string
          consecutive_weeks_required: number
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          updated_at?: string
        }
        Update: {
          active_only_while_current_streak?: boolean
          badge_id?: string
          challenge_series_id?: string
          consecutive_weeks_required?: number
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "series_badge_rules_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_badge_rules_challenge_series_id_fkey"
            columns: ["challenge_series_id"]
            isOneToOne: false
            referencedRelation: "challenge_series"
            referencedColumns: ["id"]
          },
        ]
      }
      streak_badge_earnings: {
        Row: {
          badge_id: string
          challenge_series_id: string
          child_profile_id: string
          created_at: string
          earned_at: string
          id: string
          series_badge_rule_id: string
          streak_cycle: number
          streak_weeks_at_earn: number
        }
        Insert: {
          badge_id: string
          challenge_series_id: string
          child_profile_id: string
          created_at?: string
          earned_at?: string
          id?: string
          series_badge_rule_id: string
          streak_cycle: number
          streak_weeks_at_earn: number
        }
        Update: {
          badge_id?: string
          challenge_series_id?: string
          child_profile_id?: string
          created_at?: string
          earned_at?: string
          id?: string
          series_badge_rule_id?: string
          streak_cycle?: number
          streak_weeks_at_earn?: number
        }
        Relationships: [
          {
            foreignKeyName: "streak_badge_earnings_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streak_badge_earnings_challenge_series_id_fkey"
            columns: ["challenge_series_id"]
            isOneToOne: false
            referencedRelation: "challenge_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streak_badge_earnings_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "streak_badge_earnings_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "streak_badge_earnings_series_badge_rule_id_fkey"
            columns: ["series_badge_rule_id"]
            isOneToOne: false
            referencedRelation: "child_active_streak_badges"
            referencedColumns: ["series_badge_rule_id"]
          },
          {
            foreignKeyName: "streak_badge_earnings_series_badge_rule_id_fkey"
            columns: ["series_badge_rule_id"]
            isOneToOne: false
            referencedRelation: "series_badge_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          body: string
          child_profile_id: string | null
          created_at: string
          deep_link: string | null
          expires_at: string | null
          household_id: string | null
          id: string
          image_asset_key: string | null
          metadata: Json
          notification_type: string
          priority: string
          read_at: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          child_profile_id?: string | null
          created_at?: string
          deep_link?: string | null
          expires_at?: string | null
          household_id?: string | null
          id?: string
          image_asset_key?: string | null
          metadata?: Json
          notification_type: string
          priority?: string
          read_at?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          child_profile_id?: string | null
          created_at?: string
          deep_link?: string | null
          expires_at?: string | null
          household_id?: string | null
          id?: string
          image_asset_key?: string | null
          metadata?: Json
          notification_type?: string
          priority?: string
          read_at?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "user_notifications_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_ledger: {
        Row: {
          child_profile_id: string
          created_at: string
          description: string | null
          event_type: string
          id: string
          points: number
          source_id: string | null
          source_type: string | null
        }
        Insert: {
          child_profile_id: string
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          points: number
          source_id?: string | null
          source_type?: string | null
        }
        Update: {
          child_profile_id?: string
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          points?: number
          source_id?: string | null
          source_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xp_ledger_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "xp_ledger_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      child_active_streak_badges: {
        Row: {
          badge_family_key: string | null
          badge_id: string | null
          badge_name: string | null
          badge_tier: string | null
          best_weeks: number | null
          challenge_series_id: string | null
          child_profile_id: string | null
          consecutive_weeks_required: number | null
          current_cycle: number | null
          current_weeks: number | null
          is_active: boolean | null
          last_completed_period: string | null
          series_badge_rule_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "child_series_streaks_challenge_series_id_fkey"
            columns: ["challenge_series_id"]
            isOneToOne: false
            referencedRelation: "challenge_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_series_streaks_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "child_series_streaks_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "series_badge_rules_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      child_level_progress: {
        Row: {
          child_profile_id: string | null
          current_level_minimum_xp: number | null
          current_level_name: string | null
          current_level_number: number | null
          level_progress_percent: number | null
          next_level_minimum_xp: number | null
          next_level_name: string | null
          next_level_number: number | null
          total_xp: number | null
          xp_to_next_level: number | null
        }
        Relationships: []
      }
      child_series_streak_status: {
        Row: {
          active_weeks: number | null
          best_weeks: number | null
          challenge_series_id: string | null
          child_profile_id: string | null
          current_cycle: number | null
          is_active: boolean | null
          last_completed_period: string | null
          series_key: string | null
          series_name: string | null
          streak_started_period: string | null
        }
        Relationships: [
          {
            foreignKeyName: "child_series_streaks_challenge_series_id_fkey"
            columns: ["challenge_series_id"]
            isOneToOne: false
            referencedRelation: "challenge_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_series_streaks_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "child_series_streaks_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      child_token_totals: {
        Row: {
          child_profile_id: string | null
          token_type: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "achievement_token_ledger_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "achievement_token_ledger_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      child_xp_totals: {
        Row: {
          child_profile_id: string | null
          total_xp: number | null
        }
        Relationships: [
          {
            foreignKeyName: "xp_ledger_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "xp_ledger_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_add_devotional_day: {
        Args: {
          p_action_step?: string
          p_body: string
          p_day_number: number
          p_prayer_prompt?: string
          p_scripture_id?: string
          p_series_id: string
          p_title: string
          p_xp_reward?: number
        }
        Returns: string
      }
      admin_create_badge_with_rule: {
        Args: {
          p_badge_key: string
          p_challenge_type?: string
          p_description?: string
          p_name: string
          p_rarity?: string
          p_rule_type?: string
          p_streak_key?: string
          p_threshold_value?: number
        }
        Returns: string
      }
      admin_create_book: {
        Args: {
          p_book_number: number
          p_completion_xp?: number
          p_cover_asset_key?: string
          p_description?: string
          p_release_date?: string
          p_slug: string
          p_status?: string
          p_title: string
        }
        Returns: string
      }
      admin_create_challenge: {
        Args: {
          p_access_level?: string
          p_challenge_type: string
          p_description?: string
          p_instructions?: string
          p_parent_approval_required?: boolean
          p_slug: string
          p_status?: string
          p_steps?: Json
          p_title: string
          p_xp_reward?: number
        }
        Returns: string
      }
      admin_create_challenge_series: {
        Args: {
          p_description?: string
          p_name: string
          p_series_key: string
          p_token_amount?: number
          p_token_type?: string
        }
        Returns: string
      }
      admin_create_devotional_series: {
        Args: {
          p_access_level?: string
          p_description?: string
          p_is_featured?: boolean
          p_slug: string
          p_status?: string
          p_title: string
        }
        Returns: string
      }
      admin_create_identity_truth: {
        Args: {
          p_access_level?: string
          p_explanation?: string
          p_say_it?: string
          p_scripture_id?: string
          p_slug: string
          p_sort_order?: number
          p_statement: string
          p_status?: string
          p_title: string
        }
        Returns: string
      }
      admin_create_lifetime_badge_level: {
        Args: {
          p_activity_event_type?: string
          p_badge_family_key?: string
          p_badge_key: string
          p_challenge_type?: string
          p_description?: string
          p_name: string
          p_rarity?: string
          p_rule_type: string
          p_streak_key?: string
          p_threshold_value?: number
          p_tier?: string
          p_token_type?: string
        }
        Returns: string
      }
      admin_create_power_verse: {
        Args: {
          p_access_level?: string
          p_explanation?: string
          p_give_it_away?: string
          p_is_featured?: boolean
          p_live_it?: string
          p_memorize_xp?: number
          p_say_it?: string
          p_scripture_id: string
          p_slug: string
          p_status?: string
          p_title: string
        }
        Returns: string
      }
      admin_create_prayer_prompt: {
        Args: {
          p_access_level?: string
          p_category?: string
          p_prompt_text: string
          p_scripture_id?: string
          p_slug: string
          p_status?: string
          p_title: string
          p_xp_reward?: number
        }
        Returns: string
      }
      admin_create_reward: {
        Args: {
          p_access_level?: string
          p_description?: string
          p_inventory_quantity?: number
          p_name: string
          p_reward_key: string
          p_reward_type?: string
          p_xp_required?: number
        }
        Returns: string
      }
      admin_create_scripture: {
        Args: {
          p_reference: string
          p_status?: string
          p_theme_key?: string
          p_translation: string
          p_verse_text: string
        }
        Returns: string
      }
      admin_create_series_streak_badge: {
        Args: {
          p_active_only_while_current_streak?: boolean
          p_badge_key: string
          p_consecutive_weeks: number
          p_description?: string
          p_name: string
          p_rarity?: string
          p_series_id: string
          p_tier?: string
        }
        Returns: string
      }
      admin_create_weekly_challenge: {
        Args: {
          p_access_level?: string
          p_challenge_type?: string
          p_description?: string
          p_parent_approval_required?: boolean
          p_period_start: string
          p_series_id: string
          p_slug: string
          p_status?: string
          p_steps?: Json
          p_title: string
          p_xp_reward?: number
        }
        Returns: string
      }
      admin_link_book_experience: {
        Args: {
          p_book_id: string
          p_item_id: string
          p_item_type: string
          p_sort_order?: number
        }
        Returns: undefined
      }
      get_child_achievement_progress: {
        Args: { p_child_profile_id: string }
        Returns: {
          badge_description: string
          badge_family_key: string
          badge_id: string
          badge_name: string
          badge_scope: string
          badge_tier: string
          current_value: number
          earned: boolean
          progress_percent: number
          rule_id: string
          rule_type: string
          threshold_value: number
        }[]
      }
      guardian_pin_status: {
        Args: { p_household_id: string }
        Returns: {
          configured: boolean
          locked_until: string
        }[]
      }
      set_guardian_pin: {
        Args: { p_household_id: string; p_pin: string }
        Returns: undefined
      }
      verify_guardian_pin: {
        Args: { p_household_id: string; p_pin: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
