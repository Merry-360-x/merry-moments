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
      affiliate_commissions: {
        Row: {
          affiliate_commission: number | null
          affiliate_id: string
          amount: number
          booking_id: string
          booking_value: number | null
          commission_rate: number
          created_at: string
          id: string
          paid_at: string | null
          platform_commission: number | null
          referral_id: string | null
          status: string | null
        }
        Insert: {
          affiliate_commission?: number | null
          affiliate_id: string
          amount: number
          booking_id: string
          booking_value?: number | null
          commission_rate: number
          created_at?: string
          id?: string
          paid_at?: string | null
          platform_commission?: number | null
          referral_id?: string | null
          status?: string | null
        }
        Update: {
          affiliate_commission?: number | null
          affiliate_id?: string
          amount?: number
          booking_id?: string
          booking_value?: number | null
          commission_rate?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          platform_commission?: number | null
          referral_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "affiliate_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payouts: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string
          currency: string | null
          id: string
          notes: string | null
          payment_details: Json | null
          payment_method: string
          processed_at: string | null
          requested_at: string | null
          status: string | null
        }
        Insert: {
          affiliate_id: string
          amount: number
          created_at?: string
          currency?: string | null
          id?: string
          notes?: string | null
          payment_details?: Json | null
          payment_method: string
          processed_at?: string | null
          requested_at?: string | null
          status?: string | null
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          notes?: string | null
          payment_details?: Json | null
          payment_method?: string
          processed_at?: string | null
          requested_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_referrals: {
        Row: {
          affiliate_id: string
          booking_id: string | null
          bookings_count: number | null
          converted: boolean | null
          created_at: string
          id: string
          landing_page: string | null
          referral_code: string
          referred_user_email: string | null
          referred_user_id: string | null
          registered_at: string | null
          status: string | null
          total_commission_earned: number | null
          user_agent: string | null
          visitor_ip: string | null
        }
        Insert: {
          affiliate_id: string
          booking_id?: string | null
          bookings_count?: number | null
          converted?: boolean | null
          created_at?: string
          id?: string
          landing_page?: string | null
          referral_code: string
          referred_user_email?: string | null
          referred_user_id?: string | null
          registered_at?: string | null
          status?: string | null
          total_commission_earned?: number | null
          user_agent?: string | null
          visitor_ip?: string | null
        }
        Update: {
          affiliate_id?: string
          booking_id?: string | null
          bookings_count?: number | null
          converted?: boolean | null
          created_at?: string
          id?: string
          landing_page?: string | null
          referral_code?: string
          referred_user_email?: string | null
          referred_user_id?: string | null
          registered_at?: string | null
          status?: string | null
          total_commission_earned?: number | null
          user_agent?: string | null
          visitor_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_referrals_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          affiliate_code: string | null
          approved_at: string | null
          commission_rate: number | null
          company_name: string | null
          created_at: string
          id: string
          paid_earnings: number | null
          pending_earnings: number | null
          referral_code: string
          status: string | null
          total_earnings: number | null
          total_referrals: number | null
          updated_at: string | null
          user_id: string
          website_url: string | null
        }
        Insert: {
          affiliate_code?: string | null
          approved_at?: string | null
          commission_rate?: number | null
          company_name?: string | null
          created_at?: string
          id?: string
          paid_earnings?: number | null
          pending_earnings?: number | null
          referral_code: string
          status?: string | null
          total_earnings?: number | null
          total_referrals?: number | null
          updated_at?: string | null
          user_id: string
          website_url?: string | null
        }
        Update: {
          affiliate_code?: string | null
          approved_at?: string | null
          commission_rate?: number | null
          company_name?: string | null
          created_at?: string
          id?: string
          paid_earnings?: number | null
          pending_earnings?: number | null
          referral_code?: string
          status?: string | null
          total_earnings?: number | null
          total_referrals?: number | null
          updated_at?: string | null
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      airport_transfer_pricing: {
        Row: {
          created_at: string | null
          currency: string | null
          id: string
          price: number
          route_id: string
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          id?: string
          price: number
          route_id: string
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          id?: string
          price?: number
          route_id?: string
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "airport_transfer_pricing_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "airport_transfer_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "airport_transfer_pricing_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "transport_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      airport_transfer_routes: {
        Row: {
          base_price: number
          created_at: string | null
          currency: string | null
          distance_km: number | null
          from_location: string
          id: string
          is_active: boolean | null
          to_location: string
          updated_at: string | null
        }
        Insert: {
          base_price: number
          created_at?: string | null
          currency?: string | null
          distance_km?: number | null
          from_location: string
          id?: string
          is_active?: boolean | null
          to_location: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          created_at?: string | null
          currency?: string | null
          distance_km?: number | null
          from_location?: string
          id?: string
          is_active?: boolean | null
          to_location?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      blacklist: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          reason: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          reason: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          reason?: string
          user_id?: string | null
        }
        Relationships: []
      }
      booking_change_requests: {
        Row: {
          booking_id: string
          created_at: string
          currency: string
          host_id: string
          host_response: string | null
          id: string
          new_price: number
          original_end_date: string
          original_price: number
          original_start_date: string
          price_difference: number
          reason: string | null
          requested_end_date: string
          requested_start_date: string
          responded_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          currency?: string
          host_id: string
          host_response?: string | null
          id?: string
          new_price: number
          original_end_date: string
          original_price: number
          original_start_date: string
          price_difference: number
          reason?: string | null
          requested_end_date: string
          requested_start_date: string
          responded_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          currency?: string
          host_id?: string
          host_response?: string | null
          id?: string
          new_price?: number
          original_end_date?: string
          original_price?: number
          original_start_date?: string
          price_difference?: number
          reason?: string | null
          requested_end_date?: string
          requested_start_date?: string
          responded_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_change_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          affiliate_id: string | null
          booking_type: string | null
          check_in: string
          check_out: string
          confirmation_status: string | null
          confirmed_at: string | null
          confirmed_by: string | null
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
          order_id: string | null
          payment_method: string | null
          payment_status:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          property_id: string | null
          referral_code: string | null
          rejected_at: string | null
          rejection_reason: string | null
          review_email_sent: boolean | null
          review_token: string | null
          special_requests: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          total_price: number
          tour_id: string | null
          transport_id: string | null
          updated_at: string | null
        }
        Insert: {
          affiliate_id?: string | null
          booking_type?: string | null
          check_in: string
          check_out: string
          confirmation_status?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
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
          order_id?: string | null
          payment_method?: string | null
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          property_id?: string | null
          referral_code?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          review_email_sent?: boolean | null
          review_token?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price: number
          tour_id?: string | null
          transport_id?: string | null
          updated_at?: string | null
        }
        Update: {
          affiliate_id?: string | null
          booking_type?: string | null
          check_in?: string
          check_out?: string
          confirmation_status?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
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
          order_id?: string | null
          payment_method?: string | null
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          property_id?: string | null
          referral_code?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          review_email_sent?: boolean | null
          review_token?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price?: number
          tour_id?: string | null
          transport_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tour_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_transport_id_fkey"
            columns: ["transport_id"]
            isOneToOne: false
            referencedRelation: "transport_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_requests: {
        Row: {
          base_price_amount: number | null
          created_at: string | null
          currency: string | null
          dpo_token: string | null
          dpo_transaction_id: string | null
          email: string | null
          host_earnings_amount: number | null
          id: string
          items: Json
          message: string | null
          metadata: Json | null
          name: string | null
          payment_error: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          phone: string | null
          service_fee_amount: number | null
          status: string | null
          total_amount: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          base_price_amount?: number | null
          created_at?: string | null
          currency?: string | null
          dpo_token?: string | null
          dpo_transaction_id?: string | null
          email?: string | null
          host_earnings_amount?: number | null
          id?: string
          items?: Json
          message?: string | null
          metadata?: Json | null
          name?: string | null
          payment_error?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          phone?: string | null
          service_fee_amount?: number | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          base_price_amount?: number | null
          created_at?: string | null
          currency?: string | null
          dpo_token?: string | null
          dpo_transaction_id?: string | null
          email?: string | null
          host_earnings_amount?: number | null
          id?: string
          items?: Json
          message?: string | null
          metadata?: Json | null
          name?: string | null
          payment_error?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          phone?: string | null
          service_fee_amount?: number | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      discount_codes: {
        Row: {
          applies_to: string | null
          code: string
          created_at: string | null
          currency: string | null
          current_uses: number | null
          description: string | null
          discount_type: string
          discount_value: number
          host_id: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          minimum_amount: number | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applies_to?: string | null
          code: string
          created_at?: string | null
          currency?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type: string
          discount_value: number
          host_id?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          minimum_amount?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applies_to?: string | null
          code?: string
          created_at?: string | null
          currency?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          host_id?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          minimum_amount?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
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
          created_at: string
          draft_data: Json
          form_key: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          draft_data?: Json
          form_key: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          draft_data?: Json
          form_key?: string
          id?: string
          updated_at?: string
          user_id?: string
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
          profile_complete: boolean | null
          promoted_property_id: string | null
          promoted_tour_id: string | null
          promoted_tour_package_id: string | null
          promoted_vehicle_id: string | null
          rdb_certificate_url: string | null
          selfie_photo_url: string | null
          service_types: string[] | null
          status: Database["public"]["Enums"]["application_status"] | null
          suspended: boolean | null
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          tour_data: Json | null
          tour_guide_bio: string | null
          tour_guide_license_url: string | null
          tour_license_url: string | null
          tour_package_data: Json | null
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
          profile_complete?: boolean | null
          promoted_property_id?: string | null
          promoted_tour_id?: string | null
          promoted_tour_package_id?: string | null
          promoted_vehicle_id?: string | null
          rdb_certificate_url?: string | null
          selfie_photo_url?: string | null
          service_types?: string[] | null
          status?: Database["public"]["Enums"]["application_status"] | null
          suspended?: boolean | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          tour_data?: Json | null
          tour_guide_bio?: string | null
          tour_guide_license_url?: string | null
          tour_license_url?: string | null
          tour_package_data?: Json | null
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
          profile_complete?: boolean | null
          promoted_property_id?: string | null
          promoted_tour_id?: string | null
          promoted_tour_package_id?: string | null
          promoted_vehicle_id?: string | null
          rdb_certificate_url?: string | null
          selfie_photo_url?: string | null
          service_types?: string[] | null
          status?: Database["public"]["Enums"]["application_status"] | null
          suspended?: boolean | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          tour_data?: Json | null
          tour_guide_bio?: string | null
          tour_guide_license_url?: string | null
          tour_license_url?: string | null
          tour_package_data?: Json | null
          tour_specialties?: string[] | null
          transport_data?: Json | null
          updated_at?: string | null
          user_id?: string | null
          years_of_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "host_applications_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      host_payout_methods: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          bank_swift_code: string | null
          created_at: string
          host_id: string
          id: string
          is_primary: boolean | null
          method_type: string
          mobile_provider: string | null
          nickname: string | null
          phone_number: string | null
          updated_at: string
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_swift_code?: string | null
          created_at?: string
          host_id: string
          id?: string
          is_primary?: boolean | null
          method_type: string
          mobile_provider?: string | null
          nickname?: string | null
          phone_number?: string | null
          updated_at?: string
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_swift_code?: string | null
          created_at?: string
          host_id?: string
          id?: string
          is_primary?: boolean | null
          method_type?: string
          mobile_provider?: string | null
          nickname?: string | null
          phone_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      host_payouts: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          currency: string
          host_id: string
          id: string
          pawapay_payout_id: string | null
          payout_details: Json | null
          payout_method: string
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          currency?: string
          host_id: string
          id?: string
          pawapay_payout_id?: string | null
          payout_details?: Json | null
          payout_method: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          currency?: string
          host_id?: string
          id?: string
          pawapay_payout_id?: string | null
          payout_details?: Json | null
          payout_method?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "host_payouts_host_id_profiles_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      incident_reports: {
        Row: {
          created_at: string | null
          description: string
          id: string
          incident_type: string
          reported_property_id: string | null
          reported_user_id: string | null
          reporter_id: string | null
          resolution: string | null
          severity: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          incident_type: string
          reported_property_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string | null
          resolution?: string | null
          severity?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          incident_type?: string
          reported_property_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string | null
          resolution?: string | null
          severity?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_reports_reported_property_id_fkey"
            columns: ["reported_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_content: {
        Row: {
          content: Json
          content_type: string
          created_at: string | null
          id: string
          last_updated_by: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: Json
          content_type: string
          created_at?: string | null
          id?: string
          last_updated_by?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: Json
          content_type?: string
          created_at?: string | null
          id?: string
          last_updated_by?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          created_at: string | null
          id: string
          points: number
          total_earned: number
          total_redeemed: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          points?: number
          total_earned?: number
          total_redeemed?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          points?: number
          total_earned?: number
          total_redeemed?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          created_at: string | null
          id: string
          points: number
          reason: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          points: number
          reason: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          points?: number
          reason?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          payment_method: string | null
          phone_number: string | null
          provider: string
          provider_response: Json | null
          status: string
          transaction_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          payment_method?: string | null
          phone_number?: string | null
          provider: string
          provider_response?: Json | null
          status?: string
          transaction_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          payment_method?: string | null
          phone_number?: string | null
          provider?: string
          provider_response?: Json | null
          status?: string
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          full_name: string | null
          id: string | null
          languages_spoken: string[] | null
          loyalty_points: number | null
          nickname: string | null
          payout_account_name: string | null
          payout_bank_account: string | null
          payout_bank_name: string | null
          payout_method: string | null
          payout_phone: string | null
          phone: string | null
          profile_completed_bonus: boolean | null
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
          email?: string | null
          full_name?: string | null
          id?: string | null
          languages_spoken?: string[] | null
          loyalty_points?: number | null
          nickname?: string | null
          payout_account_name?: string | null
          payout_bank_account?: string | null
          payout_bank_name?: string | null
          payout_method?: string | null
          payout_phone?: string | null
          phone?: string | null
          profile_completed_bonus?: boolean | null
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
          email?: string | null
          full_name?: string | null
          id?: string | null
          languages_spoken?: string[] | null
          loyalty_points?: number | null
          nickname?: string | null
          payout_account_name?: string | null
          payout_bank_account?: string | null
          payout_bank_name?: string | null
          payout_method?: string | null
          payout_phone?: string | null
          phone?: string | null
          profile_completed_bonus?: boolean | null
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
          available_for_monthly_rental: boolean | null
          bathrooms: number | null
          bedrooms: number | null
          beds: number | null
          cancellation_policy: string | null
          check_in_time: string | null
          check_out_time: string | null
          conference_room_capacity: number | null
          conference_room_equipment: string[] | null
          conference_room_min_rooms_required: number | null
          created_at: string | null
          currency: string | null
          description: string | null
          events_allowed: boolean | null
          host_id: string | null
          id: string
          images: string[] | null
          is_featured: boolean | null
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
          price_per_group: number | null
          price_per_group_size: number | null
          price_per_month: number | null
          price_per_night: number
          price_per_person: number | null
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
          available_for_monthly_rental?: boolean | null
          bathrooms?: number | null
          bedrooms?: number | null
          beds?: number | null
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          conference_room_capacity?: number | null
          conference_room_equipment?: string[] | null
          conference_room_min_rooms_required?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          events_allowed?: boolean | null
          host_id?: string | null
          id?: string
          images?: string[] | null
          is_featured?: boolean | null
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
          price_per_group?: number | null
          price_per_group_size?: number | null
          price_per_month?: number | null
          price_per_night: number
          price_per_person?: number | null
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
          available_for_monthly_rental?: boolean | null
          bathrooms?: number | null
          bedrooms?: number | null
          beds?: number | null
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          conference_room_capacity?: number | null
          conference_room_equipment?: string[] | null
          conference_room_min_rooms_required?: number | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          events_allowed?: boolean | null
          host_id?: string | null
          id?: string
          images?: string[] | null
          is_featured?: boolean | null
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
          price_per_group?: number | null
          price_per_group_size?: number | null
          price_per_month?: number | null
          price_per_night?: number
          price_per_person?: number | null
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
      property_blocked_dates: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_date: string
          id: string
          property_id: string
          reason: string | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_date: string
          id?: string
          property_id: string
          reason?: string | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string
          id?: string
          property_id?: string
          reason?: string | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_blocked_dates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_custom_prices: {
        Row: {
          created_at: string | null
          created_by: string | null
          custom_price_per_night: number
          end_date: string
          id: string
          property_id: string
          reason: string | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          custom_price_per_night: number
          end_date: string
          id?: string
          property_id: string
          reason?: string | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          custom_price_per_night?: number
          end_date?: string
          id?: string
          property_id?: string
          reason?: string | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_custom_prices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_reviews: {
        Row: {
          booking_id: string | null
          comment: string | null
          created_at: string | null
          id: string
          is_hidden: boolean | null
          property_id: string | null
          rating: number | null
          reviewer_id: string | null
          service_comment: string | null
          service_rating: number | null
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          is_hidden?: boolean | null
          property_id?: string | null
          rating?: number | null
          reviewer_id?: string | null
          service_comment?: string | null
          service_rating?: number | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          is_hidden?: boolean | null
          property_id?: string | null
          rating?: number | null
          reviewer_id?: string | null
          service_comment?: string | null
          service_rating?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
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
      reviews: {
        Row: {
          booking_id: string | null
          comment: string | null
          created_at: string | null
          id: string
          is_hidden: boolean | null
          property_id: string | null
          rating: number
          tour_id: string | null
          transport_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          is_hidden?: boolean | null
          property_id?: string | null
          rating: number
          tour_id?: string | null
          transport_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          is_hidden?: boolean | null
          property_id?: string | null
          rating?: number
          tour_id?: string | null
          transport_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tour_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_transport_id_fkey"
            columns: ["transport_id"]
            isOneToOne: false
            referencedRelation: "transport_vehicles"
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
      support_ticket_logs: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          message: string | null
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          attachments: Json | null
          created_at: string | null
          id: string
          message: string
          reply_to_id: string | null
          sender_id: string | null
          sender_name: string | null
          sender_type: string
          ticket_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          message: string
          reply_to_id?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sender_type: string
          ticket_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          message?: string
          reply_to_id?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "support_ticket_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          last_activity_at: string | null
          message: string
          priority: string | null
          response: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          last_activity_at?: string | null
          message: string
          priority?: string | null
          response?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          last_activity_at?: string | null
          message?: string
          priority?: string | null
          response?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tour_packages: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          available_dates: Json | null
          cancellation_policy: string | null
          cancellation_policy_type: string | null
          categories: string[] | null
          category: string
          city: string
          confirmation_required_reason: string | null
          country: string
          cover_image: string | null
          created_at: string
          currency: string
          custom_cancellation_policy: string | null
          custom_cancellation_policy_url: string | null
          daily_itinerary: string
          description: string
          duration: string
          excluded_services: string | null
          gallery_images: Json | null
          group_discount_11_15: number | null
          group_discount_16_plus: number | null
          group_discount_6_10: number | null
          group_discount_min_size: number | null
          group_discount_percentage: number | null
          group_discounts: Json | null
          has_differential_pricing: boolean | null
          host_id: string
          id: string
          included_services: string | null
          international_price_per_adult: number | null
          is_approved: boolean | null
          itinerary_pdf_url: string | null
          max_guests: number
          meeting_point: string
          min_guests: number
          national_discount_percent: number | null
          non_refundable_items: Json | null
          price_for_citizens: number | null
          price_for_east_african: number | null
          price_for_foreigners: number | null
          price_per_adult: number
          price_per_person: number | null
          pricing_tiers: Json | null
          rdb_certificate_url: string | null
          rdb_certificate_valid_until: string | null
          rejection_reason: string | null
          requires_confirmation: boolean | null
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
          cancellation_policy?: string | null
          cancellation_policy_type?: string | null
          categories?: string[] | null
          category: string
          city: string
          confirmation_required_reason?: string | null
          country?: string
          cover_image?: string | null
          created_at?: string
          currency?: string
          custom_cancellation_policy?: string | null
          custom_cancellation_policy_url?: string | null
          daily_itinerary: string
          description: string
          duration: string
          excluded_services?: string | null
          gallery_images?: Json | null
          group_discount_11_15?: number | null
          group_discount_16_plus?: number | null
          group_discount_6_10?: number | null
          group_discount_min_size?: number | null
          group_discount_percentage?: number | null
          group_discounts?: Json | null
          has_differential_pricing?: boolean | null
          host_id: string
          id?: string
          included_services?: string | null
          international_price_per_adult?: number | null
          is_approved?: boolean | null
          itinerary_pdf_url?: string | null
          max_guests?: number
          meeting_point: string
          min_guests?: number
          national_discount_percent?: number | null
          non_refundable_items?: Json | null
          price_for_citizens?: number | null
          price_for_east_african?: number | null
          price_for_foreigners?: number | null
          price_per_adult: number
          price_per_person?: number | null
          pricing_tiers?: Json | null
          rdb_certificate_url?: string | null
          rdb_certificate_valid_until?: string | null
          rejection_reason?: string | null
          requires_confirmation?: boolean | null
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
          cancellation_policy?: string | null
          cancellation_policy_type?: string | null
          categories?: string[] | null
          category?: string
          city?: string
          confirmation_required_reason?: string | null
          country?: string
          cover_image?: string | null
          created_at?: string
          currency?: string
          custom_cancellation_policy?: string | null
          custom_cancellation_policy_url?: string | null
          daily_itinerary?: string
          description?: string
          duration?: string
          excluded_services?: string | null
          gallery_images?: Json | null
          group_discount_11_15?: number | null
          group_discount_16_plus?: number | null
          group_discount_6_10?: number | null
          group_discount_min_size?: number | null
          group_discount_percentage?: number | null
          group_discounts?: Json | null
          has_differential_pricing?: boolean | null
          host_id?: string
          id?: string
          included_services?: string | null
          international_price_per_adult?: number | null
          is_approved?: boolean | null
          itinerary_pdf_url?: string | null
          max_guests?: number
          meeting_point?: string
          min_guests?: number
          national_discount_percent?: number | null
          non_refundable_items?: Json | null
          price_for_citizens?: number | null
          price_for_east_african?: number | null
          price_for_foreigners?: number | null
          price_per_adult?: number
          price_per_person?: number | null
          pricing_tiers?: Json | null
          rdb_certificate_url?: string | null
          rdb_certificate_valid_until?: string | null
          rejection_reason?: string | null
          requires_confirmation?: boolean | null
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
          cancellation_policy: string | null
          cancellation_policy_type: string | null
          categories: string[] | null
          category: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          custom_cancellation_policy: string | null
          description: string | null
          difficulty: string | null
          duration_days: number | null
          has_differential_pricing: boolean | null
          id: string
          images: string[] | null
          international_price_per_person: number | null
          is_published: boolean | null
          itinerary_pdf_url: string | null
          location: string
          max_group_size: number | null
          national_discount_percent: number | null
          non_refundable_items: string | null
          price_for_citizens: number | null
          price_for_east_african: number | null
          price_for_foreigners: number | null
          price_per_person: number
          pricing_tiers: Json | null
          rating: number | null
          review_count: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          cancellation_policy?: string | null
          cancellation_policy_type?: string | null
          categories?: string[] | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          custom_cancellation_policy?: string | null
          description?: string | null
          difficulty?: string | null
          duration_days?: number | null
          has_differential_pricing?: boolean | null
          id?: string
          images?: string[] | null
          international_price_per_person?: number | null
          is_published?: boolean | null
          itinerary_pdf_url?: string | null
          location: string
          max_group_size?: number | null
          national_discount_percent?: number | null
          non_refundable_items?: string | null
          price_for_citizens?: number | null
          price_for_east_african?: number | null
          price_for_foreigners?: number | null
          price_per_person: number
          pricing_tiers?: Json | null
          rating?: number | null
          review_count?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          cancellation_policy?: string | null
          cancellation_policy_type?: string | null
          categories?: string[] | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          custom_cancellation_policy?: string | null
          description?: string | null
          difficulty?: string | null
          duration_days?: number | null
          has_differential_pricing?: boolean | null
          id?: string
          images?: string[] | null
          international_price_per_person?: number | null
          is_published?: boolean | null
          itinerary_pdf_url?: string | null
          location?: string
          max_group_size?: number | null
          national_discount_percent?: number | null
          non_refundable_items?: string | null
          price_for_citizens?: number | null
          price_for_east_african?: number | null
          price_for_foreigners?: number | null
          price_per_person?: number
          pricing_tiers?: Json | null
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
          created_by: string | null
          currency: string | null
          from_location: string
          id: string
          is_published: boolean | null
          to_location: string
        }
        Insert: {
          base_price: number
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          from_location: string
          id?: string
          is_published?: boolean | null
          to_location: string
        }
        Update: {
          base_price?: number
          created_at?: string | null
          created_by?: string | null
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
          car_brand: string | null
          car_model: string | null
          car_type: Database["public"]["Enums"]["car_type"] | null
          car_year: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          daily_price: number | null
          drive_train: Database["public"]["Enums"]["drive_train_type"] | null
          driver_included: boolean | null
          exterior_images: Json | null
          fuel_type: Database["public"]["Enums"]["fuel_type"] | null
          id: string
          image_url: string | null
          insurance_document_url: string | null
          interior_images: Json | null
          is_approved: boolean | null
          is_published: boolean | null
          key_features: Json | null
          media: string[] | null
          monthly_price: number | null
          owner_identification_url: string | null
          price_per_day: number
          provider_name: string
          registration_document_url: string | null
          roadworthiness_certificate_url: string | null
          seats: number | null
          service_type:
            | Database["public"]["Enums"]["transport_service_type"]
            | null
          title: string
          transmission: Database["public"]["Enums"]["transmission_type"] | null
          updated_at: string | null
          vehicle_type: string | null
          weekly_price: number | null
        }
        Insert: {
          car_brand?: string | null
          car_model?: string | null
          car_type?: Database["public"]["Enums"]["car_type"] | null
          car_year?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          daily_price?: number | null
          drive_train?: Database["public"]["Enums"]["drive_train_type"] | null
          driver_included?: boolean | null
          exterior_images?: Json | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          image_url?: string | null
          insurance_document_url?: string | null
          interior_images?: Json | null
          is_approved?: boolean | null
          is_published?: boolean | null
          key_features?: Json | null
          media?: string[] | null
          monthly_price?: number | null
          owner_identification_url?: string | null
          price_per_day: number
          provider_name: string
          registration_document_url?: string | null
          roadworthiness_certificate_url?: string | null
          seats?: number | null
          service_type?:
            | Database["public"]["Enums"]["transport_service_type"]
            | null
          title: string
          transmission?: Database["public"]["Enums"]["transmission_type"] | null
          updated_at?: string | null
          vehicle_type?: string | null
          weekly_price?: number | null
        }
        Update: {
          car_brand?: string | null
          car_model?: string | null
          car_type?: Database["public"]["Enums"]["car_type"] | null
          car_year?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          daily_price?: number | null
          drive_train?: Database["public"]["Enums"]["drive_train_type"] | null
          driver_included?: boolean | null
          exterior_images?: Json | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          id?: string
          image_url?: string | null
          insurance_document_url?: string | null
          interior_images?: Json | null
          is_approved?: boolean | null
          is_published?: boolean | null
          key_features?: Json | null
          media?: string[] | null
          monthly_price?: number | null
          owner_identification_url?: string | null
          price_per_day?: number
          provider_name?: string
          registration_document_url?: string | null
          roadworthiness_certificate_url?: string | null
          seats?: number | null
          service_type?:
            | Database["public"]["Enums"]["transport_service_type"]
            | null
          title?: string
          transmission?: Database["public"]["Enums"]["transmission_type"] | null
          updated_at?: string | null
          vehicle_type?: string | null
          weekly_price?: number | null
        }
        Relationships: []
      }
      trip_cart_items: {
        Row: {
          created_at: string | null
          id: string
          item_type: string
          metadata: Json | null
          quantity: number | null
          reference_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_type: string
          metadata?: Json | null
          quantity?: number | null
          reference_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_type?: string
          metadata?: Json | null
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
      property_unavailable_dates: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string | null
          property_id: string | null
          reason: string | null
          source: string | null
          start_date: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_loyalty_points: {
        Args: {
          p_points: number
          p_reason: string
          p_reference_id?: string
          p_user_id: string
        }
        Returns: number
      }
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
      approve_host_application: {
        Args: { application_id: string; note?: string }
        Returns: undefined
      }
      become_host: { Args: never; Returns: boolean }
      close_inactive_tickets: { Args: never; Returns: number }
      delete_old_stories: { Args: never; Returns: undefined }
      generate_affiliate_code: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      get_blocked_dates: {
        Args: { p_property_id: string }
        Returns: {
          blocked_date: string
        }[]
      }
      get_staff_dashboard_metrics: { Args: never; Returns: Json }
      has_role: {
        Args: {
          check_role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_any_staff: { Args: { user_id?: string }; Returns: boolean }
      is_customer_support: { Args: { user_id?: string }; Returns: boolean }
      is_financial_staff: { Args: { user_id?: string }; Returns: boolean }
      is_operations_staff: { Args: { user_id?: string }; Returns: boolean }
      is_staff_or_admin: { Args: never; Returns: boolean }
      redeem_loyalty_points: {
        Args: {
          p_points: number
          p_reason: string
          p_reference_id?: string
          p_user_id: string
        }
        Returns: boolean
      }
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
      car_type:
        | "SUV"
        | "Sedan"
        | "Hatchback"
        | "Coupe"
        | "Wagon"
        | "Van"
        | "Minibus"
        | "Truck"
        | "Luxury"
      drive_train_type: "FWD" | "RWD" | "AWD" | "4WD"
      fuel_type: "Petrol" | "Diesel" | "Electric" | "Hybrid"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      payment_status_enum: "pending" | "paid" | "failed" | "refunded"
      transmission_type: "Automatic" | "Manual" | "Hybrid"
      transport_service_type:
        | "airport_transfer"
        | "car_rental"
        | "intracity_ride"
        | "intercity_ride"
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
      car_type: [
        "SUV",
        "Sedan",
        "Hatchback",
        "Coupe",
        "Wagon",
        "Van",
        "Minibus",
        "Truck",
        "Luxury",
      ],
      drive_train_type: ["FWD", "RWD", "AWD", "4WD"],
      fuel_type: ["Petrol", "Diesel", "Electric", "Hybrid"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      payment_status_enum: ["pending", "paid", "failed", "refunded"],
      transmission_type: ["Automatic", "Manual", "Hybrid"],
      transport_service_type: [
        "airport_transfer",
        "car_rental",
        "intracity_ride",
        "intercity_ride",
      ],
    },
  },
} as const
