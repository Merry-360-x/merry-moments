import type { LucideIcon } from "lucide-react";
import {
  Wifi,
  Waves,
  ParkingCircle,
  Utensils,
  Dumbbell,
  Sparkles,
  Tv,
  WashingMachine,
  CookingPot,
  Cctv,
  ShieldCheck,
  CigaretteOff,
  Coffee,
  Leaf,
  Baby,
  Flame,
  Droplets,
  Monitor,
  Laptop,
  SprayCan,
  ShowerHead,
  Shirt,
  Lock,
  Thermometer,
  Fan,
  Refrigerator,
  Microwave,
  ChefHat,
  GlassWater,
  Zap,
  Mountain,
  Sunrise,
  TreePine,
  Building2,
  Accessibility,
  Presentation,
  Phone,
  Bed,
  UtensilsCrossed,
  Plus,
  CircleOff,
} from "lucide-react";

export type AmenityOption = {
  value: string; // stored in DB array
  label: string;
  icon: LucideIcon;
};

export const AMENITIES: AmenityOption[] = [
  // Connectivity & Entertainment
  { value: "wifi", label: "Wi-Fi", icon: Wifi },
  { value: "WiFi", label: "Wi-Fi", icon: Wifi },
  { value: "tv_smart", label: "TV (Smart)", icon: Monitor },
  { value: "tv_basic", label: "TV (Basic)", icon: Tv },
  { value: "TV", label: "TV", icon: Tv },
  
  // Parking
  { value: "parking_free", label: "Parking (Free)", icon: ParkingCircle },
  { value: "parking_paid", label: "Parking (Paid)", icon: ParkingCircle },
  { value: "Parking", label: "Free Parking", icon: ParkingCircle },
  
  // Work & Storage
  { value: "workspace", label: "Workspace", icon: Laptop },
  { value: "wardrobe", label: "Wardrobe", icon: Shirt },
  { value: "hangers", label: "Cloth Hangers", icon: Shirt },
  { value: "safe", label: "Safe Box", icon: Lock },
  
  // Climate
  { value: "ac", label: "Air Conditioner", icon: Thermometer },
  { value: "AC", label: "Air Conditioning", icon: Thermometer },
  { value: "Air conditioning", label: "Air Conditioning", icon: Thermometer },
  { value: "fans", label: "Fans", icon: Fan },
  
  // Water & Bathroom
  { value: "hot_water", label: "Hot Water", icon: Flame },
  { value: "Hot water", label: "Hot Water", icon: Flame },
  { value: "toiletries", label: "Toiletries", icon: SprayCan },
  { value: "bathroom_essentials", label: "Bathroom Essentials (Towel, Shower Gel, Shampoo)", icon: ShowerHead },
  { value: "cleaning_items", label: "Cleaning Items", icon: SprayCan },
  
  // Bedding
  { value: "bedsheets_pillows", label: "Bedsheets & Pillows", icon: Bed },
  
  // Laundry
  { value: "washing_machine", label: "Washing Machine", icon: WashingMachine },
  { value: "Washer", label: "Washer", icon: WashingMachine },
  { value: "nearby_laundry", label: "Nearby Laundry Place", icon: Sparkles },
  { value: "iron", label: "Iron", icon: Zap },
  
  // Kitchen & Dining
  { value: "kitchen_items", label: "Kitchen Items", icon: UtensilsCrossed },
  { value: "Kitchen", label: "Kitchen", icon: CookingPot },
  { value: "refrigerator", label: "Refrigerator", icon: Refrigerator },
  { value: "microwave", label: "Microwave", icon: Microwave },
  { value: "cooker", label: "Cooker", icon: Flame },
  { value: "oven", label: "Oven", icon: ChefHat },
  { value: "cooking_items", label: "Cooking Items (Pots, Pans, Spoons)", icon: CookingPot },
  { value: "dining_items", label: "Dining Items (Plates, Cups, Glasses)", icon: GlassWater },
  { value: "dining_table", label: "Dining Table", icon: UtensilsCrossed },
  { value: "blender", label: "Blender", icon: Zap },
  { value: "kettle", label: "Hot Water Kettle", icon: Coffee },
  { value: "coffee_maker", label: "Coffee Maker", icon: Coffee },
  
  // Meals
  { value: "breakfast_free", label: "Breakfast (Free)", icon: UtensilsCrossed },
  { value: "breakfast_paid", label: "Breakfast (Paid)", icon: UtensilsCrossed },
  { value: "Breakfast", label: "Breakfast", icon: Coffee },
  
  // Fitness & Wellness
  { value: "gym_free", label: "Gym (Free)", icon: Dumbbell },
  { value: "gym_paid", label: "Gym (Paid)", icon: Dumbbell },
  { value: "Gym", label: "Gym", icon: Dumbbell },
  { value: "pool", label: "Pool", icon: Waves },
  { value: "Pool", label: "Swimming Pool", icon: Waves },
  { value: "spa", label: "Spa", icon: Sparkles },
  { value: "Spa", label: "Spa", icon: Sparkles },
  
  // Safety
  { value: "carbon_monoxide_alarm", label: "Carbon Monoxide Alarm", icon: CircleOff },
  { value: "smoke_alarm", label: "Smoke Alarm", icon: CircleOff },
  { value: "security_cameras", label: "Security Cameras (Exterior)", icon: Cctv },
  { value: "Security cameras", label: "Security Cameras", icon: Cctv },
  { value: "Security", label: "Security", icon: ShieldCheck },
  { value: "fire_extinguisher", label: "Fire Extinguisher", icon: Flame },
  { value: "first_aid", label: "First Aid Items", icon: Plus },
  { value: "No smoking", label: "No Smoking", icon: CigaretteOff },
  
  // Views & Outdoor
  { value: "balcony", label: "Balcony", icon: Sunrise },
  { value: "city_view", label: "City View", icon: Building2 },
  { value: "landscape_view", label: "Landscape View", icon: TreePine },
  { value: "sea_view", label: "Sea View", icon: Waves },
  { value: "lake_view", label: "Lake View", icon: Waves },
  { value: "mountain_view", label: "Mountain View", icon: Mountain },
  { value: "Garden", label: "Garden", icon: Leaf },
  
  // Accessibility & Facilities
  { value: "elevator", label: "Elevator", icon: Building2 },
  { value: "wheelchair_accessible", label: "Wheelchair Accessible", icon: Accessibility },
  { value: "meeting_room", label: "Meeting Room", icon: Presentation },
  { value: "reception", label: "Reception", icon: Phone },
  
  // Legacy / Other
  { value: "Restaurant", label: "Restaurant", icon: Utensils },
  { value: "Family friendly", label: "Family Friendly", icon: Baby },
  { value: "Fireplace", label: "Fireplace", icon: Flame },
];

export const amenityByValue = new Map(AMENITIES.map((a) => [a.value, a]));
