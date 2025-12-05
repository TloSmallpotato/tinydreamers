
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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      books_library: {
        Row: {
          authors: string | null
          cover_storage_path: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          google_books_id: string
          id: string
          page_count: number | null
          published_date: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          authors?: string | null
          cover_storage_path?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          google_books_id: string
          id?: string
          page_count?: number | null
          published_date?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          authors?: string | null
          cover_storage_path?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          google_books_id?: string
          id?: string
          page_count?: number | null
          published_date?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      children: {
        Row: {
          avatar_url: string | null
          birth_date: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      moments: {
        Row: {
          child_id: string
          created_at: string | null
          duration: number | null
          id: string
          thumbnail_url: string | null
          video_url: string
          word_id: string
        }
        Insert: {
          child_id: string
          created_at?: string | null
          duration?: number | null
          id?: string
          thumbnail_url?: string | null
          video_url: string
          word_id: string
        }
        Update: {
          child_id?: string
          created_at?: string | null
          duration?: number | null
          id?: string
          thumbnail_url?: string | null
          video_url?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moments_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moments_user_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "user_words"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_books: {
        Row: {
          book_id: string
          child_id: string
          created_at: string | null
          id: string
          rating: string | null
          tags: string[] | null
          updated_at: string | null
          would_recommend: boolean | null
        }
        Insert: {
          book_id: string
          child_id: string
          created_at?: string | null
          id?: string
          rating?: string | null
          tags?: string[] | null
          updated_at?: string | null
          would_recommend?: boolean | null
        }
        Update: {
          book_id?: string
          child_id?: string
          created_at?: string | null
          id?: string
          rating?: string | null
          tags?: string[] | null
          updated_at?: string | null
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "user_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_books_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      user_words: {
        Row: {
          child_id: string
          color: string | null
          created_at: string | null
          id: string
          is_recognised: boolean | null
          is_recorded: boolean | null
          is_spoken: boolean | null
          updated_at: string | null
          word_id: string
        }
        Insert: {
          child_id: string
          color?: string | null
          created_at?: string | null
          id?: string
          is_recognised?: boolean | null
          is_recorded?: boolean | null
          is_spoken?: boolean | null
          updated_at?: string | null
          word_id: string
        }
        Update: {
          child_id?: string
          color?: string | null
          created_at?: string | null
          id?: string
          is_recognised?: boolean | null
          is_recorded?: boolean | null
          is_spoken?: boolean | null
          updated_at?: string | null
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_words_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_words_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "word_library"
            referencedColumns: ["id"]
          },
        ]
      }
      word_library: {
        Row: {
          created_at: string | null
          emoji: string | null
          id: string
          updated_at: string | null
          word: string
        }
        Insert: {
          created_at?: string | null
          emoji?: string | null
          id?: string
          updated_at?: string | null
          word: string
        }
        Update: {
          created_at?: string | null
          emoji?: string | null
          id?: string
          updated_at?: string | null
          word?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
