import Foundation

enum MobileConfig {
    static let supabaseUrl = "https://uwgiostcetoxotfnulfm.supabase.co"
    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z2lvc3RjZXRveG90Zm51bGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNDAxMjgsImV4cCI6MjA4MzkxNjEyOH0.a3jDwpElRGICu7WvV3ahT0MCtmcUj4d9LO0KIHMSTtA"
    static let apiBaseUrl = "https://merry360x.com"

    static var isConfigured: Bool {
        !supabaseUrl.isEmpty && !supabaseAnonKey.isEmpty
    }
}
