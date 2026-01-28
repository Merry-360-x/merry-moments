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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ad_banners: {
        Row: {
          bg_color: string | null
          created_at: string | null
          cta_label: string | null
          cta_url: string | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          message: string
          sort_order: number | null
          starts_at: string | null
          text_color: string | null
          updated_at: string | null
        }
        Insert: {
          bg_color?: string | null
          created_at?: string | null
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          sort_order?: number | null
          starts_at?: string | null
          text_color?: string | null
          updated_at?: string | null
        }
        Update: {
          bg_color?: string | null
          created_at?: string | null
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          sort_order?: number | null
          starts_at?: string | null
          text_color?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          check_in: string
          check_out: string
          created_at: string | null
          currency: string | null
          guest_email: string | null
          guest_id: string | null
          guest_name: string | null
          guest_phone: string | null
          guests: number | null
          host_id: string | null
          id: string
          is_guest_booking: boolean | null
          payment_method: string | null
          payment_status:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          property_id: string | null
          special_requests: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          total_price: number
          updated_at: string | null
        }
        Insert: {
          check_in: string
          check_out: string
          created_at?: string | null
          currency?: string | null
          guest_email?: string | null
          guest_id?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          guests?: number | null
          host_id?: string | null
          id?: string
          is_guest_booking?: boolean | null
          payment_method?: string | null
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          property_id?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price: number
          updated_at?: string | null
        }
        Update: {
          check_in?: string
          check_out?: string
          created_at?: string | null
          currency?: string | null
          guest_email?: string | null
          guest_id?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          guests?: number | null
          host_id?: string | null
          id?: string
          is_guest_booking?: boolean | null
          payment_method?: string | null
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          property_id?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price?: number
          updated_at?: string | null
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
      checkout_requests: {
        Row: {
          created_at: string | null
          currency: string | null
          dpo_token: string | null
          dpo_transaction_id: string | null
          id: string
          metadata: Json | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          total_amount: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          dpo_token?: string | null
          dpo_transaction_id?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          total_amount: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          dpo_token?: string | null
          dpo_transaction_id?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string | null
          id: string
          property_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          property_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          property_id?: string | null
          user_id?: string | null
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
      form_drafts: {
        Row: {
          id: string
          user_id: string
          form_key: string
          draft_data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          form_key: string
          draft_data?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          form_key?: string
          draft_data?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      host_applications: {
        Row: {
          about: string | null
          accommodation_data: Json | null
          applicant_type: string | null
          areas_of_operation: string | null
          business_name: string | null
          business_tin: string | null
          created_at: string | null
          full_name: string
          hosting_location: string | null
          id: string
          languages_spoken: string[] | null
          listing_amenities: string[] | null
          listing_bathrooms: number | null
          listing_bedrooms: number | null
          listing_currency: string | null
          listing_description: string | null
          listing_images: string[] | null
          listing_location: string | null
          listing_max_guests: number | null
          listing_price_per_night: number | null
          listing_property_type: string | null
          listing_title: string | null
          listing_tour_category: string | null
          listing_tour_difficulty: string | null
          listing_tour_duration_days: number | null
          listing_tour_max_group_size: number | null
          listing_tour_price_per_person: number | null
          listing_vehicle_driver_included: boolean | null
          listing_vehicle_price_per_day: number | null
          listing_vehicle_provider_name: string | null
          listing_vehicle_seats: number | null
          listing_vehicle_type: string | null
          national_id_number: string | null
          national_id_photo_url: string | null
          nationality: string | null
          phone: string
          promoted_property_id: string | null
          promoted_tour_id: string | null
          promoted_vehicle_id: string | null
          selfie_photo_url: string | null
          service_types: string[] | null
          status: Database["public"]["Enums"]["application_status"] | null
          tour_data: Json | null
          tour_guide_bio: string | null
          tour_guide_license_url: string | null
          tour_specialties: string[] | null
          transport_data: Json | null
          updated_at: string | null
          user_id: string | null
          years_of_experience: number | null
        }
        Insert: {
          about?: string | null
          accommodation_data?: Json | null
          applicant_type?: string | null
          areas_of_operation?: string | null
          business_name?: string | null
          business_tin?: string | null
          created_at?: string | null
          full_name: string
          hosting_location?: string | null
          id?: string
          languages_spoken?: string[] | null
          listing_amenities?: string[] | null
          listing_bathrooms?: number | null
          listing_bedrooms?: number | null
          listing_currency?: string | null
          listing_description?: string | null
          listing_images?: string[] | null
          listing_location?: string | null
          listing_max_guests?: number | null
          listing_price_per_night?: number | null
          listing_property_type?: string | null
          listing_title?: string | null
          listing_tour_category?: string | null
          listing_tour_difficulty?: string | null
          listing_tour_duration_days?: number | null
          listing_tour_max_group_size?: number | null
          listing_tour_price_per_person?: number | null
          listing_vehicle_driver_included?: boolean | null
          listing_vehicle_price_per_day?: number | null
          listing_vehicle_provider_name?: string | null
          listing_vehicle_seats?: number | null
          listing_vehicle_type?: string | null
          national_id_number?: string | null
          national_id_photo_url?: string | null
          nationality?: string | null
          phone: string
          promoted_property_id?: string | null
          promoted_tour_id?: string | null
          promoted_vehicle_id?: string | null
          selfie_photo_url?: string | null
          service_types?: string[] | null
          status?: Database["public"]["Enums"]["application_status"] | null
          tour_data?: Json | null
          tour_guide_bio?: string | null
          tour_guide_license_url?: string | null
          tour_specialties?: string[] | null
          transport_data?: Json | null
          updated_at?: string | null
          user_id?: string | null
          years_of_experience?: number | null
        }
        Update: {
          about?: string | null
          accommodation_data?: Json | null
          applicant_type?: string | null
          areas_of_operation?: string | null
          business_name?: string | null
          business_tin?: string | null
          created_at?: string | null
          full_name?: string
          hosting_location?: string | null
          id?: string
          languages_spoken?: string[] | null
          listing_amenities?: string[] | null
          listing_bathrooms?: number | null
          listing_bedrooms?: number | null
          listing_currency?: string | null
          listing_description?: string | null
          listing_images?: string[] | null
          listing_location?: string | null
          listing_max_guests?: number | null
          listing_price_per_night?: number | null
          listing_property_type?: string | null
          listing_title?: string | null
          listing_tour_category?: string | null
          listing_tour_difficulty?: string | null
          listing_tour_duration_days?: number | null
          listing_tour_max_group_size?: number | null
          listing_tour_price_per_person?: number | null
          listing_vehicle_driver_included?: boolean | null
          listing_vehicle_price_per_day?: number | null
          listing_vehicle_provider_name?: string | null
          listing_vehicle_seats?: number | null
          listing_vehicle_type?: string | null
          national_id_number?: string | null
          national_id_photo_url?: string | null
          nationality?: string | null
          phone?: string
          promoted_property_id?: string | null
          promoted_tour_id?: string | null
          promoted_vehicle_id?: string | null
          selfie_photo_url?: string | null
          service_types?: string[] | null
          status?: Database["public"]["Enums"]["application_status"] | null
          tour_data?: Json | null
          tour_guide_bio?: string | null
          tour_guide_license_url?: string | null
          tour_specialties?: string[] | null
          transport_data?: Json | null
          updated_at?: string | null
          user_id?: string | null
          years_of_experience?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          date_of_birth: string | null
          full_name: string | null
          languages_spoken: string[] | null
          loyalty_points: number | null
          phone: string | null
          tour_guide_bio: string | null
          updated_at: string | null
          user_id: string
          years_of_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          full_name?: string | null
          languages_spoken?: string[] | null
          loyalty_points?: number | null
          phone?: string | null
          tour_guide_bio?: string | null
          updated_at?: string | null
          user_id: string
          years_of_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          full_name?: string | null
          languages_spoken?: string[] | null
          loyalty_points?: number | null
          phone?: string | null
          tour_guide_bio?: string | null
          updated_at?: string | null
          user_id?: string
          years_of_experience?: number | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          amenities: string[] | null
          bathrooms: number | null
          bedrooms: number | null
          beds: number | null
          cancellation_policy: string | null
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          events_allowed: boolean | null
          host_id: string | null
          id: string
          images: string[] | null
          is_published: boolean | null
          lat: number | null
          latitude: number | null
          lng: number | null
          location: string
          longitude: number | null
          main_image: string | null
          max_guests: number | null
          monthly_discount: number | null
          name: string | null
          pets_allowed: boolean | null
          price_per_night: number
          property_type: string | null
          rating: number | null
          review_count: number | null
          smoking_allowed: boolean | null
          title: string
          updated_at: string | null
          weekly_discount: number | null
        }
        Insert: {
          address?: string | null
          amenities?: string[] | null
          bathrooms?: number | null
          bedrooms?: number | null
          beds?: number | null
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          events_allowed?: boolean | null
          host_id?: string | null
          id?: string
          images?: string[] | null
          is_published?: boolean | null
          lat?: number | null
          latitude?: number | null
          lng?: number | null
          location: string
          longitude?: number | null
          main_image?: string | null
          max_guests?: number | null
          monthly_discount?: number | null
          name?: string | null
          pets_allowed?: boolean | null
          price_per_night: number
          property_type?: string | null
          rating?: number | null
          review_count?: number | null
          smoking_allowed?: boolean | null
          title: string
          updated_at?: string | null
          weekly_discount?: number | null
        }
        Update: {
          address?: string | null
          amenities?: string[] | null
          bathrooms?: number | null
          bedrooms?: number | null
          beds?: number | null
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          events_allowed?: boolean | null
          host_id?: string | null
          id?: string
          images?: string[] | null
          is_published?: boolean | null
          lat?: number | null
          latitude?: number | null
          lng?: number | null
          location?: string
          longitude?: number | null
          main_image?: string | null
          max_guests?: number | null
          monthly_discount?: number | null
          name?: string | null
          pets_allowed?: boolean | null
          price_per_night?: number
          property_type?: string | null
          rating?: number | null
          review_count?: number | null
          smoking_allowed?: boolean | null
          title?: string
          updated_at?: string | null
          weekly_discount?: number | null
        }
        Relationships: []
      }
      property_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          property_id: string | null
          rating: number | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          property_id?: string | null
          rating?: number | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          property_id?: string | null
          rating?: number | null
          user_id?: string | null
        }
        Relationships: [
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
          created_at: string | null
          id: string
          image_url: string | null
          location: string | null
          media_type: string | null
          media_url: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          media_type?: string | null
          media_url?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          media_type?: string | null
          media_url?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      story_comments: {
        Row: {
          comment_text: string
          created_at: string
          id: string
          story_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          id?: string
          story_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          id?: string
          story_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_comments_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_likes: {
        Row: {
          created_at: string
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_likes_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string | null
          id: string
          message: string
          status: string | null
          subject: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          status?: string | null
          subject: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          status?: string | null
          subject?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tour_packages: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          available_dates: Json | null
          cancellation_policy: string
          cancellation_policy_type: string | null
          category: string
          city: string
          country: string
          cover_image: string
          created_at: string
          currency: string
          daily_itinerary: string
          description: string
          duration: string
          excluded_services: string | null
          gallery_images: Json | null
          group_discount_min_size: number | null
          group_discount_percentage: number | null
          host_id: string
          id: string
          included_services: string | null
          itinerary_pdf_url: string
          max_guests: number
          meeting_point: string
          min_guests: number
          price_per_adult: number
          pricing_tiers: Json | null
          rdb_certificate_url: string | null
          rdb_certificate_valid_until: string | null
          rejection_reason: string | null
          status: string
          title: string
          tour_type: string
          updated_at: string
          what_to_bring: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          available_dates?: Json | null
          cancellation_policy: string
          cancellation_policy_type?: string | null
          category: string
          city: string
          country?: string
          cover_image: string
          created_at?: string
          currency?: string
          daily_itinerary: string
          description: string
          duration: string
          excluded_services?: string | null
          gallery_images?: Json | null
          group_discount_min_size?: number | null
          group_discount_percentage?: number | null
          host_id: string
          id?: string
          included_services?: string | null
          itinerary_pdf_url: string
          max_guests?: number
          meeting_point: string
          min_guests?: number
          price_per_adult: number
          pricing_tiers?: Json | null
          rdb_certificate_url?: string | null
          rdb_certificate_valid_until?: string | null
          rejection_reason?: string | null
          status?: string
          title: string
          tour_type: string
          updated_at?: string
          what_to_bring?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          available_dates?: Json | null
          cancellation_policy?: string
          cancellation_policy_type?: string | null
          category?: string
          city?: string
          country?: string
          cover_image?: string
          created_at?: string
          currency?: string
          daily_itinerary?: string
          description?: string
          duration?: string
          excluded_services?: string | null
          gallery_images?: Json | null
          group_discount_min_size?: number | null
          group_discount_percentage?: number | null
          host_id?: string
          id?: string
          included_services?: string | null
          itinerary_pdf_url?: string
          max_guests?: number
          meeting_point?: string
          min_guests?: number
          price_per_adult?: number
          pricing_tiers?: Json | null
          rdb_certificate_url?: string | null
          rdb_certificate_valid_until?: string | null
          rejection_reason?: string | null
          status?: string
          title?: string
          tour_type?: string
          updated_at?: string
          what_to_bring?: string | null
        }
        Relationships: []
      }
      tours: {
        Row: {
          categories: string[] | null
          category: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          difficulty: string | null
          duration_days: number | null
          id: string
          images: string[] | null
          is_published: boolean | null
          itinerary_pdf_url: string | null
          location: string
          max_group_size: number | null
          price_per_person: number
          rating: number | null
          review_count: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          categories?: string[] | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          difficulty?: string | null
          duration_days?: number | null
          id?: string
          images?: string[] | null
          is_published?: boolean | null
          itinerary_pdf_url?: string | null
          location: string
          max_group_size?: number | null
          price_per_person: number
          rating?: number | null
          review_count?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          categories?: string[] | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          difficulty?: string | null
          duration_days?: number | null
          id?: string
          images?: string[] | null
          is_published?: boolean | null
          itinerary_pdf_url?: string | null
          location?: string
          max_group_size?: number | null
          price_per_person?: number
          rating?: number | null
          review_count?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      transport_routes: {
        Row: {
          base_price: number
          created_at: string | null
          currency: string | null
          from_location: string
          id: string
          is_published: boolean | null
          to_location: string
        }
        Insert: {
          base_price: number
          created_at?: string | null
          currency?: string | null
          from_location: string
          id?: string
          is_published?: boolean | null
          to_location: string
        }
        Update: {
          base_price?: number
          created_at?: string | null
          currency?: string | null
          from_location?: string
          id?: string
          is_published?: boolean | null
          to_location?: string
        }
        Relationships: []
      }
      transport_services: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      transport_vehicles: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency: string | null
          driver_included: boolean | null
          id: string
          image_url: string | null
          is_published: boolean | null
          media: string[] | null
          price_per_day: number
          provider_name: string | null
          seats: number | null
          title: string
          updated_at: string | null
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          driver_included?: boolean | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          media?: string[] | null
          price_per_day: number
          provider_name?: string | null
          seats?: number | null
          title: string
          updated_at?: string | null
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          driver_included?: boolean | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          media?: string[] | null
          price_per_day?: number
          provider_name?: string | null
          seats?: number | null
          title?: string
          updated_at?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      trip_cart_items: {
        Row: {
          created_at: string | null
          id: string
          item_type: string
          quantity: number | null
          reference_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_type: string
          quantity?: number | null
          reference_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_type?: string
          quantity?: number | null
          reference_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          currency: string | null
          language: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          language?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          language?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_dashboard_metrics: { Args: never; Returns: Json }
      admin_list_users: {
        Args: { _search?: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          is_suspended: boolean
          is_verified: boolean
          last_sign_in_at: string
          phone: string
          user_id: string
        }[]
      }
      delete_old_stories: { Args: never; Returns: undefined }
      get_staff_dashboard_metrics: { Args: never; Returns: Json }
      has_role: {
        Args: {
          check_role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_staff_or_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role:
        | "guest"
        | "user"
        | "host"
        | "staff"
        | "admin"
        | "financial_staff"
        | "operations_staff"
        | "customer_support"
      application_status: "pending" | "approved" | "rejected"
      booking_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "pending_confirmation"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      payment_status_enum: "pending" | "paid" | "failed" | "refunded"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: [
        "guest",
        "user",
        "host",
        "staff",
        "admin",
        "financial_staff",
        "operations_staff",
        "customer_support",
      ],
      application_status: ["pending", "approved", "rejected"],
      booking_status: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "pending_confirmation",
      ],
      payment_status: ["pending", "paid", "failed", "refunded"],
      payment_status_enum: ["pending", "paid", "failed", "refunded"],
    },
  },
} as const
