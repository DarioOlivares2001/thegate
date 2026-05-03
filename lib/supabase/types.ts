export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          price: number;
          compare_at_price: number | null;
          cost_price: number | null;
          stock: number;
          images: string[];
          category: string | null;
          tags: string[];
          variants: Json | null;
          has_variants: boolean;
          options: Json | null;
          meta_title: string | null;
          meta_desc: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["products"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          title: string;
          option_values: Json;
          price: number;
          compare_at_price: number | null;
          cost_price: number | null;
          stock: number;
          image_url: string | null;
          badge_text: string | null;
          active: boolean;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["product_variants"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["product_variants"]["Insert"]>;
      };
      orders: {
        Row: {
          id: string;
          order_number: number;
          status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
          customer_name: string;
          customer_email: string;
          customer_phone: string | null;
          shipping_address: Json;
          items: Json;
          subtotal: number;
          shipping_cost: number;
          total: number;
          flow_token: string | null;
          flow_order: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["orders"]["Row"], "id" | "order_number" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          order_id: string | null;
          author_name: string;
          author_email: string | null;
          rating: number;
          comment: string | null;
          photo_url: string | null;
          verified: boolean;
          active: boolean;
          status: "pending" | "approved" | "rejected";
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["reviews"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>;
      };
      customers: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          phone: string | null;
          addresses: Json[];
          total_orders: number;
          total_spent: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["customers"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
      };
      clientes: {
        Row: {
          id: string;
          nombre: string;
          email: string;
          telefono: string | null;
          rut_numero: string | null;
          rut_dv: string | null;
          direccion: string | null;
          comuna: string | null;
          total_orders: number;
          total_spent: number;
          last_order_at: string | null;
          password_hash: string | null;
          registered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["clientes"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["clientes"]["Insert"]>;
      };
      store_settings: {
        Row: {
          id: string;
          store_name: string;
          store_tagline: string | null;
          logo_url: string | null;
          logo_square_url: string | null;
          favicon_url: string | null;
          brand_text_color: string;
          navbar_background_color: string;
          navbar_text_color: string;
          footer_background_color: string;
          footer_text_color: string;
          primary_color: string;
          accent_color: string;
          background_color: string;
          surface_color: string;
          text_color: string;
          text_muted_color: string;
          border_color: string;
          theme_preset: string;
          branding_mode: string;
          logo_size_desktop: number;
          logo_size_mobile: number;
          brand_text_scale: number;
          navbar_brand_position: string;
          navbar_menu_position: string;
          font_heading: string;
          font_body: string;
          theme_manual_override: boolean;
          support_whatsapp: string | null;
          contact_email: string | null;
          support_instagram: string | null;
          support_tiktok: string | null;
          enable_whatsapp_checkout: boolean;
          hero_banner_desktop_url: string | null;
          hero_banner_mobile_url: string | null;
          hero_overlay_opacity: number | null;
          hero_overlay_mode: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["store_settings"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["store_settings"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type Cliente = Database["public"]["Tables"]["clientes"]["Row"];
export type StoreSettings = Database["public"]["Tables"]["store_settings"]["Row"];

export interface ShippingAddress {
  street: string;
  city: string;
  region: string;
  zip: string;
}

export interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variant?: string;
}
