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
  category?: string;
};

export type AmenityCategory = {
  name: string;
  items: AmenityOption[];
};

const allAmenities: AmenityOption[] = [
  // Connectivity & Entertainment
  { value: "wifi", label: "Wi-Fi", icon: Wifi, category: "Entertainment" },
  { value: "tv_smart", label: "Smart TV", icon: Monitor, category: "Entertainment" },
  { value: "tv_basic", label: "Basic TV", icon: Tv, category: "Entertainment" },
  
  // Parking
  { value: "parking_free", label: "Free Parking", icon: ParkingCircle, category: "Parking" },
  { value: "parking_paid", label: "Paid Parking", icon: ParkingCircle, category: "Parking" },
  
  // Work & Storage
  { value: "workspace", label: "Dedicated Workspace", icon: Laptop, category: "Work & Storage" },
  { value: "wardrobe", label: "Wardrobe", icon: Shirt, category: "Work & Storage" },
  { value: "hangers", label: "Hangers", icon: Shirt, category: "Work & Storage" },
  { value: "safe", label: "Safe", icon: Lock, category: "Work & Storage" },
  
  // Climate Control
  { value: "ac", label: "Air Conditioning", icon: Thermometer, category: "Climate Control" },
  { value: "heating", label: "Heating", icon: Flame, category: "Climate Control" },
  { value: "fans", label: "Fans", icon: Fan, category: "Climate Control" },
  
  // Water & Bathroom
  { value: "hot_water", label: "Hot Water", icon: Droplets, category: "Bathroom" },
  { value: "toiletries", label: "Toiletries", icon: SprayCan, category: "Bathroom" },
  { value: "bathroom_essentials", label: "Bathroom Essentials", icon: ShowerHead, category: "Bathroom" },
  { value: "cleaning_items", label: "Cleaning Supplies", icon: SprayCan, category: "Bathroom" },
  
  // Bedding & Linens
  { value: "bedsheets_pillows", label: "Bed Linens & Pillows", icon: Bed, category: "Bedroom" },
  
  // Laundry
  { value: "washing_machine", label: "Washing Machine", icon: WashingMachine, category: "Laundry" },
  { value: "dryer", label: "Dryer", icon: WashingMachine, category: "Laundry" },
  { value: "iron", label: "Iron & Ironing Board", icon: Zap, category: "Laundry" },
  
  // Kitchen & Dining
  { value: "kitchen", label: "Full Kitchen", icon: CookingPot, category: "Kitchen" },
  { value: "kitchenette", label: "Kitchenette", icon: CookingPot, category: "Kitchen" },
  { value: "refrigerator", label: "Refrigerator", icon: Refrigerator, category: "Kitchen" },
  { value: "microwave", label: "Microwave", icon: Microwave, category: "Kitchen" },
  { value: "stove", label: "Stove/Cooker", icon: Flame, category: "Kitchen" },
  { value: "oven", label: "Oven", icon: ChefHat, category: "Kitchen" },
  { value: "dishwasher", label: "Dishwasher", icon: Sparkles, category: "Kitchen" },
  { value: "cookware", label: "Cookware (Pots & Pans)", icon: CookingPot, category: "Kitchen" },
  { value: "dishes", label: "Dishes & Utensils", icon: GlassWater, category: "Kitchen" },
  { value: "dining_table", label: "Dining Table", icon: UtensilsCrossed, category: "Kitchen" },
  { value: "blender", label: "Blender", icon: Zap, category: "Kitchen" },
  { value: "kettle", label: "Electric Kettle", icon: Coffee, category: "Kitchen" },
  { value: "coffee_maker", label: "Coffee Maker", icon: Coffee, category: "Kitchen" },
  
  // Meals
  { value: "breakfast_included", label: "Breakfast Included", icon: UtensilsCrossed, category: "Meals" },
  { value: "breakfast_available", label: "Breakfast Available (Paid)", icon: UtensilsCrossed, category: "Meals" },
  
  // Fitness & Recreation
  { value: "gym", label: "Gym/Fitness Center", icon: Dumbbell, category: "Recreation" },
  { value: "pool", label: "Swimming Pool", icon: Waves, category: "Recreation" },
  { value: "spa", label: "Spa", icon: Sparkles, category: "Recreation" },
  { value: "sauna", label: "Sauna", icon: Flame, category: "Recreation" },
  { value: "jacuzzi", label: "Hot Tub/Jacuzzi", icon: Waves, category: "Recreation" },
  
  // Safety & Security
  { value: "smoke_alarm", label: "Smoke Alarm", icon: CircleOff, category: "Safety" },
  { value: "carbon_monoxide_alarm", label: "Carbon Monoxide Alarm", icon: CircleOff, category: "Safety" },
  { value: "fire_extinguisher", label: "Fire Extinguisher", icon: Flame, category: "Safety" },
  { value: "first_aid", label: "First Aid Kit", icon: Plus, category: "Safety" },
  { value: "security_cameras", label: "Security Cameras (Exterior)", icon: Cctv, category: "Safety" },
  { value: "security_system", label: "Security System", icon: ShieldCheck, category: "Safety" },
  
  // Rules & Policies
  { value: "no_smoking", label: "No Smoking", icon: CigaretteOff, category: "Rules" },
  { value: "pets_allowed", label: "Pets Allowed", icon: Baby, category: "Rules" },
  
  // Views & Outdoor
  { value: "balcony", label: "Balcony", icon: Sunrise, category: "Outdoor" },
  { value: "patio", label: "Patio", icon: Sunrise, category: "Outdoor" },
  { value: "garden", label: "Garden", icon: Leaf, category: "Outdoor" },
  { value: "terrace", label: "Terrace", icon: Sunrise, category: "Outdoor" },
  { value: "city_view", label: "City View", icon: Building2, category: "Views" },
  { value: "mountain_view", label: "Mountain View", icon: Mountain, category: "Views" },
  { value: "sea_view", label: "Sea/Ocean View", icon: Waves, category: "Views" },
  { value: "lake_view", label: "Lake View", icon: Waves, category: "Views" },
  { value: "landscape_view", label: "Landscape View", icon: TreePine, category: "Views" },
  
  // Accessibility & Building Features
  { value: "elevator", label: "Elevator", icon: Building2, category: "Accessibility" },
  { value: "wheelchair_accessible", label: "Wheelchair Accessible", icon: Accessibility, category: "Accessibility" },
  { value: "ground_floor", label: "Ground Floor Access", icon: Building2, category: "Accessibility" },
  
  // Business & Services
  { value: "meeting_room", label: "Meeting Room", icon: Presentation, category: "Services" },
  { value: "reception", label: "24/7 Reception", icon: Phone, category: "Services" },
  { value: "concierge", label: "Concierge Service", icon: Phone, category: "Services" },
  { value: "restaurant", label: "On-site Restaurant", icon: Utensils, category: "Services" },
  { value: "room_service", label: "Room Service", icon: Utensils, category: "Services" },
  
  // Family & Kids
  { value: "family_friendly", label: "Family Friendly", icon: Baby, category: "Family" },
  { value: "crib", label: "Crib/Baby Bed", icon: Baby, category: "Family" },
];

// Flat list for backward compatibility
export const AMENITIES = allAmenities;

// Grouped by category
export const AMENITIES_BY_CATEGORY: AmenityCategory[] = [
  {
    name: "Entertainment",
    items: allAmenities.filter(a => a.category === "Entertainment"),
  },
  {
    name: "Parking",
    items: allAmenities.filter(a => a.category === "Parking"),
  },
  {
    name: "Kitchen",
    items: allAmenities.filter(a => a.category === "Kitchen"),
  },
  {
    name: "Bathroom",
    items: allAmenities.filter(a => a.category === "Bathroom"),
  },
  {
    name: "Bedroom",
    items: allAmenities.filter(a => a.category === "Bedroom"),
  },
  {
    name: "Laundry",
    items: allAmenities.filter(a => a.category === "Laundry"),
  },
  {
    name: "Climate Control",
    items: allAmenities.filter(a => a.category === "Climate Control"),
  },
  {
    name: "Work & Storage",
    items: allAmenities.filter(a => a.category === "Work & Storage"),
  },
  {
    name: "Recreation",
    items: allAmenities.filter(a => a.category === "Recreation"),
  },
  {
    name: "Safety",
    items: allAmenities.filter(a => a.category === "Safety"),
  },
  {
    name: "Services",
    items: allAmenities.filter(a => a.category === "Services"),
  },
  {
    name: "Outdoor",
    items: allAmenities.filter(a => a.category === "Outdoor"),
  },
  {
    name: "Views",
    items: allAmenities.filter(a => a.category === "Views"),
  },
  {
    name: "Accessibility",
    items: allAmenities.filter(a => a.category === "Accessibility"),
  },
  {
    name: "Meals",
    items: allAmenities.filter(a => a.category === "Meals"),
  },
  {
    name: "Rules",
    items: allAmenities.filter(a => a.category === "Rules"),
  },
  {
    name: "Family",
    items: allAmenities.filter(a => a.category === "Family"),
  },
].filter(cat => cat.items.length > 0); // Only include categories with items
  { value: "high_chair", label: "High Chair", icon: Baby },
  
  // Other Amenities
  { value: "fireplace", label: "Fireplace", icon: Flame },
  { value: "air_purifier", label: "Air Purifier", icon: Leaf },
  { value: "soundproofing", label: "Soundproofing", icon: ShieldCheck },
];

export const amenityByValue = new Map(AMENITIES.map((a) => [a.value, a]));
