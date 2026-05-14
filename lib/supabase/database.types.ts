import type {
  AiSettings,
  Appointment,
  Call,
  CallInsert,
  Company,
  CompanyUser,
  Lead,
  LeadInsert,
} from "../types/database";

/** Must not be `[]` alone — TypeScript infers `never[]`, which breaks `.insert()` / `.update()` typing. */
type SupabaseRelationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: Company & Record<string, unknown>;
        Insert: Omit<Company, "id" | "created_at"> & { id?: string; created_at?: string } & Record<string, unknown>;
        Update: Partial<Company> & Record<string, unknown>;
        Relationships: SupabaseRelationship[];
      };
      company_users: {
        Row: CompanyUser & Record<string, unknown>;
        Insert: Omit<CompanyUser, "id" | "created_at"> & { id?: string; created_at?: string } & Record<string, unknown>;
        Update: Partial<CompanyUser> & Record<string, unknown>;
        Relationships: SupabaseRelationship[];
      };
      leads: {
        Row: Lead & Record<string, unknown>;
        Insert: LeadInsert & Record<string, unknown>;
        Update: Partial<Lead> & Record<string, unknown>;
        Relationships: SupabaseRelationship[];
      };
      calls: {
        Row: Call & Record<string, unknown>;
        Insert: CallInsert & Record<string, unknown>;
        Update: Partial<Call> & Record<string, unknown>;
        Relationships: SupabaseRelationship[];
      };
      appointments: {
        Row: Appointment & Record<string, unknown>;
        Insert: Omit<Appointment, "id" | "created_at"> & { id?: string; created_at?: string } & Record<string, unknown>;
        Update: Partial<Appointment> & Record<string, unknown>;
        Relationships: SupabaseRelationship[];
      };
      ai_settings: {
        Row: AiSettings & Record<string, unknown>;
        Insert: Omit<AiSettings, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        } & Record<string, unknown>;
        Update: Partial<AiSettings> & Record<string, unknown>;
        Relationships: SupabaseRelationship[];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_company_with_owner: {
        Args: Record<string, unknown>;
        Returns: string;
      };
      join_company_by_invite: {
        Args: Record<string, unknown>;
        Returns: string;
      };
      seed_demo_for_my_company: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
  };
};
