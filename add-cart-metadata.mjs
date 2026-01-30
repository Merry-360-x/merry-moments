import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addMetadataColumn() {
  console.log("Adding metadata column to trip_cart_items...");
  
  // Test if column already exists by trying to select it
  const { data, error } = await supabase
    .from("trip_cart_items")
    .select("metadata")
    .limit(1);
  
  if (error && error.message.includes("column")) {
    console.log("Column doesn't exist, needs to be added via Supabase dashboard");
    console.log("Please run this SQL in Supabase SQL editor:");
    console.log("ALTER TABLE trip_cart_items ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';");
  } else {
    console.log("✅ metadata column already exists or was created!");
    console.log("Data:", data);
  }
}

addMetadataColumn();
