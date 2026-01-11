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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          check_in: string
          check_out: string
          created_at: string
          currency: string
          discount_amount: number
          guest_id: string
          guests_count: number
          host_id: string | null
          id: string
          loyalty_points_used: number
          property_id: string
          status: string
          total_price: number
          updated_at: string
        }
        Insert: {
          check_in: string
          check_out: string
          created_at?: string
          currency?: string
          discount_amount?: number
          guest_id: string
          guests_count?: number
          host_id?: string | null
          id?: string
          loyalty_points_used?: number
          property_id: string
          status?: string
          total_price: number
          updated_at?: string
        }
        Update: {
          check_in?: string
          check_out?: string
          created_at?: string
          currency?: string
          discount_amount?: number
          guest_id?: string
          guests_count?: number
          host_id?: string | null
          id?: string
          loyalty_points_used?: number
          property_id?: string
          status?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string | null
          id: string
          loyalty_awarded: boolean
          loyalty_points: number
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          id?: string
          loyalty_awarded?: boolean
          loyalty_points?: number
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          id?: string
          loyalty_awarded?: boolean
          loyalty_points?: number
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tours: {
        Row: {
          category: string
          created_by: string | null
          created_at: string
          currency: string
          description: string | null
          difficulty: string
          duration_days: number
          id: string
          images: string[] | null
          is_published: boolean | null
          location: string | null
          price_per_person: number
          rating: number | null
          review_count: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_by?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          difficulty?: string
          duration_days?: number
          id?: string
          images?: string[] | null
          is_published?: boolean | null
          location?: string | null
          price_per_person?: number
          rating?: number | null
          review_count?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_by?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          difficulty?: string
          duration_days?: number
          id?: string
          images?: string[] | null
          is_published?: boolean | null
          location?: string | null
          price_per_person?: number
          rating?: number | null
          review_count?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      transport_routes: {
        Row: {
          base_price: number
          created_by: string | null
          created_at: string
          currency: string
          distance_km: number | null
          duration_minutes: number | null
          from_location: string
          id: string
          is_published: boolean | null
          to_location: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          created_by?: string | null
          created_at?: string
          currency?: string
          distance_km?: number | null
          duration_minutes?: number | null
          from_location: string
          id?: string
          is_published?: boolean | null
          to_location: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          created_by?: string | null
          created_at?: string
          currency?: string
          distance_km?: number | null
          duration_minutes?: number | null
          from_location?: string
          id?: string
          is_published?: boolean | null
          to_location?: string
          updated_at?: string
        }
        Relationships: []
      }
      transport_services: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_published: boolean | null
          price_hint: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean | null
          price_hint?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean | null
          price_hint?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      transport_vehicles: {
        Row: {
          created_by: string | null
          created_at: string
          currency: string
          driver_included: boolean | null
          id: string
          image_url: string | null
          is_published: boolean | null
          price_per_day: number
          provider_name: string | null
          seats: number
          title: string
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          created_by?: string | null
          created_at?: string
          currency?: string
          driver_included?: boolean | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          price_per_day?: number
          provider_name?: string | null
          seats?: number
          title: string
          updated_at?: string
          vehicle_type?: string
        }
        Update: {
          created_by?: string | null
          created_at?: string
          currency?: string
          driver_included?: boolean | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          price_per_day?: number
          provider_name?: string | null
          seats?: number
          title?: string
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: []
      }
      trip_cart_items: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          item_type: Database["public"]["Enums"]["trip_item_type"]
          quantity: number
          reference_id: string
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          item_type: Database["public"]["Enums"]["trip_item_type"]
          quantity?: number
          reference_id: string
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          item_type?: Database["public"]["Enums"]["trip_item_type"]
          quantity?: number
          reference_id?: string
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          amenities: string[] | null
          bathrooms: number | null
          beds: number | null
          bedrooms: number | null
          cancellation_policy: string | null
          created_at: string
          currency: string
          description: string | null
          host_id: string
          id: string
          images: string[] | null
          is_published: boolean | null
          lat: number | null
          lng: number | null
          location: string
          max_guests: number
          price_per_night: number
          property_type: string
          rating: number | null
          review_count: number | null
          title: string
          updated_at: string
        }
        Insert: {
          amenities?: string[] | null
          bathrooms?: number | null
          beds?: number | null
          bedrooms?: number | null
          cancellation_policy?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          host_id: string
          id?: string
          images?: string[] | null
          is_published?: boolean | null
          lat?: number | null
          lng?: number | null
          location: string
          max_guests?: number
          price_per_night: number
          property_type?: string
          rating?: number | null
          review_count?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          amenities?: string[] | null
          bathrooms?: number | null
          beds?: number | null
          bedrooms?: number | null
          cancellation_policy?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          host_id?: string
          id?: string
          images?: string[] | null
          is_published?: boolean | null
          lat?: number | null
          lng?: number | null
          location?: string
          max_guests?: number
          price_per_night?: number
          property_type?: string
          rating?: number | null
          review_count?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      host_applications: {
        Row: {
          about: string | null
          applicant_type: string
          business_name: string | null
          business_certificate_url: string | null
          business_tin: string | null
          created_at: string
          full_name: string | null
          hosting_location: string | null
          id: string
          listing_amenities: string[] | null
          listing_bathrooms: number | null
          listing_bedrooms: number | null
          listing_currency: string | null
          listing_images: string[] | null
          listing_location: string | null
          listing_max_guests: number | null
          listing_price_per_night: number | null
          listing_property_type: string | null
          listing_title: string | null
          national_id_number: string | null
          national_id_photo_url: string | null
          phone: string | null
          review_notes: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          about?: string | null
          applicant_type?: string
          business_name?: string | null
          business_certificate_url?: string | null
          business_tin?: string | null
          created_at?: string
          full_name?: string | null
          hosting_location?: string | null
          id?: string
          listing_amenities?: string[] | null
          listing_bathrooms?: number | null
          listing_bedrooms?: number | null
          listing_currency?: string | null
          listing_images?: string[] | null
          listing_location?: string | null
          listing_max_guests?: number | null
          listing_price_per_night?: number | null
          listing_property_type?: string | null
          listing_title?: string | null
          national_id_number?: string | null
          national_id_photo_url?: string | null
          phone?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          about?: string | null
          applicant_type?: string
          business_name?: string | null
          business_certificate_url?: string | null
          business_tin?: string | null
          created_at?: string
          full_name?: string | null
          hosting_location?: string | null
          id?: string
          listing_amenities?: string[] | null
          listing_bathrooms?: number | null
          listing_bedrooms?: number | null
          listing_currency?: string | null
          listing_images?: string[] | null
          listing_location?: string | null
          listing_max_guests?: number | null
          listing_price_per_night?: number | null
          listing_property_type?: string | null
          listing_title?: string | null
          national_id_number?: string | null
          national_id_photo_url?: string | null
          phone?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      property_reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          id: string
          property_id: string
          rating: number
          reviewer_id: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          id?: string
          property_id: string
          rating: number
          reviewer_id: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          property_id?: string
          rating?: number
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          body: string
          created_at: string
          id: string
          image_url: string | null
          listing_id: string | null
          listing_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          image_url?: string | null
          listing_id?: string | null
          listing_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          listing_id?: string | null
          listing_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          currency: string
          created_at: string
          locale: string
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          currency?: string
          created_at?: string
          locale?: string
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          currency?: string
          created_at?: string
          locale?: string
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "guest" | "host" | "staff" | "admin"
      trip_item_type: "tour" | "transport_service" | "transport_vehicle" | "transport_route"
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
    Enums: {
      app_role: ["guest", "host", "staff", "admin"],
    },
  },
} as const
