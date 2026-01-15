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
  { value: "tv_smart", label: "Smart TV", icon: Monitor },
  { value: "tv_basic", label: "Basic TV", icon: Tv },
  
  // Parking
  { value: "parking_free", label: "Free Parking", icon: ParkingCircle },
  { value: "parking_paid", label: "Paid Parking", icon: ParkingCircle },
  
  // Work & Storage
  { value: "workspace", label: "Dedicated Workspace", icon: Laptop },
  { value: "wardrobe", label: "Wardrobe", icon: Shirt },
  { value: "hangers", label: "Hangers", icon: Shirt },
  { value: "safe", label: "Safe", icon: Lock },
  
  // Climate Control
  { value: "ac", label: "Air Conditioning", icon: Thermometer },
  { value: "heating", label: "Heating", icon: Flame },
  { value: "fans", label: "Fans", icon: Fan },
  
  // Water & Bathroom
  { value: "hot_water", label: "Hot Water", icon: Droplets },
  { value: "toiletries", label: "Toiletries", icon: SprayCan },
  { value: "bathroom_essentials", label: "Bathroom Essentials", icon: ShowerHead },
  { value: "cleaning_items", label: "Cleaning Supplies", icon: SprayCan },
  
  // Bedding & Linens
  { value: "bedsheets_pillows", label: "Bed Linens & Pillows", icon: Bed },
  
  // Laundry
  { value: "washing_machine", label: "Washing Machine", icon: WashingMachine },
  { value: "dryer", label: "Dryer", icon: WashingMachine },
  { value: "iron", label: "Iron & Ironing Board", icon: Zap },
  
  // Kitchen & Dining
  { value: "kitchen", label: "Full Kitchen", icon: CookingPot },
  { value: "kitchenette", label: "Kitchenette", icon: CookingPot },
  { value: "refrigerator", label: "Refrigerator", icon: Refrigerator },
  { value: "microwave", label: "Microwave", icon: Microwave },
  { value: "stove", label: "Stove/Cooker", icon: Flame },
  { value: "oven", label: "Oven", icon: ChefHat },
  { value: "dishwasher", label: "Dishwasher", icon: Sparkles },
  { value: "cookware", label: "Cookware (Pots & Pans)", icon: CookingPot },
  { value: "dishes", label: "Dishes & Utensils", icon: GlassWater },
  { value: "dining_table", label: "Dining Table", icon: UtensilsCrossed },
  { value: "blender", label: "Blender", icon: Zap },
  { value: "kettle", label: "Electric Kettle", icon: Coffee },
  { value: "coffee_maker", label: "Coffee Maker", icon: Coffee },
  
  // Meals
  { value: "breakfast_included", label: "Breakfast Included", icon: UtensilsCrossed },
  { value: "breakfast_available", label: "Breakfast Available (Paid)", icon: UtensilsCrossed },
  
  // Fitness & Recreation
  { value: "gym", label: "Gym/Fitness Center", icon: Dumbbell },
  { value: "pool", label: "Swimming Pool", icon: Waves },
  { value: "spa", label: "Spa", icon: Sparkles },
  { value: "sauna", label: "Sauna", icon: Flame },
  { value: "jacuzzi", label: "Hot Tub/Jacuzzi", icon: Waves },
  
  // Safety & Security
  { value: "smoke_alarm", label: "Smoke Alarm", icon: CircleOff },
  { value: "carbon_monoxide_alarm", label: "Carbon Monoxide Alarm", icon: CircleOff },
  { value: "fire_extinguisher", label: "Fire Extinguisher", icon: Flame },
  { value: "first_aid", label: "First Aid Kit", icon: Plus },
  { value: "security_cameras", label: "Security Cameras (Exterior)", icon: Cctv },
  { value: "security_system", label: "Security System", icon: ShieldCheck },
  
  // Rules & Policies
  { value: "no_smoking", label: "No Smoking", icon: CigaretteOff },
  { value: "pets_allowed", label: "Pets Allowed", icon: Baby },
  
  // Views & Outdoor
  { value: "balcony", label: "Balcony", icon: Sunrise },
  { value: "patio", label: "Patio", icon: Sunrise },
  { value: "garden", label: "Garden", icon: Leaf },
  { value: "terrace", label: "Terrace", icon: Sunrise },
  { value: "city_view", label: "City View", icon: Building2 },
  { value: "mountain_view", label: "Mountain View", icon: Mountain },
  { value: "sea_view", label: "Sea/Ocean View", icon: Waves },
  { value: "lake_view", label: "Lake View", icon: Waves },
  { value: "landscape_view", label: "Landscape View", icon: TreePine },
  
  // Accessibility & Building Features
  { value: "elevator", label: "Elevator", icon: Building2 },
  { value: "wheelchair_accessible", label: "Wheelchair Accessible", icon: Accessibility },
  { value: "ground_floor", label: "Ground Floor Access", icon: Building2 },
  
  // Business & Services
  { value: "meeting_room", label: "Meeting Room", icon: Presentation },
  { value: "reception", label: "24/7 Reception", icon: Phone },
  { value: "concierge", label: "Concierge Service", icon: Phone },
  { value: "restaurant", label: "On-site Restaurant", icon: Utensils },
  { value: "room_service", label: "Room Service", icon: Utensils },
  
  // Family & Kids
  { value: "family_friendly", label: "Family Friendly", icon: Baby },
  { value: "crib", label: "Crib/Baby Bed", icon: Baby },
  { value: "high_chair", label: "High Chair", icon: Baby },
  
  // Other Amenities
  { value: "fireplace", label: "Fireplace", icon: Flame },
  { value: "air_purifier", label: "Air Purifier", icon: Leaf },
  { value: "soundproofing", label: "Soundproofing", icon: ShieldCheck },
];

export const amenityByValue = new Map(AMENITIES.map((a) => [a.value, a]));
