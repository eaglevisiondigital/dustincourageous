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
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
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
          {
            foreignKeyName: "achievement_token_ledger_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
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
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
          },
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
            foreignKeyName: "admin_audit_log_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "admin_audit_log_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household_membership_summary"
            referencedColumns: ["household_id"]
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
      adventure_groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          group_key: string
          group_type: string
          id: string
          maximum_age: number | null
          metadata: Json
          minimum_age: number | null
          name: string
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          group_key: string
          group_type?: string
          id?: string
          maximum_age?: number | null
          metadata?: Json
          minimum_age?: number | null
          name: string
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          group_key?: string
          group_type?: string
          id?: string
          maximum_age?: number | null
          metadata?: Json
          minimum_age?: number | null
          name?: string
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "adventure_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      app_installations: {
        Row: {
          app_channel: string
          app_version: string | null
          capabilities: Json
          created_at: string
          device_name: string | null
          id: string
          installation_key: string
          is_active: boolean
          last_seen_at: string
          metadata: Json
          platform: string | null
          push_device_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_channel: string
          app_version?: string | null
          capabilities?: Json
          created_at?: string
          device_name?: string | null
          id?: string
          installation_key: string
          is_active?: boolean
          last_seen_at?: string
          metadata?: Json
          platform?: string | null
          push_device_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_channel?: string
          app_version?: string | null
          capabilities?: Json
          created_at?: string
          device_name?: string | null
          id?: string
          installation_key?: string
          is_active?: boolean
          last_seen_at?: string
          metadata?: Json
          platform?: string | null
          push_device_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_installations_push_device_id_fkey"
            columns: ["push_device_id"]
            isOneToOne: false
            referencedRelation: "push_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      automated_notification_log: {
        Row: {
          created_at: string
          household_id: string | null
          id: string
          notification_id: string | null
          rule_id: string
          source_id: string
          source_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id?: string | null
          id?: string
          notification_id?: string | null
          rule_id: string
          source_id: string
          source_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string | null
          id?: string
          notification_id?: string | null
          rule_id?: string
          source_id?: string
          source_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automated_notification_log_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household_membership_summary"
            referencedColumns: ["household_id"]
          },
          {
            foreignKeyName: "automated_notification_log_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automated_notification_log_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "user_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automated_notification_log_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "notification_reminder_rules"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
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
          {
            foreignKeyName: "badge_awards_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
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
          is_required: boolean
          sort_order: number
        }
        Insert: {
          book_id: string
          challenge_id: string
          created_at?: string
          is_required?: boolean
          sort_order?: number
        }
        Update: {
          book_id?: string
          challenge_id?: string
          created_at?: string
          is_required?: boolean
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
          is_required: boolean
          relationship_type: string
          sort_order: number
        }
        Insert: {
          book_id: string
          content_item_id: string
          created_at?: string
          is_required?: boolean
          relationship_type?: string
          sort_order?: number
        }
        Update: {
          book_id?: string
          content_item_id?: string
          created_at?: string
          is_required?: boolean
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
          is_required: boolean
          sort_order: number
        }
        Insert: {
          book_id: string
          created_at?: string
          devotional_series_id: string
          is_required?: boolean
          sort_order?: number
        }
        Update: {
          book_id?: string
          created_at?: string
          devotional_series_id?: string
          is_required?: boolean
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
          is_required: boolean
          sort_order: number
        }
        Insert: {
          book_id: string
          created_at?: string
          identity_truth_id: string
          is_required?: boolean
          sort_order?: number
        }
        Update: {
          book_id?: string
          created_at?: string
          identity_truth_id?: string
          is_required?: boolean
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
          is_required: boolean
          power_verse_id: string
          sort_order: number
        }
        Insert: {
          book_id: string
          created_at?: string
          is_required?: boolean
          power_verse_id: string
          sort_order?: number
        }
        Update: {
          book_id?: string
          created_at?: string
          is_required?: boolean
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
          is_required: boolean
          prayer_prompt_id: string
          sort_order: number
        }
        Insert: {
          book_id: string
          created_at?: string
          is_required?: boolean
          prayer_prompt_id: string
          sort_order?: number
        }
        Update: {
          book_id?: string
          created_at?: string
          is_required?: boolean
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
      book_reward_rules: {
        Row: {
          book_id: string
          created_at: string
          id: string
          is_active: boolean
          metadata: Json
          milestone: string
          reward_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          milestone: string
          reward_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          milestone?: string
          reward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_reward_rules_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_reward_rules_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          adventure_completion_xp: number
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
          adventure_completion_xp?: number
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
          adventure_completion_xp?: number
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
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
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
            foreignKeyName: "challenge_assignments_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "challenge_assignments_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household_membership_summary"
            referencedColumns: ["household_id"]
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
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
          },
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
            foreignKeyName: "child_activity_events_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "child_activity_events_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household_membership_summary"
            referencedColumns: ["household_id"]
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
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
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
          {
            foreignKeyName: "child_adventure_progress_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
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
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
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
          {
            foreignKeyName: "child_book_progress_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
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
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
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
          {
            foreignKeyName: "child_challenge_progress_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
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
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
          },
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
            foreignKeyName: "child_content_progress_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
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
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
          },
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
            foreignKeyName: "child_devotional_progress_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
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
      child_group_memberships: {
        Row: {
          child_profile_id: string
          ended_at: string | null
          group_id: string
          guardian_approved_at: string
          guardian_approved_by: string
          id: string
          joined_at: string
          metadata: Json
          status: string
        }
        Insert: {
          child_profile_id: string
          ended_at?: string | null
          group_id: string
          guardian_approved_at?: string
          guardian_approved_by: string
          id?: string
          joined_at?: string
          metadata?: Json
          status?: string
        }
        Update: {
          child_profile_id?: string
          ended_at?: string | null
          group_id?: string
          guardian_approved_at?: string
          guardian_approved_by?: string
          id?: string
          joined_at?: string
          metadata?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_group_memberships_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "child_group_memberships_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "child_group_memberships_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "child_group_memberships_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "child_group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "adventure_groups"
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
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
          },
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
            foreignKeyName: "child_identity_progress_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
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
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
          },
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
            foreignKeyName: "child_prayer_progress_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
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
            referencedRelation: "household_membership_summary"
            referencedColumns: ["household_id"]
          },
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
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
          },
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
            foreignKeyName: "child_scripture_progress_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
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
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
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
            foreignKeyName: "child_series_streaks_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
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
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
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
            foreignKeyName: "child_series_weekly_completions_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
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
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
          },
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
          {
            foreignKeyName: "child_streaks_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
          },
        ]
      }
      consent_policies: {
        Row: {
          applies_to_child: boolean
          consent_key: string
          created_at: string
          current_policy_version: string
          description: string
          is_active: boolean
          metadata: Json
          required_for_core_service: boolean
          title: string
          updated_at: string
        }
        Insert: {
          applies_to_child?: boolean
          consent_key: string
          created_at?: string
          current_policy_version: string
          description: string
          is_active?: boolean
          metadata?: Json
          required_for_core_service?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          applies_to_child?: boolean
          consent_key?: string
          created_at?: string
          current_policy_version?: string
          description?: string
          is_active?: boolean
          metadata?: Json
          required_for_core_service?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
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
          category: string
          completion_xp: number
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
          category?: string
          completion_xp?: number
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
          category?: string
          completion_xp?: number
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
      data_privacy_requests: {
        Row: {
          admin_notes: string | null
          child_profile_id: string | null
          completed_at: string | null
          created_at: string
          export_expires_at: string | null
          export_reference: string | null
          household_id: string
          id: string
          identity_confirmed_at: string | null
          metadata: Json
          reason: string | null
          request_type: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          child_profile_id?: string | null
          completed_at?: string | null
          created_at?: string
          export_expires_at?: string | null
          export_reference?: string | null
          household_id: string
          id?: string
          identity_confirmed_at?: string | null
          metadata?: Json
          reason?: string | null
          request_type: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          child_profile_id?: string | null
          completed_at?: string | null
          created_at?: string
          export_expires_at?: string | null
          export_reference?: string | null
          household_id?: string
          id?: string
          identity_confirmed_at?: string | null
          metadata?: Json
          reason?: string | null
          request_type?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_privacy_requests_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "data_privacy_requests_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "data_privacy_requests_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_privacy_requests_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "data_privacy_requests_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household_membership_summary"
            referencedColumns: ["household_id"]
          },
          {
            foreignKeyName: "data_privacy_requests_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      dc_blueprint_requirements: {
        Row: {
          blueprint_id: string
          created_at: string
          id: string
          metadata: Json
          requirement_key: string
          requirement_text: string
          severity: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          blueprint_id: string
          created_at?: string
          id?: string
          metadata?: Json
          requirement_key: string
          requirement_text: string
          severity?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          blueprint_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          requirement_key?: string
          requirement_text?: string
          severity?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dc_blueprint_requirements_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "dc_content_blueprints"
            referencedColumns: ["id"]
          },
        ]
      }
      dc_brand_assets: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          approved_version: string | null
          asset_key: string
          asset_type: string
          created_at: string
          id: string
          media_asset_id: string | null
          metadata: Json
          source_url: string | null
          title: string
          updated_at: string
          usage_notes: string | null
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          approved_version?: string | null
          asset_key: string
          asset_type: string
          created_at?: string
          id?: string
          media_asset_id?: string | null
          metadata?: Json
          source_url?: string | null
          title: string
          updated_at?: string
          usage_notes?: string | null
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          approved_version?: string | null
          asset_key?: string
          asset_type?: string
          created_at?: string
          id?: string
          media_asset_id?: string | null
          metadata?: Json
          source_url?: string | null
          title?: string
          updated_at?: string
          usage_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dc_brand_assets_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      dc_character_profiles: {
        Row: {
          approved_asset_key: string | null
          character_key: string
          created_at: string
          display_name: string
          id: string
          locked_traits: Json
          metadata: Json
          prohibited_traits: Json
          role: string | null
          status: string
          updated_at: string
          visual_age: number | null
        }
        Insert: {
          approved_asset_key?: string | null
          character_key: string
          created_at?: string
          display_name: string
          id?: string
          locked_traits?: Json
          metadata?: Json
          prohibited_traits?: Json
          role?: string | null
          status?: string
          updated_at?: string
          visual_age?: number | null
        }
        Update: {
          approved_asset_key?: string | null
          character_key?: string
          created_at?: string
          display_name?: string
          id?: string
          locked_traits?: Json
          metadata?: Json
          prohibited_traits?: Json
          role?: string | null
          status?: string
          updated_at?: string
          visual_age?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dc_character_profiles_approved_asset_key_fkey"
            columns: ["approved_asset_key"]
            isOneToOne: false
            referencedRelation: "dc_brand_assets"
            referencedColumns: ["asset_key"]
          },
        ]
      }
      dc_content_blueprints: {
        Row: {
          applies_to: string
          blueprint_key: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          is_locked: boolean
          metadata: Json
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          applies_to: string
          blueprint_key: string
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          is_locked?: boolean
          metadata?: Json
          title: string
          updated_at?: string
          version?: string
        }
        Update: {
          applies_to?: string
          blueprint_key?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          is_locked?: boolean
          metadata?: Json
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      dc_content_reviews: {
        Row: {
          approved_assets_only: boolean | null
          character_continuity: boolean | null
          child_age_appropriate: boolean | null
          church_affirming: boolean | null
          content_fingerprint: string | null
          created_at: string
          creative_alignment: boolean | null
          entity_id: string
          entity_type: string
          id: string
          identity_in_christ_alignment: boolean | null
          language_style_pass: boolean | null
          metadata: Json
          notes: string | null
          requested_at: string
          requested_by: string
          reviewed_at: string | null
          reviewer_user_id: string | null
          scripture_verified: boolean | null
          standard_versions: Json
          status: string
          updated_at: string
          word_of_faith_alignment: boolean | null
        }
        Insert: {
          approved_assets_only?: boolean | null
          character_continuity?: boolean | null
          child_age_appropriate?: boolean | null
          church_affirming?: boolean | null
          content_fingerprint?: string | null
          created_at?: string
          creative_alignment?: boolean | null
          entity_id: string
          entity_type: string
          id?: string
          identity_in_christ_alignment?: boolean | null
          language_style_pass?: boolean | null
          metadata?: Json
          notes?: string | null
          requested_at?: string
          requested_by: string
          reviewed_at?: string | null
          reviewer_user_id?: string | null
          scripture_verified?: boolean | null
          standard_versions?: Json
          status?: string
          updated_at?: string
          word_of_faith_alignment?: boolean | null
        }
        Update: {
          approved_assets_only?: boolean | null
          character_continuity?: boolean | null
          child_age_appropriate?: boolean | null
          church_affirming?: boolean | null
          content_fingerprint?: string | null
          created_at?: string
          creative_alignment?: boolean | null
          entity_id?: string
          entity_type?: string
          id?: string
          identity_in_christ_alignment?: boolean | null
          language_style_pass?: boolean | null
          metadata?: Json
          notes?: string | null
          requested_at?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewer_user_id?: string | null
          scripture_verified?: boolean | null
          standard_versions?: Json
          status?: string
          updated_at?: string
          word_of_faith_alignment?: boolean | null
        }
        Relationships: []
      }
      dc_governance_rules: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          metadata: Json
          rule_key: string
          rule_text: string
          severity: string
          sort_order: number
          standard_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          rule_key: string
          rule_text: string
          severity?: string
          sort_order?: number
          standard_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          rule_key?: string
          rule_text?: string
          severity?: string
          sort_order?: number
          standard_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dc_governance_rules_standard_id_fkey"
            columns: ["standard_id"]
            isOneToOne: false
            referencedRelation: "dc_governance_standards"
            referencedColumns: ["id"]
          },
        ]
      }
      dc_governance_standards: {
        Row: {
          authority_scope: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          is_locked: boolean
          metadata: Json
          standard_key: string
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          authority_scope: string
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          is_locked?: boolean
          metadata?: Json
          standard_key: string
          title: string
          updated_at?: string
          version: string
        }
        Update: {
          authority_scope?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          is_locked?: boolean
          metadata?: Json
          standard_key?: string
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      delivery_worker_runs: {
        Row: {
          claimed_count: number
          completed_at: string | null
          error_message: string | null
          failed_count: number
          id: string
          metadata: Json
          sent_count: number
          started_at: string
          status: string
          suppressed_count: number
          worker_key: string
        }
        Insert: {
          claimed_count?: number
          completed_at?: string | null
          error_message?: string | null
          failed_count?: number
          id?: string
          metadata?: Json
          sent_count?: number
          started_at?: string
          status?: string
          suppressed_count?: number
          worker_key: string
        }
        Update: {
          claimed_count?: number
          completed_at?: string | null
          error_message?: string | null
          failed_count?: number
          id?: string
          metadata?: Json
          sent_count?: number
          started_at?: string
          status?: string
          suppressed_count?: number
          worker_key?: string
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
      event_registrations: {
        Row: {
          attended_at: string | null
          canceled_at: string | null
          child_profile_id: string | null
          created_at: string
          event_id: string
          household_id: string
          id: string
          metadata: Json
          registered_at: string
          registered_by: string
          status: string
        }
        Insert: {
          attended_at?: string | null
          canceled_at?: string | null
          child_profile_id?: string | null
          created_at?: string
          event_id: string
          household_id: string
          id?: string
          metadata?: Json
          registered_at?: string
          registered_by: string
          status?: string
        }
        Update: {
          attended_at?: string | null
          canceled_at?: string | null
          child_profile_id?: string | null
          created_at?: string
          event_id?: string
          household_id?: string
          id?: string
          metadata?: Json
          registered_at?: string
          registered_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "event_registrations_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "event_registrations_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household_membership_summary"
            referencedColumns: ["household_id"]
          },
          {
            foreignKeyName: "event_registrations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          access_level: string
          capacity: number | null
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          event_key: string
          event_type: string
          group_id: string | null
          id: string
          location_address: string | null
          location_name: string | null
          metadata: Json
          organization_id: string | null
          starts_at: string
          status: string
          timezone: string
          title: string
          updated_at: string
          virtual_url: string | null
        }
        Insert: {
          access_level?: string
          capacity?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          event_key: string
          event_type?: string
          group_id?: string | null
          id?: string
          location_address?: string | null
          location_name?: string | null
          metadata?: Json
          organization_id?: string | null
          starts_at: string
          status?: string
          timezone?: string
          title: string
          updated_at?: string
          virtual_url?: string | null
        }
        Update: {
          access_level?: string
          capacity?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          event_key?: string
          event_type?: string
          group_id?: string | null
          id?: string
          location_address?: string | null
          location_name?: string | null
          metadata?: Json
          organization_id?: string | null
          starts_at?: string
          status?: string
          timezone?: string
          title?: string
          updated_at?: string
          virtual_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "adventure_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      family_faith_guides: {
        Row: {
          access_level: string
          available_from: string | null
          available_until: string | null
          book_id: string | null
          created_at: string
          description: string | null
          discussion_prompt: string | null
          family_action: string | null
          guide_key: string
          id: string
          metadata: Json
          prayer_prompt: string | null
          scripture_passage_id: string | null
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          access_level?: string
          available_from?: string | null
          available_until?: string | null
          book_id?: string | null
          created_at?: string
          description?: string | null
          discussion_prompt?: string | null
          family_action?: string | null
          guide_key: string
          id?: string
          metadata?: Json
          prayer_prompt?: string | null
          scripture_passage_id?: string | null
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          access_level?: string
          available_from?: string | null
          available_until?: string | null
          book_id?: string | null
          created_at?: string
          description?: string | null
          discussion_prompt?: string | null
          family_action?: string | null
          guide_key?: string
          id?: string
          metadata?: Json
          prayer_prompt?: string | null
          scripture_passage_id?: string | null
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_faith_guides_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_faith_guides_scripture_passage_id_fkey"
            columns: ["scripture_passage_id"]
            isOneToOne: false
            referencedRelation: "scripture_passages"
            referencedColumns: ["id"]
          },
        ]
      }
      fulfillments: {
        Row: {
          created_at: string
          delivered_at: string | null
          id: string
          metadata: Json
          order_id: string
          provider: string | null
          shipped_at: string | null
          status: string
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          id?: string
          metadata?: Json
          order_id: string
          provider?: string | null
          shipped_at?: string | null
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          id?: string
          metadata?: Json
          order_id?: string
          provider?: string | null
          shipped_at?: string | null
          status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fulfillments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      group_challenge_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          challenge_id: string
          due_at: string | null
          group_id: string
          id: string
          metadata: Json
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          challenge_id: string
          due_at?: string | null
          group_id: string
          id?: string
          metadata?: Json
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          challenge_id?: string
          due_at?: string | null
          group_id?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "group_challenge_assignments_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_challenge_assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "adventure_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_leaders: {
        Row: {
          created_at: string
          group_id: string
          id: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_leaders_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "adventure_groups"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "household_membership_summary"
            referencedColumns: ["household_id"]
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
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
          },
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
            foreignKeyName: "household_consents_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "household_consents_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household_membership_summary"
            referencedColumns: ["household_id"]
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
            referencedRelation: "household_membership_summary"
            referencedColumns: ["household_id"]
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
      household_faith_sessions: {
        Row: {
          child_profile_id: string | null
          completed_at: string
          completed_by: string
          created_at: string
          family_faith_guide_id: string
          household_id: string
          id: string
          metadata: Json
        }
        Insert: {
          child_profile_id?: string | null
          completed_at?: string
          completed_by: string
          created_at?: string
          family_faith_guide_id: string
          household_id: string
          id?: string
          metadata?: Json
        }
        Update: {
          child_profile_id?: string | null
          completed_at?: string
          completed_by?: string
          created_at?: string
          family_faith_guide_id?: string
          household_id?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "household_faith_sessions_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "household_faith_sessions_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_level_progress"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "household_faith_sessions_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_faith_sessions_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "household_faith_sessions_family_faith_guide_id_fkey"
            columns: ["family_faith_guide_id"]
            isOneToOne: false
            referencedRelation: "family_faith_guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_faith_sessions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household_membership_summary"
            referencedColumns: ["household_id"]
          },
          {
            foreignKeyName: "household_faith_sessions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          household_id: string
          id: string
          invited_by: string
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          household_id: string
          id?: string
          invited_by: string
          role: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          household_id?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invitations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household_membership_summary"
            referencedColumns: ["household_id"]
          },
          {
            foreignKeyName: "household_invitations_household_id_fkey"
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
            referencedRelation: "household_membership_summary"
            referencedColumns: ["household_id"]
          },
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
            referencedRelation: "household_membership_summary"
            referencedColumns: ["household_id"]
          },
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
      integration_events: {
        Row: {
          attempt_count: number
          created_at: string
          direction: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          idempotency_key: string | null
          last_error: string | null
          next_attempt_at: string
          processed_at: string | null
          provider_id: string | null
          request_payload: Json
          response_payload: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          direction: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          next_attempt_at?: string
          processed_at?: string | null
          provider_id?: string | null
          request_payload?: Json
          response_payload?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          direction?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          next_attempt_at?: string
          processed_at?: string | null
          provider_id?: string | null
          request_payload?: Json
          response_payload?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_events_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "integration_health_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_events_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "integration_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_providers: {
        Row: {
          configuration_mode: string
          created_at: string
          display_name: string
          health_status: string
          id: string
          last_error: string | null
          last_error_at: string | null
          last_health_check_at: string | null
          last_success_at: string | null
          metadata: Json
          provider_key: string
          provider_type: string
          status: string
          updated_at: string
        }
        Insert: {
          configuration_mode?: string
          created_at?: string
          display_name: string
          health_status?: string
          id?: string
          last_error?: string | null
          last_error_at?: string | null
          last_health_check_at?: string | null
          last_success_at?: string | null
          metadata?: Json
          provider_key: string
          provider_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          configuration_mode?: string
          created_at?: string
          display_name?: string
          health_status?: string
          id?: string
          last_error?: string | null
          last_error_at?: string | null
          last_health_check_at?: string | null
          last_success_at?: string | null
          metadata?: Json
          provider_key?: string
          provider_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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
      notification_campaign_recipients: {
        Row: {
          campaign_id: string
          created_at: string
          household_id: string | null
          id: string
          notification_id: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          household_id?: string | null
          id?: string
          notification_id?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          household_id?: string | null
          id?: string
          notification_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "notification_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_campaign_recipients_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household_membership_summary"
            referencedColumns: ["household_id"]
          },
          {
            foreignKeyName: "notification_campaign_recipients_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_campaign_recipients_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "user_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_campaigns: {
        Row: {
          audience_type: string
          campaign_key: string
          created_at: string
          created_by: string
          delivery_channels: string[]
          error_message: string | null
          event_id: string | null
          group_id: string | null
          household_id: string | null
          id: string
          membership_plan_id: string | null
          metadata: Json
          name: string
          organization_id: string | null
          recipients_count: number
          scheduled_at: string
          sent_at: string | null
          status: string
          template_id: string
          updated_at: string
        }
        Insert: {
          audience_type: string
          campaign_key: string
          created_at?: string
          created_by: string
          delivery_channels?: string[]
          error_message?: string | null
          event_id?: string | null
          group_id?: string | null
          household_id?: string | null
          id?: string
          membership_plan_id?: string | null
          metadata?: Json
          name: string
          organization_id?: string | null
          recipients_count?: number
          scheduled_at: string
          sent_at?: string | null
          status?: string
          template_id: string
          updated_at?: string
        }
        Update: {
          audience_type?: string
          campaign_key?: string
          created_at?: string
          created_by?: string
          delivery_channels?: string[]
          error_message?: string | null
          event_id?: string | null
          group_id?: string | null
          household_id?: string | null
          id?: string
          membership_plan_id?: string | null
          metadata?: Json
          name?: string
          organization_id?: string | null
          recipients_count?: number
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_campaigns_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_campaigns_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "adventure_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_campaigns_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household_membership_summary"
            referencedColumns: ["household_id"]
          },
          {
            foreignKeyName: "notification_campaigns_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_campaigns_membership_plan_id_fkey"
            columns: ["membership_plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          attempt_count: number
          channel: string
          created_at: string
          id: string
          last_error: string | null
          metadata: Json
          next_attempt_at: string
          notification_id: string
          provider: string | null
          provider_message_id: string | null
          sent_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          channel: string
          created_at?: string
          id?: string
          last_error?: string | null
          metadata?: Json
          next_attempt_at?: string
          notification_id: string
          provider?: string | null
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          channel?: string
          created_at?: string
          id?: string
          last_error?: string | null
          metadata?: Json
          next_attempt_at?: string
          notification_id?: string
          provider?: string | null
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "user_notifications"
            referencedColumns: ["id"]
          },
        ]
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
      notification_reminder_rules: {
        Row: {
          created_at: string
          created_by: string
          delivery_channels: string[]
          group_id: string | null
          id: string
          lead_minutes: number
          metadata: Json
          name: string
          organization_id: string | null
          rule_key: string
          rule_type: string
          status: string
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          delivery_channels?: string[]
          group_id?: string | null
          id?: string
          lead_minutes: number
          metadata?: Json
          name: string
          organization_id?: string | null
          rule_key: string
          rule_type: string
          status?: string
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          delivery_channels?: string[]
          group_id?: string | null
          id?: string
          lead_minutes?: number
          metadata?: Json
          name?: string
          organization_id?: string | null
          rule_key?: string
          rule_type?: string
          status?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reminder_rules_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "adventure_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_reminder_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_reminder_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body: string
          created_at: string
          created_by: string
          deep_link: string | null
          default_channels: string[]
          id: string
          metadata: Json
          name: string
          notification_type: string
          priority: string
          status: string
          template_key: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          deep_link?: string | null
          default_channels?: string[]
          id?: string
          metadata?: Json
          name: string
          notification_type: string
          priority?: string
          status?: string
          template_key: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          deep_link?: string | null
          default_channels?: string[]
          id?: string
          metadata?: Json
          name?: string
          notification_type?: string
          priority?: string
          status?: string
          template_key?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          discount_cents: number
          id: string
          line_total_cents: number
          metadata: Json
          order_id: string
          product_id: string
          product_name_snapshot: string
          product_variant_id: string | null
          quantity: number
          sku_snapshot: string | null
          unit_price_cents: number
          variant_name_snapshot: string | null
        }
        Insert: {
          created_at?: string
          discount_cents?: number
          id?: string
          line_total_cents: number
          metadata?: Json
          order_id: string
          product_id: string
          product_name_snapshot: string
          product_variant_id?: string | null
          quantity: number
          sku_snapshot?: string | null
          unit_price_cents: number
          variant_name_snapshot?: string | null
        }
        Update: {
          created_at?: string
          discount_cents?: number
          id?: string
          line_total_cents?: number
          metadata?: Json
          order_id?: string
          product_id?: string
          product_name_snapshot?: string
          product_variant_id?: string | null
          quantity?: number
          sku_snapshot?: string | null
          unit_price_cents?: number
          variant_name_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_email: string | null
          canceled_at: string | null
          created_at: string
          currency: string
          discount_cents: number
          household_id: string | null
          id: string
          metadata: Json
          order_number: number
          paid_at: string | null
          payment_provider: string | null
          promo_code_id: string | null
          provider_customer_id: string | null
          provider_payment_id: string | null
          purchaser_user_id: string | null
          refunded_at: string | null
          shipping_address: Json | null
          shipping_cents: number
          shipping_name: string | null
          status: string
          subtotal_cents: number
          tax_cents: number
          total_cents: number
          updated_at: string
        }
        Insert: {
          billing_email?: string | null
          canceled_at?: string | null
          created_at?: string
          currency?: string
          discount_cents?: number
          household_id?: string | null
          id?: string
          metadata?: Json
          order_number?: never
          paid_at?: string | null
          payment_provider?: string | null
          promo_code_id?: string | null
          provider_customer_id?: string | null
          provider_payment_id?: string | null
          purchaser_user_id?: string | null
          refunded_at?: string | null
          shipping_address?: Json | null
          shipping_cents?: number
          shipping_name?: string | null
          status?: string
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Update: {
          billing_email?: string | null
          canceled_at?: string | null
          created_at?: string
          currency?: string
          discount_cents?: number
          household_id?: string | null
          id?: string
          metadata?: Json
          order_number?: never
          paid_at?: string | null
          payment_provider?: string | null
          promo_code_id?: string | null
          provider_customer_id?: string | null
          provider_payment_id?: string | null
          purchaser_user_id?: string | null
          refunded_at?: string | null
          shipping_address?: Json | null
          shipping_cents?: number
          shipping_name?: string | null
          status?: string
          subtotal_cents?: number
          tax_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household_membership_summary"
            referencedColumns: ["household_id"]
          },
          {
            foreignKeyName: "orders_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          group_id: string | null
          group_role: string | null
          id: string
          invited_by: string
          organization_id: string
          organization_role: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at: string
          group_id?: string | null
          group_role?: string | null
          id?: string
          invited_by: string
          organization_id: string
          organization_role: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          group_id?: string | null
          group_role?: string | null
          id?: string
          invited_by?: string
          organization_id?: string
          organization_role?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "adventure_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          branding: Json
          created_at: string
          created_by: string
          id: string
          logo_asset_key: string | null
          metadata: Json
          name: string
          organization_key: string
          organization_type: string
          status: string
          updated_at: string
        }
        Insert: {
          branding?: Json
          created_at?: string
          created_by: string
          id?: string
          logo_asset_key?: string | null
          metadata?: Json
          name: string
          organization_key: string
          organization_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          branding?: Json
          created_at?: string
          created_by?: string
          id?: string
          logo_asset_key?: string | null
          metadata?: Json
          name?: string
          organization_key?: string
          organization_type?: string
          status?: string
          updated_at?: string
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
      product_book_access_rules: {
        Row: {
          book_id: string
          created_at: string
          duration_days: number | null
          id: string
          is_active: boolean
          product_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          duration_days?: number | null
          id?: string
          is_active?: boolean
          product_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          duration_days?: number | null
          id?: string
          is_active?: boolean
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_book_access_rules_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_book_access_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_entitlement_rules: {
        Row: {
          created_at: string
          duration_days: number | null
          entitlement_key: string
          id: string
          is_active: boolean
          product_id: string
        }
        Insert: {
          created_at?: string
          duration_days?: number | null
          entitlement_key: string
          id?: string
          is_active?: boolean
          product_id: string
        }
        Update: {
          created_at?: string
          duration_days?: number | null
          entitlement_key?: string
          id?: string
          is_active?: boolean
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_entitlement_rules_entitlement_key_fkey"
            columns: ["entitlement_key"]
            isOneToOne: false
            referencedRelation: "entitlement_definitions"
            referencedColumns: ["entitlement_key"]
          },
          {
            foreignKeyName: "product_entitlement_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attributes: Json
          created_at: string
          id: string
          inventory_quantity: number | null
          is_active: boolean
          member_price_delta_cents: number
          name: string
          price_delta_cents: number
          product_id: string
          sku: string | null
          sort_order: number
          track_inventory: boolean
          updated_at: string
          variant_key: string
        }
        Insert: {
          attributes?: Json
          created_at?: string
          id?: string
          inventory_quantity?: number | null
          is_active?: boolean
          member_price_delta_cents?: number
          name: string
          price_delta_cents?: number
          product_id: string
          sku?: string | null
          sort_order?: number
          track_inventory?: boolean
          updated_at?: string
          variant_key: string
        }
        Update: {
          attributes?: Json
          created_at?: string
          id?: string
          inventory_quantity?: number | null
          is_active?: boolean
          member_price_delta_cents?: number
          name?: string
          price_delta_cents?: number
          product_id?: string
          sku?: string | null
          sort_order?: number
          track_inventory?: boolean
          updated_at?: string
          variant_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allow_backorder: boolean
          base_price_cents: number
          created_at: string
          currency: string
          description: string | null
          id: string
          image_asset_key: string | null
          inventory_quantity: number | null
          is_featured: boolean
          member_price_cents: number | null
          metadata: Json
          name: string
          product_key: string
          product_type: string
          sku: string | null
          status: string
          track_inventory: boolean
          updated_at: string
        }
        Insert: {
          allow_backorder?: boolean
          base_price_cents?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_asset_key?: string | null
          inventory_quantity?: number | null
          is_featured?: boolean
          member_price_cents?: number | null
          metadata?: Json
          name: string
          product_key: string
          product_type: string
          sku?: string | null
          status?: string
          track_inventory?: boolean
          updated_at?: string
        }
        Update: {
          allow_backorder?: boolean
          base_price_cents?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_asset_key?: string | null
          inventory_quantity?: number | null
          is_featured?: boolean
          member_price_cents?: number | null
          metadata?: Json
          name?: string
          product_key?: string
          product_type?: string
          sku?: string | null
          status?: string
          track_inventory?: boolean
          updated_at?: string
        }
        Relationships: []
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
      promo_codes: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          is_active: boolean
          max_redemptions: number | null
          metadata: Json
          minimum_order_cents: number
          redemption_count: number
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          metadata?: Json
          minimum_order_cents?: number
          redemption_count?: number
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          metadata?: Json
          minimum_order_cents?: number
          redemption_count?: number
          starts_at?: string | null
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
      referral_attributions: {
        Row: {
          attributed_at: string
          id: string
          metadata: Json
          referral_code_id: string
          referred_household_id: string
          source: string | null
        }
        Insert: {
          attributed_at?: string
          id?: string
          metadata?: Json
          referral_code_id: string
          referred_household_id: string
          source?: string | null
        }
        Update: {
          attributed_at?: string
          id?: string
          metadata?: Json
          referral_code_id?: string
          referred_household_id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_attributions_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_attributions_referred_household_id_fkey"
            columns: ["referred_household_id"]
            isOneToOne: true
            referencedRelation: "household_membership_summary"
            referencedColumns: ["household_id"]
          },
          {
            foreignKeyName: "referral_attributions_referred_household_id_fkey"
            columns: ["referred_household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          household_id: string
          id: string
          is_active: boolean
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          household_id: string
          id?: string
          is_active?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          household_id?: string
          id?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "household_membership_summary"
            referencedColumns: ["household_id"]
          },
          {
            foreignKeyName: "referral_codes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
          },
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
            foreignKeyName: "reward_unlocks_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
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
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
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
            foreignKeyName: "streak_badge_earnings_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
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
      support_tickets: {
        Row: {
          assigned_admin: string | null
          category: string
          created_at: string
          household_id: string | null
          id: string
          message: string
          metadata: Json
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          ticket_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_admin?: string | null
          category?: string
          created_at?: string
          household_id?: string | null
          id?: string
          message: string
          metadata?: Json
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          ticket_number?: never
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_admin?: string | null
          category?: string
          created_at?: string
          household_id?: string | null
          id?: string
          message?: string
          metadata?: Json
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          ticket_number?: never
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household_membership_summary"
            referencedColumns: ["household_id"]
          },
          {
            foreignKeyName: "support_tickets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
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
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
          },
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
            foreignKeyName: "user_notifications_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "user_notifications_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household_membership_summary"
            referencedColumns: ["household_id"]
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
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
          },
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
          {
            foreignKeyName: "xp_ledger_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
          },
        ]
      }
    }
    Views: {
      admin_daily_metrics: {
        Row: {
          books_completed: number | null
          challenges_completed: number | null
          event_registrations: number | null
          family_faith_sessions: number | null
          gross_revenue_cents: number | null
          metric_date: string | null
          new_child_profiles: number | null
          new_households: number | null
          paid_orders: number | null
          referrals_attributed: number | null
          verses_memorized: number | null
        }
        Relationships: []
      }
      admin_platform_snapshot: {
        Row: {
          active_child_profiles: number | null
          active_groups: number | null
          active_households: number | null
          active_organizations: number | null
          active_subscriptions: number | null
          books_completed_all_time: number | null
          challenges_completed_all_time: number | null
          open_privacy_requests: number | null
          open_support_tickets: number | null
          rewards_unlocked_all_time: number | null
          verses_memorized_all_time: number | null
        }
        Relationships: []
      }
      app_channel_health: {
        Row: {
          active_installations: number | null
          app_channel: string | null
          last_seen_at: string | null
          platform: string | null
          push_ready_installations: number | null
        }
        Relationships: []
      }
      app_installation_summary: {
        Row: {
          active_installations: number | null
          app_channel: string | null
          last_seen_at: string | null
          platform: string | null
          push_enabled_installations: number | null
          user_id: string | null
        }
        Relationships: []
      }
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
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
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
            foreignKeyName: "child_series_streaks_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
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
      child_data_inventory: {
        Row: {
          activity_records: number | null
          adventure_progress_records: number | null
          badge_records: number | null
          book_progress_records: number | null
          challenge_progress_records: number | null
          child_profile_id: string | null
          content_progress_records: number | null
          devotional_progress_records: number | null
          display_name: string | null
          event_registration_records: number | null
          group_membership_records: number | null
          household_id: string | null
          identity_progress_records: number | null
          prayer_progress_records: number | null
          reward_records: number | null
          scripture_progress_records: number | null
          status: string | null
          xp_records: number | null
        }
        Insert: {
          activity_records?: never
          adventure_progress_records?: never
          badge_records?: never
          book_progress_records?: never
          challenge_progress_records?: never
          child_profile_id?: string | null
          content_progress_records?: never
          devotional_progress_records?: never
          display_name?: string | null
          event_registration_records?: never
          group_membership_records?: never
          household_id?: string | null
          identity_progress_records?: never
          prayer_progress_records?: never
          reward_records?: never
          scripture_progress_records?: never
          status?: string | null
          xp_records?: never
        }
        Update: {
          activity_records?: never
          adventure_progress_records?: never
          badge_records?: never
          book_progress_records?: never
          challenge_progress_records?: never
          child_profile_id?: string | null
          content_progress_records?: never
          devotional_progress_records?: never
          display_name?: string | null
          event_registration_records?: never
          group_membership_records?: never
          household_id?: string | null
          identity_progress_records?: never
          prayer_progress_records?: never
          reward_records?: never
          scripture_progress_records?: never
          status?: string | null
          xp_records?: never
        }
        Relationships: [
          {
            foreignKeyName: "child_profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household_membership_summary"
            referencedColumns: ["household_id"]
          },
          {
            foreignKeyName: "child_profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
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
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
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
            foreignKeyName: "child_series_streaks_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
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
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
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
          {
            foreignKeyName: "achievement_token_ledger_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
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
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
          },
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
          {
            foreignKeyName: "xp_ledger_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
          },
        ]
      }
      current_household_consents: {
        Row: {
          action: string | null
          applies_to_child: boolean | null
          child_profile_id: string | null
          consent_key: string | null
          created_at: string | null
          current_policy_version: string | null
          description: string | null
          guardian_user_id: string | null
          household_id: string | null
          id: string | null
          policy_version: string | null
          required_for_core_service: boolean | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_consents_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "child_data_inventory"
            referencedColumns: ["child_profile_id"]
          },
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
            foreignKeyName: "household_consents_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_child_progress_summary"
            referencedColumns: ["child_profile_id"]
          },
          {
            foreignKeyName: "household_consents_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household_membership_summary"
            referencedColumns: ["household_id"]
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
      dc_governance_entity_catalog: {
        Row: {
          entity_type: string | null
          id: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      dc_governance_review_status: {
        Row: {
          approval_current: boolean | null
          entity_id: string | null
          entity_status: string | null
          entity_type: string | null
          entity_updated_at: string | null
          review_id: string | null
          review_status: string | null
          reviewed_at: string | null
          title: string | null
        }
        Relationships: []
      }
      delivery_worker_health: {
        Row: {
          last_claimed_count: number | null
          last_completed_at: string | null
          last_failed_count: number | null
          last_sent_count: number | null
          last_started_at: string | null
          last_status: string | null
          last_suppressed_count: number | null
          worker_key: string | null
        }
        Relationships: []
      }
      household_membership_summary: {
        Row: {
          cancel_at_period_end: boolean | null
          current_period_end: string | null
          current_period_start: string | null
          granted_entitlements: string[] | null
          household_id: string | null
          plan_description: string | null
          plan_entitlements: string[] | null
          plan_key: string | null
          plan_name: string | null
          subscription_id: string | null
          subscription_status: string | null
        }
        Relationships: []
      }
      integration_health_summary: {
        Row: {
          display_name: string | null
          failed_events_24h: number | null
          health_status: string | null
          id: string | null
          last_error: string | null
          last_error_at: string | null
          last_health_check_at: string | null
          last_success_at: string | null
          provider_key: string | null
          provider_type: string | null
          status: string | null
          successful_events_24h: number | null
        }
        Insert: {
          display_name?: string | null
          failed_events_24h?: never
          health_status?: string | null
          id?: string | null
          last_error?: string | null
          last_error_at?: string | null
          last_health_check_at?: string | null
          last_success_at?: string | null
          provider_key?: string | null
          provider_type?: string | null
          status?: string | null
          successful_events_24h?: never
        }
        Update: {
          display_name?: string | null
          failed_events_24h?: never
          health_status?: string | null
          id?: string | null
          last_error?: string | null
          last_error_at?: string | null
          last_health_check_at?: string | null
          last_success_at?: string | null
          provider_key?: string | null
          provider_type?: string | null
          status?: string | null
          successful_events_24h?: never
        }
        Relationships: []
      }
      notification_delivery_health: {
        Row: {
          channel: string | null
          delivery_count: number | null
          delivery_count_24h: number | null
          last_sent_at: string | null
          last_updated_at: string | null
          status: string | null
        }
        Relationships: []
      }
      parent_child_progress_summary: {
        Row: {
          books_completed: number | null
          child_profile_id: string | null
          completed_challenges: number | null
          devotional_days_completed: number | null
          display_name: string | null
          household_id: string | null
          lifetime_badges: number | null
          total_xp: number | null
          unlocked_rewards: number | null
          verses_memorized: number | null
          weekly_stars: number | null
        }
        Relationships: [
          {
            foreignKeyName: "child_profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household_membership_summary"
            referencedColumns: ["household_id"]
          },
          {
            foreignKeyName: "child_profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_household_invitation: {
        Args: { p_invitation_id: string; p_token: string }
        Returns: string
      }
      accept_organization_invitation: {
        Args: { p_invitation_id: string; p_token: string }
        Returns: string
      }
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
      admin_cancel_notification_campaign: {
        Args: { p_campaign_id: string }
        Returns: undefined
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
      admin_create_content_item: {
        Args: {
          p_access_level?: string
          p_asset_key?: string
          p_body?: Json
          p_category?: string
          p_completion_xp?: number
          p_content_type: string
          p_is_featured?: boolean
          p_slug: string
          p_status?: string
          p_summary?: string
          p_thumbnail_asset_key?: string
          p_title: string
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
      admin_create_family_faith_guide: {
        Args: {
          p_access_level?: string
          p_book_id?: string
          p_description?: string
          p_discussion_prompt?: string
          p_family_action?: string
          p_guide_key: string
          p_prayer_prompt?: string
          p_scripture_passage_id?: string
          p_sort_order?: number
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
      admin_create_notification_reminder_rule: {
        Args: {
          p_delivery_channels?: string[]
          p_group_id?: string
          p_lead_minutes: number
          p_name: string
          p_organization_id?: string
          p_rule_key: string
          p_rule_type: string
          p_template_id: string
        }
        Returns: string
      }
      admin_create_notification_template: {
        Args: {
          p_body: string
          p_deep_link?: string
          p_default_channels?: string[]
          p_name: string
          p_notification_type: string
          p_priority?: string
          p_template_key: string
          p_title: string
        }
        Returns: string
      }
      admin_create_organization: {
        Args: {
          p_name: string
          p_organization_key: string
          p_organization_type: string
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
      admin_create_product: {
        Args: {
          p_allow_backorder?: boolean
          p_base_price_cents?: number
          p_description?: string
          p_inventory_quantity?: number
          p_is_featured?: boolean
          p_member_price_cents?: number
          p_name: string
          p_product_key: string
          p_product_type: string
          p_sku?: string
          p_status?: string
          p_track_inventory?: boolean
        }
        Returns: string
      }
      admin_create_product_variant: {
        Args: {
          p_attributes?: Json
          p_inventory_quantity?: number
          p_member_price_delta_cents?: number
          p_name: string
          p_price_delta_cents?: number
          p_product_id: string
          p_sku?: string
          p_sort_order?: number
          p_variant_key: string
        }
        Returns: string
      }
      admin_create_promo_code: {
        Args: {
          p_code: string
          p_description: string
          p_discount_type: string
          p_discount_value: number
          p_ends_at?: string
          p_max_redemptions?: number
          p_minimum_order_cents?: number
          p_starts_at?: string
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
      admin_get_daily_metrics: {
        Args: { p_days?: number }
        Returns: {
          books_completed: number
          challenges_completed: number
          event_registrations: number
          family_faith_sessions: number
          gross_revenue_cents: number
          metric_date: string
          new_child_profiles: number
          new_households: number
          paid_orders: number
          referrals_attributed: number
          verses_memorized: number
        }[]
      }
      admin_get_platform_snapshot: {
        Args: never
        Returns: {
          active_child_profiles: number
          active_groups: number
          active_households: number
          active_organizations: number
          active_subscriptions: number
          books_completed_all_time: number
          challenges_completed_all_time: number
          open_privacy_requests: number
          open_support_tickets: number
          queued_external_notifications: number
          rewards_unlocked_all_time: number
          verses_memorized_all_time: number
        }[]
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
      admin_link_book_reward: {
        Args: { p_book_id: string; p_milestone?: string; p_reward_id: string }
        Returns: string
      }
      admin_preview_notification_audience: {
        Args: {
          p_audience_type: string
          p_event_id?: string
          p_group_id?: string
          p_household_id?: string
          p_membership_plan_id?: string
          p_organization_id?: string
        }
        Returns: number
      }
      admin_schedule_notification_campaign: {
        Args: {
          p_audience_type: string
          p_campaign_key: string
          p_delivery_channels?: string[]
          p_event_id?: string
          p_group_id?: string
          p_household_id?: string
          p_membership_plan_id?: string
          p_name: string
          p_organization_id?: string
          p_scheduled_at: string
          p_template_id: string
        }
        Returns: string
      }
      admin_set_order_status: {
        Args: { p_order_id: string; p_status: string }
        Returns: undefined
      }
      approve_dc_content_review: {
        Args: {
          p_approved_assets_only: boolean
          p_character_continuity: boolean
          p_child_age_appropriate: boolean
          p_church_affirming: boolean
          p_creative_alignment: boolean
          p_identity_in_christ_alignment: boolean
          p_language_style_pass: boolean
          p_notes?: string
          p_review_id: string
          p_scripture_verified: boolean
          p_word_of_faith_alignment: boolean
        }
        Returns: undefined
      }
      approve_parent_challenge: {
        Args: { p_guardian_session_token: string; p_progress_id: string }
        Returns: undefined
      }
      archive_child_profile: {
        Args: { p_child_profile_id: string }
        Returns: undefined
      }
      attribute_referral: {
        Args: {
          p_code: string
          p_referred_household_id: string
          p_source?: string
        }
        Returns: boolean
      }
      cancel_data_privacy_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      cancel_event_registration: {
        Args: { p_registration_id: string }
        Returns: undefined
      }
      cancel_organization_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      claim_notification_deliveries: {
        Args: { p_limit?: number }
        Returns: {
          attempt_count: number
          channel: string
          delivery_id: string
          notification_id: string
          user_id: string
        }[]
      }
      complete_child_book_adventure: {
        Args: { p_book_id: string; p_child_profile_id: string }
        Returns: boolean
      }
      complete_notification_delivery: {
        Args: {
          p_delivery_id: string
          p_last_error?: string
          p_metadata?: Json
          p_provider?: string
          p_provider_message_id?: string
          p_retry_minutes?: number
          p_status: string
        }
        Returns: undefined
      }
      create_adventure_group: {
        Args: {
          p_description?: string
          p_group_key: string
          p_group_type?: string
          p_maximum_age?: number
          p_minimum_age?: number
          p_name: string
          p_organization_id: string
        }
        Returns: string
      }
      create_child_with_consent: {
        Args: {
          p_birth_year?: number
          p_display_name: string
          p_household_id: string
        }
        Returns: string
      }
      create_group_join_code: {
        Args: {
          p_expires_in_days?: number
          p_group_id: string
          p_max_uses?: number
        }
        Returns: string
      }
      create_guardian_unlock_session: {
        Args: { p_household_id: string; p_pin: string }
        Returns: string
      }
      create_household_invitation: {
        Args: {
          p_email: string
          p_expires_days?: number
          p_household_id: string
          p_role?: string
        }
        Returns: {
          invitation_id: string
          invitation_token: string
        }[]
      }
      create_household_with_consent: {
        Args: { p_name: string; p_timezone: string }
        Returns: string
      }
      create_organization_invitation: {
        Args: {
          p_email: string
          p_expires_in_days?: number
          p_group_id?: string
          p_group_role?: string
          p_organization_id: string
          p_organization_role: string
        }
        Returns: {
          invitation_id: string
          invitation_token: string
        }[]
      }
      dc_preflight_scan: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: {
          issue_code: string
          message: string
          severity: string
        }[]
      }
      deactivate_app_installation: {
        Args: { p_installation_key: string }
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
      get_child_book_adventure_steps: {
        Args: { p_book_id: string; p_child_profile_id: string }
        Returns: {
          completed: boolean
          is_required: boolean
          sort_group: number
          sort_order: number
          source_id: string
          status: string
          step_type: string
          subtitle: string
          title: string
          xp_reward: number
        }[]
      }
      get_child_book_adventure_summary: {
        Args: { p_book_id: string; p_child_profile_id: string }
        Returns: {
          completed_required_steps: number
          completed_steps: number
          progress_percent: number
          ready_for_adventure_completion: boolean
          required_steps: number
          total_steps: number
        }[]
      }
      get_group_progress_summary: {
        Args: { p_challenge_id: string; p_group_id: string }
        Returns: {
          active_children: number
          completed_children: number
          completion_percent: number
        }[]
      }
      get_group_roster: {
        Args: { p_group_id: string }
        Returns: {
          child_profile_id: string
          display_name: string
          joined_at: string
          membership_status: string
        }[]
      }
      get_household_adults: {
        Args: { p_household_id: string }
        Returns: {
          display_name: string
          email: string
          role: string
          status: string
          user_id: string
        }[]
      }
      get_notification_delivery_payload: {
        Args: { p_delivery_id: string }
        Returns: {
          body: string
          channel: string
          deep_link: string
          delivery_id: string
          metadata: Json
          notification_id: string
          notification_type: string
          priority: string
          title: string
          user_id: string
        }[]
      }
      get_or_create_referral_code: {
        Args: { p_household_id: string }
        Returns: string
      }
      guardian_pin_status: {
        Args: { p_household_id: string }
        Returns: {
          configured: boolean
          locked_until: string
        }[]
      }
      join_child_to_group: {
        Args: { p_child_profile_id: string; p_code: string }
        Returns: string
      }
      preview_group_join_code: {
        Args: { p_code: string }
        Returns: {
          expires_at: string
          group_id: string
          group_name: string
          organization_name: string
          organization_type: string
          spots_remaining: number
        }[]
      }
      preview_organization_invitation: {
        Args: { p_invitation_id: string; p_token: string }
        Returns: {
          expires_at: string
          group_id: string
          group_name: string
          group_role: string
          invitation_id: string
          organization_id: string
          organization_name: string
          organization_role: string
          organization_type: string
        }[]
      }
      privacy_export_payload: { Args: { p_request_id: string }; Returns: Json }
      publish_dc_entity: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_target_status?: string
        }
        Returns: undefined
      }
      record_household_consent: {
        Args: {
          p_action: string
          p_child_profile_id?: string
          p_consent_key: string
          p_household_id: string
          p_metadata?: Json
        }
        Returns: string
      }
      record_integration_event: {
        Args: {
          p_direction: string
          p_entity_id: string
          p_entity_type: string
          p_event_type: string
          p_idempotency_key: string
          p_last_error?: string
          p_provider_key: string
          p_request_payload?: Json
          p_response_payload?: Json
          p_status: string
        }
        Returns: string
      }
      register_app_installation: {
        Args: {
          p_app_channel: string
          p_app_version?: string
          p_capabilities?: Json
          p_device_name?: string
          p_installation_key: string
          p_metadata?: Json
          p_platform?: string
          p_push_provider?: string
          p_push_token?: string
        }
        Returns: string
      }
      register_for_event: {
        Args: {
          p_child_profile_id?: string
          p_event_id: string
          p_household_id: string
        }
        Returns: string
      }
      remove_household_adult: {
        Args: { p_household_id: string; p_user_id: string }
        Returns: undefined
      }
      request_data_privacy_action: {
        Args: {
          p_child_profile_id?: string
          p_household_id: string
          p_reason?: string
          p_request_type: string
        }
        Returns: string
      }
      request_dc_content_review: {
        Args: { p_entity_id: string; p_entity_type: string; p_notes?: string }
        Returns: string
      }
      restore_child_profile: {
        Args: { p_child_profile_id: string }
        Returns: undefined
      }
      return_parent_challenge: {
        Args: { p_guardian_session_token: string; p_progress_id: string }
        Returns: undefined
      }
      revoke_guardian_unlock_sessions: {
        Args: { p_household_id: string }
        Returns: undefined
      }
      revoke_household_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      set_guardian_pin: {
        Args: { p_household_id: string; p_pin: string }
        Returns: undefined
      }
      update_integration_provider_health: {
        Args: {
          p_error?: string
          p_health_status?: string
          p_provider_key: string
          p_status?: string
          p_success?: boolean
        }
        Returns: undefined
      }
      verify_guardian_pin: {
        Args: { p_household_id: string; p_pin: string }
        Returns: boolean
      }
      verify_privacy_cleanup_secret: {
        Args: { p_secret: string }
        Returns: boolean
      }
      withdraw_child_from_group: {
        Args: { p_child_profile_id: string; p_group_id: string }
        Returns: undefined
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
