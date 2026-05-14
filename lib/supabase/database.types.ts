import type {
  AiSettings,
  Appointment,
  Call,
  Company,
  CompanyUser,
  Lead,
} from "../types/database";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: Company;
        Insert: Omit<Company, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Company>;
        Relationships: [];
      };
      company_users: {
        Row: CompanyUser;
        Insert: Omit<CompanyUser, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<CompanyUser>;
        Relationships: [];
      };
      leads: {
        Row: Lead;
        Insert: Omit<Lead, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Lead>;
        Relationships: [];
      };
      calls: {
        Row: Call;
        Insert: Omit<Call, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Call>;
        Relationships: [];
      };
      appointments: {
        Row: Appointment;
        Insert: Omit<Appointment, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Appointment>;
        Relationships: [];
      };
      ai_settings: {
        Row: AiSettings;
        Insert: Omit<AiSettings, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<AiSettings>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_company_with_owner: {
        Args: { p_name: string; p_trade_type: string; p_phone: string };
        Returns: string;
      };
      join_company_by_invite: {
        Args: { p_invite_token: string };
        Returns: string;
      };
      seed_demo_for_my_company: {
        Args: { p_append?: boolean };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
