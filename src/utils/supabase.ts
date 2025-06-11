import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../types/database.types";

const supabaseUrl = "https://gjxoajueldjyuzcmqvlz.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqeG9hanVlbGRqeXV6Y21xdmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5NTU3MTUsImV4cCI6MjA2NDUzMTcxNX0.Ybtd0r51-XzlAGL5KX048vTfUMzYaMB6GseG7wrOUL8";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
	auth: {
		storage: AsyncStorage,
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: false,
	},
});
