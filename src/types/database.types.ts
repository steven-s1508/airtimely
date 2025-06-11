export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	public: {
		Tables: {
			chains: {
				Row: {
					created_at: string;
					id: string;
					logo_url: string | null;
					name: string;
					slug: string;
					updated_at: string;
					website: string | null;
				};
				Insert: {
					created_at?: string;
					id?: string;
					logo_url?: string | null;
					name: string;
					slug: string;
					updated_at?: string;
					website?: string | null;
				};
				Update: {
					created_at?: string;
					id?: string;
					logo_url?: string | null;
					name?: string;
					slug?: string;
					updated_at?: string;
					website?: string | null;
				};
				Relationships: [];
			};
			destinations: {
				Row: {
					chain_id: string | null;
					country_code: string | null;
					created_at: string;
					external_id: string | null;
					geocode_data: Json | null;
					id: string;
					latitude: number | null;
					longitude: number | null;
					name: string;
					name_override: string | null;
					slug: string;
					timezone: string | null;
					updated_at: string;
					website: string | null;
				};
				Insert: {
					chain_id?: string | null;
					country_code?: string | null;
					created_at?: string;
					external_id?: string | null;
					geocode_data?: Json | null;
					id: string;
					latitude?: number | null;
					longitude?: number | null;
					name: string;
					name_override?: string | null;
					slug: string;
					timezone?: string | null;
					updated_at?: string;
					website?: string | null;
				};
				Update: {
					chain_id?: string | null;
					country_code?: string | null;
					created_at?: string;
					external_id?: string | null;
					geocode_data?: Json | null;
					id?: string;
					latitude?: number | null;
					longitude?: number | null;
					name?: string;
					name_override?: string | null;
					slug?: string;
					timezone?: string | null;
					updated_at?: string;
					website?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "destinations_chain_id_fkey";
						columns: ["chain_id"];
						isOneToOne: false;
						referencedRelation: "chains";
						referencedColumns: ["id"];
					}
				];
			};
			park_operating_hours: {
				Row: {
					closing_time: string | null;
					created_at: string;
					date: string;
					id: string;
					opening_time: string | null;
					park_id: string;
					type: string;
					updated_at: string;
				};
				Insert: {
					closing_time?: string | null;
					created_at?: string;
					date: string;
					id?: string;
					opening_time?: string | null;
					park_id: string;
					type: string;
					updated_at?: string;
				};
				Update: {
					closing_time?: string | null;
					created_at?: string;
					date?: string;
					id?: string;
					opening_time?: string | null;
					park_id?: string;
					type?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "park_operating_hours_park_id_fkey";
						columns: ["park_id"];
						isOneToOne: false;
						referencedRelation: "parks";
						referencedColumns: ["id"];
					}
				];
			};
			parks: {
				Row: {
					country_code: string | null;
					created_at: string;
					destination_id: string | null;
					entity_type: string;
					external_id: string | null;
					geocode_data: Json | null;
					id: string;
					is_active: boolean;
					is_destination: boolean | null;
					latitude: number | null;
					longitude: number | null;
					name: string;
					name_override: string | null;
					rcdb_url: string | null;
					slug: string | null;
					timezone: string | null;
					updated_at: string;
				};
				Insert: {
					country_code?: string | null;
					created_at?: string;
					destination_id?: string | null;
					entity_type?: string;
					external_id?: string | null;
					geocode_data?: Json | null;
					id: string;
					is_active?: boolean;
					is_destination?: boolean | null;
					latitude?: number | null;
					longitude?: number | null;
					name: string;
					name_override?: string | null;
					rcdb_url?: string | null;
					slug?: string | null;
					timezone?: string | null;
					updated_at?: string;
				};
				Update: {
					country_code?: string | null;
					created_at?: string;
					destination_id?: string | null;
					entity_type?: string;
					external_id?: string | null;
					geocode_data?: Json | null;
					id?: string;
					is_active?: boolean;
					is_destination?: boolean | null;
					latitude?: number | null;
					longitude?: number | null;
					name?: string;
					name_override?: string | null;
					rcdb_url?: string | null;
					slug?: string | null;
					timezone?: string | null;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "parks_destination_id_fkey";
						columns: ["destination_id"];
						isOneToOne: false;
						referencedRelation: "destinations";
						referencedColumns: ["id"];
					}
				];
			};
			restaurants: {
				Row: {
					created_at: string;
					entity_type: string;
					external_id: string | null;
					id: string;
					is_active: boolean;
					latitude: number | null;
					longitude: number | null;
					name: string;
					park_id: string;
					slug: string | null;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					entity_type: string;
					external_id?: string | null;
					id: string;
					is_active?: boolean;
					latitude?: number | null;
					longitude?: number | null;
					name: string;
					park_id: string;
					slug?: string | null;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					entity_type?: string;
					external_id?: string | null;
					id?: string;
					is_active?: boolean;
					latitude?: number | null;
					longitude?: number | null;
					name?: string;
					park_id?: string;
					slug?: string | null;
					updated_at?: string;
				};
				Relationships: [];
			};
			ride_wait_times: {
				Row: {
					api_last_updated: string | null;
					created_at: string;
					id: string;
					raw_live_data: Json | null;
					recorded_at_timestamp: string;
					ride_id: string;
					showtimes_json: Json | null;
					single_rider_wait_time_minutes: number | null;
					status: string | null;
					wait_time_minutes: number | null;
				};
				Insert: {
					api_last_updated?: string | null;
					created_at?: string;
					id?: string;
					raw_live_data?: Json | null;
					recorded_at_timestamp: string;
					ride_id: string;
					showtimes_json?: Json | null;
					single_rider_wait_time_minutes?: number | null;
					status?: string | null;
					wait_time_minutes?: number | null;
				};
				Update: {
					api_last_updated?: string | null;
					created_at?: string;
					id?: string;
					raw_live_data?: Json | null;
					recorded_at_timestamp?: string;
					ride_id?: string;
					showtimes_json?: Json | null;
					single_rider_wait_time_minutes?: number | null;
					status?: string | null;
					wait_time_minutes?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: "ride_wait_times_ride_id_fkey";
						columns: ["ride_id"];
						isOneToOne: false;
						referencedRelation: "rides";
						referencedColumns: ["id"];
					}
				];
			};
			rides: {
				Row: {
					created_at: string;
					entity_type: string;
					external_id: string | null;
					id: string;
					is_active: boolean;
					latitude: number | null;
					longitude: number | null;
					name: string;
					park_id: string;
					slug: string | null;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					entity_type: string;
					external_id?: string | null;
					id: string;
					is_active?: boolean;
					latitude?: number | null;
					longitude?: number | null;
					name: string;
					park_id: string;
					slug?: string | null;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					entity_type?: string;
					external_id?: string | null;
					id?: string;
					is_active?: boolean;
					latitude?: number | null;
					longitude?: number | null;
					name?: string;
					park_id?: string;
					slug?: string | null;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "rides_park_id_fkey";
						columns: ["park_id"];
						isOneToOne: false;
						referencedRelation: "parks";
						referencedColumns: ["id"];
					}
				];
			};
			shows: {
				Row: {
					created_at: string;
					entity_type: string;
					external_id: string | null;
					id: string;
					is_active: boolean;
					latitude: number | null;
					longitude: number | null;
					name: string;
					park_id: string;
					slug: string | null;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					entity_type: string;
					external_id?: string | null;
					id: string;
					is_active?: boolean;
					latitude?: number | null;
					longitude?: number | null;
					name: string;
					park_id: string;
					slug?: string | null;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					entity_type?: string;
					external_id?: string | null;
					id?: string;
					is_active?: boolean;
					latitude?: number | null;
					longitude?: number | null;
					name?: string;
					park_id?: string;
					slug?: string | null;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "shows_park_id_fkey";
						columns: ["park_id"];
						isOneToOne: false;
						referencedRelation: "parks";
						referencedColumns: ["id"];
					}
				];
			};
		};
		Views: {
			displayable_destinations: {
				Row: {
					chain_id: string | null;
					country_code: string | null;
					entity_id: string | null;
					entity_type: string | null;
					latitude: number | null;
					longitude: number | null;
					name: string | null;
					original_destination_id: string | null;
					park_id: string | null;
					slug: string | null;
					timezone: string | null;
					website: string | null;
				};
				Relationships: [];
			};
		};
		Functions: {
			[_ in never]: never;
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
	DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof Database },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
		: never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
	? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
			Row: infer R;
	  }
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
	? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
			Row: infer R;
	  }
		? R
		: never
	: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof Database },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
	? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Insert: infer I;
	  }
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
	? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
			Insert: infer I;
	  }
		? I
		: never
	: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof Database },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
	? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Update: infer U;
	  }
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
	? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
			Update: infer U;
	  }
		? U
		: never
	: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof Database },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
		: never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database } ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName] : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions] : never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | { schema: keyof Database },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof Database;
	}
		? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
		: never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database } ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName] : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions] : never;

export const Constants = {
	public: {
		Enums: {},
	},
} as const;
