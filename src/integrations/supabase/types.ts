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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      attribute_values: {
        Row: {
          attribute_id: string
          color_hex: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          attribute_id: string
          color_hex?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          attribute_id?: string
          color_hex?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      attributes: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          min_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          min_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          min_order?: number
        }
        Relationships: []
      }
      leads: {
        Row: {
          budget: string | null
          category: string | null
          conversation: Json
          created_at: string
          for_self: boolean | null
          id: string
          interest: string | null
          name: string
          notes: string | null
          occasion: string | null
          page_url: string | null
          phone: string
          source: string
          status: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          budget?: string | null
          category?: string | null
          conversation?: Json
          created_at?: string
          for_self?: boolean | null
          id?: string
          interest?: string | null
          name: string
          notes?: string | null
          occasion?: string | null
          page_url?: string | null
          phone: string
          source?: string
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          budget?: string | null
          category?: string | null
          conversation?: Json
          created_at?: string
          for_self?: boolean | null
          id?: string
          interest?: string | null
          name?: string
          notes?: string | null
          occasion?: string | null
          page_url?: string | null
          phone?: string
          source?: string
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          color: string | null
          created_at: string
          id: string
          image: string | null
          order_id: string
          price: number
          product_id: string | null
          product_name: string
          product_slug: string | null
          qty: number
          size: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          image?: string | null
          order_id: string
          price: number
          product_id?: string | null
          product_name: string
          product_slug?: string | null
          qty: number
          size?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          image?: string | null
          order_id?: string
          price?: number
          product_id?: string | null
          product_name?: string
          product_slug?: string | null
          qty?: number
          size?: string | null
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
        ]
      }
      orders: {
        Row: {
          coupon_code: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          discount: number
          gst: number
          id: string
          notes: string | null
          order_number: string
          payment_method: string | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          shipping: number
          shipping_address: Json
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          discount?: number
          gst?: number
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping?: number
          shipping_address: Json
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          discount?: number
          gst?: number
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping?: number
          shipping_address?: Json
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          color: string | null
          created_at: string
          id: string
          image_url: string | null
          price: number | null
          product_id: string
          sale_price: number | null
          size: string
          sku: string | null
          status: string
          stock: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          price?: number | null
          product_id: string
          sale_price?: number | null
          size: string
          sku?: string | null
          status?: string
          stock?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          price?: number | null
          product_id?: string
          sale_price?: number | null
          size?: string
          sku?: string | null
          status?: string
          stock?: number
          updated_at?: string
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
          attributes: Json
          authenticity: string | null
          brand_id: string | null
          care_instructions: string[]
          category_id: string | null
          color: string | null
          colors: string[]
          created_at: string
          description: string
          dimensions: string | null
          featured: boolean
          id: string
          images: string[]
          is_bestseller: boolean
          is_new: boolean
          is_published: boolean
          low_stock_threshold: number
          name: string
          original_price: number
          price: number
          product_type: string
          rating: number
          rejection_reason: string | null
          reorder_level: number
          return_policy: string[]
          reviews: number
          shipping_info: string[]
          short_description: string | null
          sizes: string[]
          sku: string | null
          slug: string
          specifications: Json
          status: string
          stock: number
          submitted_by: string | null
          track_inventory: boolean
          updated_at: string
          video_url: string | null
          weight: number | null
        }
        Insert: {
          attributes?: Json
          authenticity?: string | null
          brand_id?: string | null
          care_instructions?: string[]
          category_id?: string | null
          color?: string | null
          colors?: string[]
          created_at?: string
          description?: string
          dimensions?: string | null
          featured?: boolean
          id?: string
          images?: string[]
          is_bestseller?: boolean
          is_new?: boolean
          is_published?: boolean
          low_stock_threshold?: number
          name: string
          original_price: number
          price: number
          product_type?: string
          rating?: number
          rejection_reason?: string | null
          reorder_level?: number
          return_policy?: string[]
          reviews?: number
          shipping_info?: string[]
          short_description?: string | null
          sizes?: string[]
          sku?: string | null
          slug: string
          specifications?: Json
          status?: string
          stock?: number
          submitted_by?: string | null
          track_inventory?: boolean
          updated_at?: string
          video_url?: string | null
          weight?: number | null
        }
        Update: {
          attributes?: Json
          authenticity?: string | null
          brand_id?: string | null
          care_instructions?: string[]
          category_id?: string | null
          color?: string | null
          colors?: string[]
          created_at?: string
          description?: string
          dimensions?: string | null
          featured?: boolean
          id?: string
          images?: string[]
          is_bestseller?: boolean
          is_new?: boolean
          is_published?: boolean
          low_stock_threshold?: number
          name?: string
          original_price?: number
          price?: number
          product_type?: string
          rating?: number
          rejection_reason?: string | null
          reorder_level?: number
          return_policy?: string[]
          reviews?: number
          shipping_info?: string[]
          short_description?: string | null
          sizes?: string[]
          sku?: string | null
          slug?: string
          specifications?: Json
          status?: string
          stock?: number
          submitted_by?: string | null
          track_inventory?: boolean
          updated_at?: string
          video_url?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_name: string
          body: string | null
          created_at: string
          id: string
          is_approved: boolean
          product_id: string
          rating: number
          title: string | null
          user_id: string | null
        }
        Insert: {
          author_name: string
          body?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          product_id: string
          rating: number
          title?: string | null
          user_id?: string | null
        }
        Update: {
          author_name?: string
          body?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          product_id?: string
          rating?: number
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          awb_code: string | null
          courier_company_id: number | null
          courier_name: string | null
          created_at: string
          error: string | null
          id: string
          invoice_url: string | null
          label_url: string | null
          last_tracking: Json | null
          manifest_url: string | null
          order_id: string
          pickup_scheduled_date: string | null
          pickup_token_number: string | null
          provider: string
          raw: Json | null
          sr_order_id: string | null
          sr_shipment_id: string | null
          status: string
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          awb_code?: string | null
          courier_company_id?: number | null
          courier_name?: string | null
          created_at?: string
          error?: string | null
          id?: string
          invoice_url?: string | null
          label_url?: string | null
          last_tracking?: Json | null
          manifest_url?: string | null
          order_id: string
          pickup_scheduled_date?: string | null
          pickup_token_number?: string | null
          provider?: string
          raw?: Json | null
          sr_order_id?: string | null
          sr_shipment_id?: string | null
          status?: string
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          awb_code?: string | null
          courier_company_id?: number | null
          courier_name?: string | null
          created_at?: string
          error?: string | null
          id?: string
          invoice_url?: string | null
          label_url?: string | null
          last_tracking?: Json | null
          manifest_url?: string | null
          order_id?: string
          pickup_scheduled_date?: string | null
          pickup_token_number?: string | null
          provider?: string
          raw?: Json | null
          sr_order_id?: string | null
          sr_shipment_id?: string | null
          status?: string
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_alerts: {
        Row: {
          acknowledged: boolean
          created_at: string
          id: string
          level: string
          product_id: string
          stock_at_alert: number
        }
        Insert: {
          acknowledged?: boolean
          created_at?: string
          id?: string
          level: string
          product_id: string
          stock_at_alert?: number
        }
        Update: {
          acknowledged?: boolean
          created_at?: string
          id?: string
          level?: string
          product_id?: string
          stock_at_alert?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_logs: {
        Row: {
          adjustment_type: string
          created_at: string
          id: string
          new_stock: number
          previous_stock: number
          product_id: string
          quantity: number
          reason: string | null
          user_id: string | null
          variation_id: string | null
        }
        Insert: {
          adjustment_type: string
          created_at?: string
          id?: string
          new_stock?: number
          previous_stock?: number
          product_id: string
          quantity: number
          reason?: string | null
          user_id?: string | null
          variation_id?: string | null
        }
        Update: {
          adjustment_type?: string
          created_at?: string
          id?: string
          new_stock?: number
          previous_stock?: number
          product_id?: string
          quantity?: number
          reason?: string | null
          user_id?: string | null
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_logs_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_approve: { Args: { _user_id: string }; Returns: boolean }
      dashboard_overview: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      dashboard_sales_trend: {
        Args: { _days: number }
        Returns: {
          day: string
          orders: number
          sales: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team_member: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "staff" | "customer" | "manager"
      order_status:
        | "pending"
        | "paid"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      payment_status: "unpaid" | "paid" | "failed" | "refunded"
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
    Enums: {
      app_role: ["admin", "staff", "customer", "manager"],
      order_status: [
        "pending",
        "paid",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      payment_status: ["unpaid", "paid", "failed", "refunded"],
    },
  },
} as const
