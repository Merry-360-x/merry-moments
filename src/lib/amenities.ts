import type { LucideIcon } from "lucide-react";
import {
  Wifi,
  Waves,
  ParkingSquare,
  Utensils,
  Dumbbell,
  Sparkles,
  Snowflake,
  Tv,
  WashingMachine,
  Camera,
  ShieldCheck,
  CigaretteOff,
  Coffee,
  Leaf,
  Baby,
  Flame,
  Droplets,
} from "lucide-react";

export type AmenityOption = {
  value: string; // stored in DB array
  label: string;
  icon: LucideIcon;
};

export const AMENITIES: AmenityOption[] = [
  { value: "WiFi", label: "Wi‑Fi", icon: Wifi },
  { value: "Pool", label: "Swimming pool", icon: Waves },
  { value: "Parking", label: "Free parking", icon: ParkingSquare },
  { value: "Restaurant", label: "Restaurant", icon: Utensils },
  { value: "Gym", label: "Gym", icon: Dumbbell },
  { value: "Spa", label: "Spa", icon: Sparkles },
  { value: "Air conditioning", label: "Air conditioning", icon: Snowflake },
  { value: "TV", label: "TV", icon: Tv },
  { value: "Washer", label: "Washer", icon: WashingMachine },
  { value: "Security cameras", label: "Security cameras", icon: Camera },
  { value: "Security", label: "Security", icon: ShieldCheck },
  { value: "No smoking", label: "No smoking", icon: CigaretteOff },
  { value: "Breakfast", label: "Breakfast", icon: Coffee },
  { value: "Garden", label: "Garden", icon: Leaf },
  { value: "Family friendly", label: "Family friendly", icon: Baby },
  { value: "Fireplace", label: "Fireplace", icon: Flame },
  { value: "Hot water", label: "Hot water", icon: Droplets },
];

export const amenityByValue = new Map(AMENITIES.map((a) => [a.value, a]));

