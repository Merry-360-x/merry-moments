import { Fragment, useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePreferences } from "@/hooks/usePreferences";
import { formatMoney } from "@/lib/money";
import { useTripCart, CartItemMetadata, getCartItemMetadata } from "@/hooks/useTripCart";
import { useFxRates } from "@/hooks/useFxRates";
import { convertAmount, PAYMENT_CURRENCIES, roundToCurrency } from "@/lib/fx";
import {
  calculateBookingFinancialsFromDiscountedListing,
  calculateGuestTotal,
  PLATFORM_FEES,
} from "@/lib/fees";
import { getFriendlyPaymentErrorMessage } from "@/lib/ui-errors";
import { clearQueuedPromoPrefillCode, readQueuedPromoPrefillCode } from "@/lib/promoPrefill";
import { 
  ArrowLeft, 
  ArrowRight, 
  ChevronDown,
  ChevronUp,
  CreditCard,
  Phone,
  Loader2,
  ShoppingBag,
  MapPin,
  Home,
  Car,
  Tag,
  Shield,
  AlertCircle,
  Smartphone,
  Building2,
  Clock,
  Mail,
  MessageCircle,
  X,
  Users,
  ExternalLink,
  LockKeyhole,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getTourBillingQuantity, getTourPerPersonUnitPrice, getTourPriceSuffix, getTourPricingModel } from "@/lib/tour-pricing";

interface CartItem {
  id: string;
  item_type: string;
  reference_id: string;
  quantity: number;
  title: string;
  price: number;
  currency: string;
  image?: string;
  meta?: string;
  metadata?: CartItemMetadata;
  weekly_discount?: number | null;
  monthly_discount?: number | null;
  transport_vehicle_id?: string | null;
}

type Step = 'details' | 'payment' | 'confirm';

const STEP_ORDER: Step[] = ['details', 'payment', 'confirm'];

// PawaPay supported payment methods by country
interface PaymentMethodInfo {
  id: string;
  name: string;
  shortName: string;
  provider: string;
  countryCode: string;
  country: string;
  currency: string;
  color: string;
  textColor: string;
}

interface SavedPaymentMethod {
  id: string;
  method_type: 'card' | 'mobile_money';
  provider: string;
  display_name: string | null;
  country_code: string | null;
  phone_number: string | null;
  card_brand: string | null;
  card_last4: string | null;
  card_expiry: string | null;
  fingerprint: string;
  is_default: boolean;
  is_active: boolean;
  last_used_at: string | null;
  metadata: Record<string, unknown> | null;
}

const PAWAPAY_METHODS: PaymentMethodInfo[] = [
  // Rwanda (+250) - RWF — MTN_MOMO_RWA, AIRTEL_RWA
  { id: 'mtn_rwa', name: 'MTN Mobile Money', shortName: 'MTN', provider: 'MTN', countryCode: '+250', country: 'Rwanda', currency: 'RWF', color: 'bg-yellow-400', textColor: 'text-black' },
  { id: 'airtel_rwa', name: 'Airtel Money', shortName: 'Airtel', provider: 'AIRTEL', countryCode: '+250', country: 'Rwanda', currency: 'RWF', color: 'bg-red-500', textColor: 'text-white' },
  
  // Kenya (+254) - KES — MPESA_KEN only
  { id: 'mpesa_ken', name: 'M-Pesa', shortName: 'M-Pesa', provider: 'MPESA', countryCode: '+254', country: 'Kenya', currency: 'KES', color: 'bg-green-500', textColor: 'text-white' },
  
  // Uganda (+256) - UGX — MTN_MOMO_UGA, AIRTEL_OAPI_UGA
  { id: 'mtn_uga', name: 'MTN Mobile Money', shortName: 'MTN', provider: 'MTN', countryCode: '+256', country: 'Uganda', currency: 'UGX', color: 'bg-yellow-400', textColor: 'text-black' },
  { id: 'airtel_uga', name: 'Airtel Money', shortName: 'Airtel', provider: 'AIRTEL', countryCode: '+256', country: 'Uganda', currency: 'UGX', color: 'bg-red-500', textColor: 'text-white' },
  
  // Zambia (+260) - ZMW — MTN_MOMO_ZMB, ZAMTEL_ZMB
  { id: 'mtn_zmb', name: 'MTN Mobile Money', shortName: 'MTN', provider: 'MTN', countryCode: '+260', country: 'Zambia', currency: 'ZMW', color: 'bg-yellow-400', textColor: 'text-black' },
  { id: 'zamtel_zmb', name: 'Zamtel Money', shortName: 'Zamtel', provider: 'ZAMTEL', countryCode: '+260', country: 'Zambia', currency: 'ZMW', color: 'bg-green-600', textColor: 'text-white' },

  // Tanzania (+255) - TZS — VODACOM_TZN, TIGO_TZN, AIRTEL_TZN
  { id: 'vodacom_tzn', name: 'Vodacom M-Pesa', shortName: 'M-Pesa', provider: 'VODACOM', countryCode: '+255', country: 'Tanzania', currency: 'TZS', color: 'bg-red-600', textColor: 'text-white' },
  { id: 'tigo_tzn', name: 'Tigo Pesa', shortName: 'Tigo', provider: 'TIGO', countryCode: '+255', country: 'Tanzania', currency: 'TZS', color: 'bg-blue-600', textColor: 'text-white' },
  { id: 'airtel_tzn', name: 'Airtel Money', shortName: 'Airtel', provider: 'AIRTEL', countryCode: '+255', country: 'Tanzania', currency: 'TZS', color: 'bg-red-500', textColor: 'text-white' },

  // Ghana (+233) - GHS — MTN_MOMO_GHA, VODAFONE_GHA
  { id: 'mtn_gha', name: 'MTN Mobile Money', shortName: 'MTN', provider: 'MTN', countryCode: '+233', country: 'Ghana', currency: 'GHS', color: 'bg-yellow-400', textColor: 'text-black' },
  { id: 'vodafone_gha', name: 'Vodafone Cash', shortName: 'Vodafone', provider: 'VODAFONE', countryCode: '+233', country: 'Ghana', currency: 'GHS', color: 'bg-red-600', textColor: 'text-white' },

  // DRC (+243) - CDF — VODACOM_MPESA_COD, AIRTEL_COD, ORANGE_COD
  { id: 'vodacom_cod', name: 'Vodacom M-Pesa', shortName: 'M-Pesa', provider: 'VODACOM', countryCode: '+243', country: 'DR Congo', currency: 'CDF', color: 'bg-red-600', textColor: 'text-white' },
  { id: 'airtel_cod', name: 'Airtel Money', shortName: 'Airtel', provider: 'AIRTEL', countryCode: '+243', country: 'DR Congo', currency: 'CDF', color: 'bg-red-500', textColor: 'text-white' },
  { id: 'orange_cod', name: 'Orange Money', shortName: 'Orange', provider: 'ORANGE', countryCode: '+243', country: 'DR Congo', currency: 'CDF', color: 'bg-orange-500', textColor: 'text-white' },

  // Cameroon (+237) - XAF — MTN_MOMO_CMR, ORANGE_CMR
  { id: 'mtn_cmr', name: 'MTN Mobile Money', shortName: 'MTN', provider: 'MTN', countryCode: '+237', country: 'Cameroon', currency: 'XAF', color: 'bg-yellow-400', textColor: 'text-black' },
  { id: 'orange_cmr', name: 'Orange Money', shortName: 'Orange', provider: 'ORANGE', countryCode: '+237', country: 'Cameroon', currency: 'XAF', color: 'bg-orange-500', textColor: 'text-white' },

  // Senegal (+221) - XOF — ORANGE_SEN, FREE_SEN
  { id: 'orange_sen', name: 'Orange Money', shortName: 'Orange', provider: 'ORANGE', countryCode: '+221', country: 'Senegal', currency: 'XOF', color: 'bg-orange-500', textColor: 'text-white' },
  { id: 'free_sen', name: 'Free Money', shortName: 'Free', provider: 'FREE', countryCode: '+221', country: 'Senegal', currency: 'XOF', color: 'bg-teal-500', textColor: 'text-white' },

  // Ivory Coast (+225) - XOF — MTN_MOMO_CIV, ORANGE_CIV
  { id: 'mtn_civ', name: 'MTN Mobile Money', shortName: 'MTN', provider: 'MTN', countryCode: '+225', country: 'Ivory Coast', currency: 'XOF', color: 'bg-yellow-400', textColor: 'text-black' },
  { id: 'orange_civ', name: 'Orange Money', shortName: 'Orange', provider: 'ORANGE', countryCode: '+225', country: 'Ivory Coast', currency: 'XOF', color: 'bg-orange-500', textColor: 'text-white' },

  // Mozambique (+258) - MZN — VODACOM_MOZ, MPESA_MOZ
  { id: 'vodacom_moz', name: 'Vodacom M-Pesa', shortName: 'M-Pesa', provider: 'VODACOM', countryCode: '+258', country: 'Mozambique', currency: 'MZN', color: 'bg-red-600', textColor: 'text-white' },

  // Malawi (+265) - MWK — AIRTEL_MWI, TNM_MWI
  { id: 'airtel_mwi', name: 'Airtel Money', shortName: 'Airtel', provider: 'AIRTEL', countryCode: '+265', country: 'Malawi', currency: 'MWK', color: 'bg-red-500', textColor: 'text-white' },
  { id: 'tnm_mwi', name: 'TNM Mpamba', shortName: 'TNM', provider: 'TNM', countryCode: '+265', country: 'Malawi', currency: 'MWK', color: 'bg-blue-500', textColor: 'text-white' },

  // Burundi (+257) - BIF — ECONET_BDI
  { id: 'econet_bdi', name: 'Econet Leo', shortName: 'Econet', provider: 'ECONET', countryCode: '+257', country: 'Burundi', currency: 'BIF', color: 'bg-blue-700', textColor: 'text-white' },

  // Congo-Brazzaville (+242) - XAF — MTN_MOMO_COG, AIRTEL_COG
  { id: 'mtn_cog', name: 'MTN Mobile Money', shortName: 'MTN', provider: 'MTN', countryCode: '+242', country: 'Congo', currency: 'XAF', color: 'bg-yellow-400', textColor: 'text-black' },
  { id: 'airtel_cog', name: 'Airtel Money', shortName: 'Airtel', provider: 'AIRTEL', countryCode: '+242', country: 'Congo', currency: 'XAF', color: 'bg-red-500', textColor: 'text-white' },
];

// Group methods by country
const METHODS_BY_COUNTRY = PAWAPAY_METHODS.reduce((acc, method) => {
  if (!acc[method.country]) {
    acc[method.country] = { countryCode: method.countryCode, currency: method.currency, methods: [] };
  }
  acc[method.country].methods.push(method);
  return acc;
}, {} as Record<string, { countryCode: string; currency: string; methods: PaymentMethodInfo[] }>);

// Country code to country name mapping for detection
const COUNTRY_BY_CODE: Record<string, string> = {
  '+250': 'Rwanda',
  '+256': 'Uganda',
  '+254': 'Kenya',
  '+260': 'Zambia',
  '+255': 'Tanzania',
  '+233': 'Ghana',
  '+243': 'DR Congo',
  '+237': 'Cameroon',
  '+221': 'Senegal',
  '+225': 'Ivory Coast',
  '+258': 'Mozambique',
  '+265': 'Malawi',
  '+257': 'Burundi',
  '+242': 'Congo',
};

const PAWAPAY_COUNTRY_BY_ISO: Record<string, string> = {
  RW: 'Rwanda',
  KE: 'Kenya',
  UG: 'Uganda',
  ZM: 'Zambia',
  TZ: 'Tanzania',
  GH: 'Ghana',
  CD: 'DR Congo',
  CM: 'Cameroon',
  SN: 'Senegal',
  CI: 'Ivory Coast',
  MZ: 'Mozambique',
  MW: 'Malawi',
  BI: 'Burundi',
  CG: 'Congo',
};

const normalizeDialCode = (value?: string | null) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? `+${digits}` : null;
};

const toLocalPhoneDigits = (value?: string | null, dialCode?: string | null) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";

  const normalizedDial = normalizeDialCode(dialCode);
  if (!normalizedDial) return digits;

  const dialDigits = normalizedDial.replace(/\D/g, "");
  if (digits.startsWith(dialDigits) && digits.length > dialDigits.length) {
    return digits.slice(dialDigits.length);
  }

  return digits;
};

const maskPhoneNumber = (value?: string | null) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 4) return digits;
  const visible = digits.slice(-4);
  const hidden = "•".repeat(Math.max(2, digits.length - 4));
  return `${hidden}${visible}`;
};

const BILLING_COUNTRY_OPTIONS = [
  { code: "AF", label: "Afghanistan" },
  { code: "AL", label: "Albania" },
  { code: "DZ", label: "Algeria" },
  { code: "AS", label: "American Samoa" },
  { code: "AD", label: "Andorra" },
  { code: "AO", label: "Angola" },
  { code: "AI", label: "Anguilla" },
  { code: "AQ", label: "Antarctica" },
  { code: "AG", label: "Antigua and Barbuda" },
  { code: "AR", label: "Argentina" },
  { code: "AM", label: "Armenia" },
  { code: "AW", label: "Aruba" },
  { code: "AU", label: "Australia" },
  { code: "AT", label: "Austria" },
  { code: "AZ", label: "Azerbaijan" },
  { code: "BS", label: "Bahamas" },
  { code: "BH", label: "Bahrain" },
  { code: "BD", label: "Bangladesh" },
  { code: "BB", label: "Barbados" },
  { code: "BY", label: "Belarus" },
  { code: "BE", label: "Belgium" },
  { code: "BZ", label: "Belize" },
  { code: "BJ", label: "Benin" },
  { code: "BM", label: "Bermuda" },
  { code: "BT", label: "Bhutan" },
  { code: "BO", label: "Bolivia" },
  { code: "BQ", label: "Bonaire, Sint Eustatius and Saba" },
  { code: "BA", label: "Bosnia and Herzegovina" },
  { code: "BW", label: "Botswana" },
  { code: "BV", label: "Bouvet Island" },
  { code: "BR", label: "Brazil" },
  { code: "IO", label: "British Indian Ocean Territory" },
  { code: "BN", label: "Brunei" },
  { code: "BG", label: "Bulgaria" },
  { code: "BF", label: "Burkina Faso" },
  { code: "BI", label: "Burundi" },
  { code: "CV", label: "Cabo Verde" },
  { code: "KH", label: "Cambodia" },
  { code: "CM", label: "Cameroon" },
  { code: "CA", label: "Canada" },
  { code: "KY", label: "Cayman Islands" },
  { code: "CF", label: "Central African Republic" },
  { code: "TD", label: "Chad" },
  { code: "CL", label: "Chile" },
  { code: "CN", label: "China" },
  { code: "CX", label: "Christmas Island" },
  { code: "CC", label: "Cocos (Keeling) Islands" },
  { code: "CO", label: "Colombia" },
  { code: "KM", label: "Comoros" },
  { code: "CG", label: "Congo" },
  { code: "CD", label: "Congo (DRC)" },
  { code: "CK", label: "Cook Islands" },
  { code: "CR", label: "Costa Rica" },
  { code: "CI", label: "Cote d'Ivoire" },
  { code: "HR", label: "Croatia" },
  { code: "CU", label: "Cuba" },
  { code: "CW", label: "Curacao" },
  { code: "CY", label: "Cyprus" },
  { code: "CZ", label: "Czechia" },
  { code: "DK", label: "Denmark" },
  { code: "DJ", label: "Djibouti" },
  { code: "DM", label: "Dominica" },
  { code: "DO", label: "Dominican Republic" },
  { code: "EC", label: "Ecuador" },
  { code: "EG", label: "Egypt" },
  { code: "SV", label: "El Salvador" },
  { code: "GQ", label: "Equatorial Guinea" },
  { code: "ER", label: "Eritrea" },
  { code: "EE", label: "Estonia" },
  { code: "SZ", label: "Eswatini" },
  { code: "ET", label: "Ethiopia" },
  { code: "FK", label: "Falkland Islands" },
  { code: "FO", label: "Faroe Islands" },
  { code: "FJ", label: "Fiji" },
  { code: "FI", label: "Finland" },
  { code: "FR", label: "France" },
  { code: "GF", label: "French Guiana" },
  { code: "PF", label: "French Polynesia" },
  { code: "TF", label: "French Southern Territories" },
  { code: "GA", label: "Gabon" },
  { code: "GM", label: "Gambia" },
  { code: "GE", label: "Georgia" },
  { code: "DE", label: "Germany" },
  { code: "GH", label: "Ghana" },
  { code: "GI", label: "Gibraltar" },
  { code: "GR", label: "Greece" },
  { code: "GL", label: "Greenland" },
  { code: "GD", label: "Grenada" },
  { code: "GP", label: "Guadeloupe" },
  { code: "GU", label: "Guam" },
  { code: "GT", label: "Guatemala" },
  { code: "GG", label: "Guernsey" },
  { code: "GN", label: "Guinea" },
  { code: "GW", label: "Guinea-Bissau" },
  { code: "GY", label: "Guyana" },
  { code: "HT", label: "Haiti" },
  { code: "HM", label: "Heard Island and McDonald Islands" },
  { code: "VA", label: "Holy See" },
  { code: "HN", label: "Honduras" },
  { code: "HK", label: "Hong Kong" },
  { code: "HU", label: "Hungary" },
  { code: "IS", label: "Iceland" },
  { code: "IN", label: "India" },
  { code: "ID", label: "Indonesia" },
  { code: "IR", label: "Iran" },
  { code: "IQ", label: "Iraq" },
  { code: "IE", label: "Ireland" },
  { code: "IM", label: "Isle of Man" },
  { code: "IL", label: "Israel" },
  { code: "IT", label: "Italy" },
  { code: "JM", label: "Jamaica" },
  { code: "JP", label: "Japan" },
  { code: "JE", label: "Jersey" },
  { code: "JO", label: "Jordan" },
  { code: "KZ", label: "Kazakhstan" },
  { code: "KE", label: "Kenya" },
  { code: "KI", label: "Kiribati" },
  { code: "KP", label: "Korea, North" },
  { code: "KR", label: "Korea, South" },
  { code: "KW", label: "Kuwait" },
  { code: "KG", label: "Kyrgyzstan" },
  { code: "LA", label: "Laos" },
  { code: "LV", label: "Latvia" },
  { code: "LB", label: "Lebanon" },
  { code: "LS", label: "Lesotho" },
  { code: "LR", label: "Liberia" },
  { code: "LY", label: "Libya" },
  { code: "LI", label: "Liechtenstein" },
  { code: "LT", label: "Lithuania" },
  { code: "LU", label: "Luxembourg" },
  { code: "MO", label: "Macao" },
  { code: "MG", label: "Madagascar" },
  { code: "MW", label: "Malawi" },
  { code: "MY", label: "Malaysia" },
  { code: "MV", label: "Maldives" },
  { code: "ML", label: "Mali" },
  { code: "MT", label: "Malta" },
  { code: "MH", label: "Marshall Islands" },
  { code: "MQ", label: "Martinique" },
  { code: "MR", label: "Mauritania" },
  { code: "MU", label: "Mauritius" },
  { code: "YT", label: "Mayotte" },
  { code: "MX", label: "Mexico" },
  { code: "FM", label: "Micronesia" },
  { code: "MD", label: "Moldova" },
  { code: "MC", label: "Monaco" },
  { code: "MN", label: "Mongolia" },
  { code: "ME", label: "Montenegro" },
  { code: "MS", label: "Montserrat" },
  { code: "MA", label: "Morocco" },
  { code: "MZ", label: "Mozambique" },
  { code: "MM", label: "Myanmar" },
  { code: "NA", label: "Namibia" },
  { code: "NR", label: "Nauru" },
  { code: "NP", label: "Nepal" },
  { code: "NL", label: "Netherlands" },
  { code: "NC", label: "New Caledonia" },
  { code: "NZ", label: "New Zealand" },
  { code: "NI", label: "Nicaragua" },
  { code: "NE", label: "Niger" },
  { code: "NG", label: "Nigeria" },
  { code: "NU", label: "Niue" },
  { code: "NF", label: "Norfolk Island" },
  { code: "MK", label: "North Macedonia" },
  { code: "MP", label: "Northern Mariana Islands" },
  { code: "NO", label: "Norway" },
  { code: "OM", label: "Oman" },
  { code: "PK", label: "Pakistan" },
  { code: "PW", label: "Palau" },
  { code: "PS", label: "Palestine" },
  { code: "PA", label: "Panama" },
  { code: "PG", label: "Papua New Guinea" },
  { code: "PY", label: "Paraguay" },
  { code: "PE", label: "Peru" },
  { code: "PH", label: "Philippines" },
  { code: "PN", label: "Pitcairn" },
  { code: "PL", label: "Poland" },
  { code: "PT", label: "Portugal" },
  { code: "PR", label: "Puerto Rico" },
  { code: "QA", label: "Qatar" },
  { code: "RE", label: "Reunion" },
  { code: "RO", label: "Romania" },
  { code: "RU", label: "Russia" },
  { code: "RW", label: "Rwanda" },
  { code: "BL", label: "Saint Barthelemy" },
  { code: "SH", label: "Saint Helena, Ascension and Tristan da Cunha" },
  { code: "KN", label: "Saint Kitts and Nevis" },
  { code: "LC", label: "Saint Lucia" },
  { code: "MF", label: "Saint Martin" },
  { code: "PM", label: "Saint Pierre and Miquelon" },
  { code: "VC", label: "Saint Vincent and the Grenadines" },
  { code: "WS", label: "Samoa" },
  { code: "SM", label: "San Marino" },
  { code: "ST", label: "Sao Tome and Principe" },
  { code: "SA", label: "Saudi Arabia" },
  { code: "SN", label: "Senegal" },
  { code: "RS", label: "Serbia" },
  { code: "SC", label: "Seychelles" },
  { code: "SL", label: "Sierra Leone" },
  { code: "SG", label: "Singapore" },
  { code: "SX", label: "Sint Maarten" },
  { code: "SK", label: "Slovakia" },
  { code: "SI", label: "Slovenia" },
  { code: "SB", label: "Solomon Islands" },
  { code: "SO", label: "Somalia" },
  { code: "ZA", label: "South Africa" },
  { code: "GS", label: "South Georgia and the South Sandwich Islands" },
  { code: "SS", label: "South Sudan" },
  { code: "ES", label: "Spain" },
  { code: "LK", label: "Sri Lanka" },
  { code: "SD", label: "Sudan" },
  { code: "SR", label: "Suriname" },
  { code: "SJ", label: "Svalbard and Jan Mayen" },
  { code: "SE", label: "Sweden" },
  { code: "CH", label: "Switzerland" },
  { code: "SY", label: "Syria" },
  { code: "TW", label: "Taiwan" },
  { code: "TJ", label: "Tajikistan" },
  { code: "TZ", label: "Tanzania" },
  { code: "TH", label: "Thailand" },
  { code: "TL", label: "Timor-Leste" },
  { code: "TG", label: "Togo" },
  { code: "TK", label: "Tokelau" },
  { code: "TO", label: "Tonga" },
  { code: "TT", label: "Trinidad and Tobago" },
  { code: "TN", label: "Tunisia" },
  { code: "TR", label: "Turkiye" },
  { code: "TM", label: "Turkmenistan" },
  { code: "TC", label: "Turks and Caicos Islands" },
  { code: "TV", label: "Tuvalu" },
  { code: "UG", label: "Uganda" },
  { code: "UA", label: "Ukraine" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "GB", label: "United Kingdom" },
  { code: "US", label: "United States" },
  { code: "UM", label: "United States Minor Outlying Islands" },
  { code: "UY", label: "Uruguay" },
  { code: "UZ", label: "Uzbekistan" },
  { code: "VU", label: "Vanuatu" },
  { code: "VE", label: "Venezuela" },
  { code: "VN", label: "Vietnam" },
  { code: "VG", label: "Virgin Islands, British" },
  { code: "VI", label: "Virgin Islands, U.S." },
  { code: "WF", label: "Wallis and Futuna" },
  { code: "EH", label: "Western Sahara" },
  { code: "YE", label: "Yemen" },
  { code: "ZM", label: "Zambia" },
  { code: "ZW", label: "Zimbabwe" },
];

const CARD_BRAND_LOGOS = [
  { src: "/payment-icons/visa.svg", alt: "Visa" },
  { src: "/payment-icons/mastercard.svg", alt: "Mastercard" },
  { src: "/payment-icons/amex.svg", alt: "American Express" },
];

export default function CheckoutNew() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { currency: preferredCurrency, setCurrency, detectedCountry } = usePreferences();
  const { guestCart, clearCart } = useTripCart();
  const { usdRates } = useFxRates();
  
  // Map detected country ISO code → default payment method + country code
  const geoDefaults = useMemo(() => {
    const map: Record<string, { method: string; code: string }> = {
      RW: { method: 'mtn_rwa', code: '+250' },
      KE: { method: 'mpesa_ken', code: '+254' },
      UG: { method: 'mtn_uga', code: '+256' },
      ZM: { method: 'mtn_zmb', code: '+260' },
      TZ: { method: 'vodacom_tzn', code: '+255' },
      GH: { method: 'mtn_gha', code: '+233' },
      CD: { method: 'vodacom_cod', code: '+243' },
      CM: { method: 'mtn_cmr', code: '+237' },
      SN: { method: 'orange_sen', code: '+221' },
      CI: { method: 'mtn_civ', code: '+225' },
      MZ: { method: 'vodacom_moz', code: '+258' },
      MW: { method: 'airtel_mwi', code: '+265' },
      BI: { method: 'econet_bdi', code: '+257' },
      CG: { method: 'mtn_cog', code: '+242' },
    };
    return map[detectedCountry || ''] ?? null;
  }, [detectedCountry]);

  // Countries with PawaPay mobile money support
  const AFRICAN_PAWAPAY_COUNTRIES = new Set([
    'RW', 'KE', 'UG', 'ZM', 'TZ', 'GH', 'CD', 'CM',
    'SN', 'CI', 'MZ', 'MW', 'BI', 'CG',
  ]);
  const isAfricanRegion = detectedCountry ? AFRICAN_PAWAPAY_COUNTRIES.has(detectedCountry.toUpperCase()) : null;

  // State
  const [currentStep, setCurrentStep] = useState<Step>('details');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<'group' | 'individual'>('group');
  const checkoutStepTopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const anchor = checkoutStepTopRef.current;
      if (!anchor) {
        window.scrollTo({ top: 0, behavior: 'auto' });
        return;
      }

      const top = anchor.getBoundingClientRect().top + window.scrollY - 10;
      window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentStep]);
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    notes: "",
    billingAddress1: "",
    billingAddress2: "",
    billingCity: "",
    billingState: "",
    billingPostalCode: "",
    billingCountry: "RW",
  });

  const checkoutDraftKey = `checkout-draft-${user?.id || "guest"}`;
  
  // Payment state — defaults from geo-detection
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState(geoDefaults?.code ?? '+250');
  const [paymentMethod, setPaymentMethod] = useState<string>(geoDefaults?.method ?? 'card');
  const [geoApplied, setGeoApplied] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const [lastMobileMethod, setLastMobileMethod] = useState<string>(geoDefaults?.method ?? 'mtn_rwa');
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [savedMethodsLoading, setSavedMethodsLoading] = useState(false);
  const [selectedSavedMethodId, setSelectedSavedMethodId] = useState<string | null>(null);
  const [savedDefaultsApplied, setSavedDefaultsApplied] = useState(false);
  const mode = searchParams.get("mode");
  const isDirectPropertyCheckout = mode === "booking" && Boolean(searchParams.get("propertyId"));
  const checkInParam = searchParams.get("checkIn") || "";
  const checkOutParam = searchParams.get("checkOut") || "";
  const guestContactCacheKey = "checkout-contact-cache";

  const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

  const formatDateOnlyLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const parseDateValue = (value?: string | null) => {
    if (!value) return null;

    if (DATE_ONLY_PATTERN.test(value)) {
      const [yearText, monthText, dayText] = value.split("-");
      const year = Number(yearText);
      const month = Number(monthText);
      const day = Number(dayText);
      const parsed = new Date(year, month - 1, day);
      parsed.setHours(0, 0, 0, 0);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const addDaysToDateOnly = (dateOnly: string, days: number) => {
    const parsed = parseDateValue(dateOnly);
    if (!parsed) return dateOnly;
    parsed.setDate(parsed.getDate() + days);
    return formatDateOnlyLocal(parsed);
  };

  const updateCheckoutDates = (nextCheckIn: string, nextCheckOut: string) => {
    if (!nextCheckIn || !nextCheckOut) return;
    const start = parseDateValue(nextCheckIn);
    const end = parseDateValue(nextCheckOut);
    if (!start || !end || end <= start) {
      toast({
        title: "Invalid dates",
        description: "Check-out must be after check-in.",
        variant: "destructive",
      });
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("checkIn", nextCheckIn);
    nextParams.set("checkOut", nextCheckOut);
    setSearchParams(nextParams, { replace: true });
  };

  const [draftStayDates, setDraftStayDates] = useState({
    checkIn: checkInParam,
    checkOut: checkOutParam,
  });

  useEffect(() => {
    setDraftStayDates({
      checkIn: checkInParam,
      checkOut: checkOutParam,
    });
  }, [checkInParam, checkOutParam]);

  const commitDraftStayDates = (nextDraft = draftStayDates) => {
    if (!isDirectPropertyCheckout) return;

    const nextCheckIn = nextDraft.checkIn;
    const nextCheckOut = nextDraft.checkOut;
    if (!nextCheckIn || !nextCheckOut) return;
    if (nextCheckIn === checkInParam && nextCheckOut === checkOutParam) return;

    updateCheckoutDates(nextCheckIn, nextCheckOut);
  };

  const stayDatesDirty =
    isDirectPropertyCheckout &&
    (draftStayDates.checkIn !== checkInParam || draftStayDates.checkOut !== checkOutParam);

  const stayDatesValid = (() => {
    if (!draftStayDates.checkIn || !draftStayDates.checkOut) return false;
    const start = parseDateValue(draftStayDates.checkIn);
    const end = parseDateValue(draftStayDates.checkOut);
    return Boolean(start && end && end > start);
  })();

  // When geo-detection resolves, update payment defaults (only once, before user interacts)
  useEffect(() => {
    if (detectedCountry && !geoApplied) {
      if (geoDefaults) {
        // African PawaPay country — default to local mobile money
        setCountryCode(geoDefaults.code);
        setPaymentMethod(geoDefaults.method);
        setLastMobileMethod(geoDefaults.method);
      } else {
        // Outside Africa — default to card payment
        setPaymentMethod('card');
      }
      setGeoApplied(true);
    }
  }, [detectedCountry, geoDefaults, geoApplied]);

  useEffect(() => {
    if (!detectedCountry) return;
    const detected = detectedCountry.toUpperCase();
    if (!/^[A-Z]{2}$/.test(detected)) return;
    setFormData((prev) => {
      if (prev.billingCountry && prev.billingCountry.trim().length > 0) return prev;
      return { ...prev, billingCountry: detected };
    });
  }, [detectedCountry]);
  
  // Legal acknowledgment
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedCancellation, setAcceptedCancellation] = useState(false);
  const [acceptedAdult, setAcceptedAdult] = useState(false);
  const [profileAdultConfirmed, setProfileAdultConfirmed] = useState(false);
  
  // Discount
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);

  const clearCheckoutDraft = () => {
    localStorage.removeItem(checkoutDraftKey);
  };

  const hasCheckoutDraftContent =
    Boolean(
      formData.fullName.trim() ||
      formData.email.trim() ||
      formData.notes.trim() ||
      phoneNumber.trim()
    );

  // Load user data
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || "",
      }));
      
      // Fetch profile for full name and phone
      ((supabase
        .from("profiles")
        .select("full_name, phone, is_adult_confirmed") as any)
        .eq("user_id", user.id)
        .maybeSingle())
        .then(({ data, error }: any) => {
          if (error) {
            console.warn("Could not load profile:", error.message);
            return;
          }
          if (data) {
            setFormData(prev => ({
              ...prev,
              fullName: data.full_name || "",
            }));

            const adultConfirmed = data.is_adult_confirmed === true;
            setProfileAdultConfirmed(adultConfirmed);
            if (adultConfirmed) {
              setAcceptedAdult(true);
            }
            if (data.phone) {
              // Parse phone number
              const match = data.phone.match(/^(\+\d{1,3})(.*)$/);
              if (match) {
                setCountryCode(match[1]);
                setPhoneNumber(match[2]);
              } else {
                setPhoneNumber(data.phone);
              }
            }
            
            // If all user details are pre-filled and we have cart items, enable fast checkout
            if (data.full_name && user.email && data.phone) {
              // Auto-fill indicates user can skip to payment for faster checkout
              console.log("✅ User details pre-filled - fast checkout enabled");
            }
          }
        });
    }
  }, [user]);

  useEffect(() => {
    let isActive = true;

    if (!user?.id) {
      setSavedPaymentMethods([]);
      setSelectedSavedMethodId(null);
      setSavedMethodsLoading(false);
      setSavedDefaultsApplied(false);
      return () => {
        isActive = false;
      };
    }

    setSavedMethodsLoading(true);

    ((supabase
      .from("user_payment_methods")
      .select(
        "id, method_type, provider, display_name, country_code, phone_number, card_brand, card_last4, card_expiry, fingerprint, is_default, is_active, last_used_at, metadata"
      ) as any)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .order("last_used_at", { ascending: false }))
      .then(({ data, error }: any) => {
        if (!isActive) return;

        if (error) {
          console.warn("Could not load saved payment methods:", error.message);
          setSavedPaymentMethods([]);
          setSavedMethodsLoading(false);
          setSavedDefaultsApplied(true);
          return;
        }

        setSavedPaymentMethods(Array.isArray(data) ? data : []);
        setSavedMethodsLoading(false);
        setSavedDefaultsApplied(false);
      });

    return () => {
      isActive = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (user) return;

    const cached = localStorage.getItem(guestContactCacheKey);
    if (!cached) return;

    try {
      const parsed = JSON.parse(cached);
      const cachedFullName = typeof parsed?.fullName === "string" ? parsed.fullName : "";
      const cachedEmail = typeof parsed?.email === "string" ? parsed.email : "";
      const cachedCountryCode = typeof parsed?.countryCode === "string" ? parsed.countryCode : "";
      const cachedPhoneNumber = typeof parsed?.phoneNumber === "string" ? parsed.phoneNumber : "";
      const cachedBillingAddress1 = typeof parsed?.billingAddress1 === "string" ? parsed.billingAddress1 : "";
      const cachedBillingAddress2 = typeof parsed?.billingAddress2 === "string" ? parsed.billingAddress2 : "";
      const cachedBillingCity = typeof parsed?.billingCity === "string" ? parsed.billingCity : "";
      const cachedBillingState = typeof parsed?.billingState === "string" ? parsed.billingState : "";
      const cachedBillingPostalCode = typeof parsed?.billingPostalCode === "string" ? parsed.billingPostalCode : "";
      const cachedBillingCountry = typeof parsed?.billingCountry === "string" ? parsed.billingCountry : "";

      if (cachedFullName || cachedEmail) {
        setFormData((prev) => ({
          ...prev,
          fullName: prev.fullName || cachedFullName,
          email: prev.email || cachedEmail,
          billingAddress1: prev.billingAddress1 || cachedBillingAddress1,
          billingAddress2: prev.billingAddress2 || cachedBillingAddress2,
          billingCity: prev.billingCity || cachedBillingCity,
          billingState: prev.billingState || cachedBillingState,
          billingPostalCode: prev.billingPostalCode || cachedBillingPostalCode,
          billingCountry: prev.billingCountry || cachedBillingCountry || prev.billingCountry,
        }));
      }
      if (cachedCountryCode) setCountryCode((prev) => prev || cachedCountryCode);
      if (cachedPhoneNumber) setPhoneNumber((prev) => prev || cachedPhoneNumber);
    } catch (error) {
      console.warn("Failed to restore guest contact cache", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) return;
    if (!formData.fullName.trim() && !formData.email.trim() && !phoneNumber.trim()) return;

    localStorage.setItem(
      guestContactCacheKey,
      JSON.stringify({
        fullName: formData.fullName,
        email: formData.email,
        countryCode,
        phoneNumber,
        billingAddress1: formData.billingAddress1,
        billingAddress2: formData.billingAddress2,
        billingCity: formData.billingCity,
        billingState: formData.billingState,
        billingPostalCode: formData.billingPostalCode,
        billingCountry: formData.billingCountry,
        updatedAt: new Date().toISOString(),
      })
    );
  }, [
    user,
    formData.fullName,
    formData.email,
    formData.billingAddress1,
    formData.billingAddress2,
    formData.billingCity,
    formData.billingState,
    formData.billingPostalCode,
    formData.billingCountry,
    countryCode,
    phoneNumber,
  ]);

  const launchSecureCardCheckout = async (redirectUrl: string, checkoutId: string) => {
    await clearCart();
    localStorage.removeItem("applied_discount");
    clearCheckoutDraft();

    const handoffStateKey = `secure-card-handoff:${checkoutId}`;
    sessionStorage.setItem(
      handoffStateKey,
      JSON.stringify({
        redirectUrl,
        checkoutId,
        createdAt: new Date().toISOString(),
      })
    );

    navigate(`/secure-card-handoff?checkoutId=${encodeURIComponent(checkoutId)}`);
  };

  const loadFlutterwaveInlineSdk = async () => {
    if ((window as any).FlutterwaveCheckout) return;

    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[data-flutterwave-sdk="true"]') as HTMLScriptElement | null;
      if (existing) {
        // Script already in DOM — if it finished loading, FlutterwaveCheckout will be set momentarily
        if (existing.dataset.loaded === 'true') { resolve(); return; }
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Failed to load payment SDK")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.flutterwave.com/v3.js";
      script.async = true;
      script.dataset.flutterwaveSdk = "true";
      script.onload = () => { script.dataset.loaded = 'true'; resolve(); };
      script.onerror = () => reject(new Error("Failed to load payment SDK"));
      document.head.appendChild(script);
    });
  };

  useEffect(() => {
    const savedDraft = localStorage.getItem(checkoutDraftKey);
    if (!savedDraft) return;

    try {
      const parsed = JSON.parse(savedDraft);
      if (parsed?.formData) {
        setFormData((prev) => ({
          ...prev,
          ...parsed.formData,
        }));
      }
      if (typeof parsed?.phoneNumber === "string") setPhoneNumber(parsed.phoneNumber);
      if (typeof parsed?.countryCode === "string") setCountryCode(parsed.countryCode);
      if (typeof parsed?.paymentMethod === "string") setPaymentMethod(parsed.paymentMethod);
      if (typeof parsed?.selectedSavedMethodId === "string") setSelectedSavedMethodId(parsed.selectedSavedMethodId);
    } catch (error) {
      console.warn("Failed to restore checkout draft", error);
    }
  }, [checkoutDraftKey]);

  useEffect(() => {
    if (!hasCheckoutDraftContent) return;

    const timer = setTimeout(() => {
      const draft = {
        formData,
        phoneNumber,
        countryCode,
        paymentMethod,
        selectedSavedMethodId,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(checkoutDraftKey, JSON.stringify(draft));
    }, 600);

    return () => clearTimeout(timer);
  }, [formData, phoneNumber, countryCode, paymentMethod, selectedSavedMethodId, checkoutDraftKey, hasCheckoutDraftContent]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!hasCheckoutDraftContent) return;

      const draft = {
        formData,
        phoneNumber,
        countryCode,
        paymentMethod,
        selectedSavedMethodId,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(checkoutDraftKey, JSON.stringify(draft));
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [formData, phoneNumber, countryCode, paymentMethod, selectedSavedMethodId, checkoutDraftKey, hasCheckoutDraftContent]);

  // Load discount from localStorage or URL
  useEffect(() => {
    let cancelled = false;

    const discountCode = searchParams.get("discountCode");
    const savedDiscount = localStorage.getItem("applied_discount");
    const queuedPromoCode = readQueuedPromoPrefillCode();
    const bootstrapCode = discountCode || queuedPromoCode;
    
    if (bootstrapCode) {
      const normalizedCode = bootstrapCode.toUpperCase().trim();
      setDiscountCodeInput(normalizedCode);

      // Validate discount code from URL or queued promo prefill
      ((supabase
        .from("discount_codes")
        .select("*") as any)
        .eq("code", normalizedCode)
        .eq("is_active", true)
        .single())
        .then(({ data }: any) => {
          if (cancelled || !data) return;
          setAppliedDiscount(data);
          localStorage.setItem("applied_discount", JSON.stringify(data));
          clearQueuedPromoPrefillCode();
        });
    } else if (savedDiscount) {
      try {
        const parsed = JSON.parse(savedDiscount);
        setAppliedDiscount(parsed);
        if (parsed?.code) {
          setDiscountCodeInput(String(parsed.code).toUpperCase());
        }
      } catch {
        localStorage.removeItem("applied_discount");
      }
    }

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  // Fetch cart items
  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ["checkout_cart", user?.id, guestCart.map(i => i.id).join(","), searchParams.toString()],
    queryFn: async () => {
      // Check if this is a direct booking from URL params
      const mode = searchParams.get("mode");
      const propertyId = searchParams.get("propertyId");
      const tourId = searchParams.get("tourId");
      const transportItemType = searchParams.get("itemType");
      const transportReferenceId = searchParams.get("referenceId");
      const requireTripCart = searchParams.get("requireTripCart");
      
      // Direct property booking
      if (mode === "booking" && propertyId) {
        const directBooking = await fetchDirectBooking(propertyId);
        
        // If requireTripCart is set, merge with cart items (for add-ons)
        if (requireTripCart === "1") {
          const cartSource = user ? await fetchUserCart() : await fetchGuestCart();
          return [...directBooking, ...cartSource];
        }
        
        return directBooking;
      }
      
      // Direct tour booking
      if (mode === "tour" && tourId) {
        const participants = parseInt(searchParams.get("participants") || "1", 10);
        const quantity = parseInt(searchParams.get("quantity") || "0", 10);
        const durationValue = parseInt(searchParams.get("durationValue") || "0", 10);
        const durationUnitRaw = searchParams.get("durationUnit");
        const durationUnit = durationUnitRaw === "hour" || durationUnitRaw === "minute" ? durationUnitRaw : undefined;
        const durationPrice = parseFloat(searchParams.get("durationPrice") || "0");
        const safeDurationPrice = Number.isFinite(durationPrice) && durationPrice > 0 ? durationPrice : undefined;
        const directTour = await fetchDirectTour(
          tourId,
          participants,
          quantity > 0 ? quantity : undefined,
          durationValue > 0 && durationUnit ? { durationValue, durationUnit, durationPrice: safeDurationPrice } : undefined
        );
        return directTour;
      }

      // Direct transport booking
      if (mode === "transport" && transportItemType && transportReferenceId) {
        return fetchDirectTransport(transportItemType, transportReferenceId);
      }
      
      // Otherwise fetch from cart
      const cartSource = user ? await fetchUserCart() : await fetchGuestCart();
      return cartSource;
    },
    enabled: !authLoading,
  });

  async function fetchDirectTour(
    tourId: string,
    participants: number,
    explicitQuantity?: number,
    selectedDuration?: { durationValue: number; durationUnit: "minute" | "hour"; durationPrice?: number }
  ): Promise<CartItem[]> {
    const safeSelectedDurationPrice =
      selectedDuration && Number.isFinite(selectedDuration.durationPrice) && (selectedDuration.durationPrice ?? 0) > 0
        ? selectedDuration.durationPrice
        : undefined;

    // Try regular tours first
    const { data: tour } = await ((supabase
      .from('tours')
      .select('id, title, price_per_person, currency, images, duration_days, pricing_tiers') as any)
      .eq('id', tourId)
      .maybeSingle());

    if (tour) {
      const pricingModel = getTourPricingModel((tour as any)?.pricing_tiers);
      const quantity = explicitQuantity && explicitQuantity > 0
        ? explicitQuantity
        : getTourBillingQuantity(pricingModel, participants);

      const perPersonPrice = getTourPerPersonUnitPrice(
        pricingModel,
        (tour as any)?.pricing_tiers,
        participants,
        Number(tour.price_per_person || 0)
      );

      return [{
        id: `direct-tour-${tour.id}`,
        item_type: 'tour',
        reference_id: tour.id,
        quantity,
        title: tour.title,
        price: safeSelectedDurationPrice ?? perPersonPrice,
        currency: tour.currency || 'RWF',
        image: tour.images?.[0],
        meta: selectedDuration
          ? `${selectedDuration.durationValue} ${selectedDuration.durationValue === 1 ? selectedDuration.durationUnit : `${selectedDuration.durationUnit}s`} • ${getTourPriceSuffix(pricingModel)}`
          : `${tour.duration_days} days • ${getTourPriceSuffix(pricingModel)}`,
        metadata: {
          participants,
          pricing_model: pricingModel,
        } as CartItemMetadata,
      }];
    }

    // Fallback to tour_packages (TourDetails also renders these under /tours/:id)
    const { data: tourPackage, error: packageError } = await ((supabase
      .from('tour_packages')
      .select('id, title, price_per_adult, currency, cover_image, gallery_images, duration, pricing_tiers') as any)
      .eq('id', tourId)
      .maybeSingle());

    if (packageError || !tourPackage) {
      console.error("Failed to load tour/tour package for direct booking:", packageError);
      return [];
    }

    const pricingModel = getTourPricingModel((tourPackage as any)?.pricing_tiers);
    const quantity = explicitQuantity && explicitQuantity > 0
      ? explicitQuantity
      : getTourBillingQuantity(pricingModel, participants);

    const perPersonPrice = getTourPerPersonUnitPrice(
      pricingModel,
      (tourPackage as any)?.pricing_tiers,
      participants,
      Number(tourPackage.price_per_adult || 0)
    );

    const packageImages = [tourPackage.cover_image, ...(Array.isArray(tourPackage.gallery_images) ? tourPackage.gallery_images : [])]
      .filter(Boolean);

    return [{
      id: `direct-tour-package-${tourPackage.id}`,
      item_type: 'tour_package',
      reference_id: tourPackage.id,
      quantity,
      title: tourPackage.title,
      price: safeSelectedDurationPrice ?? perPersonPrice,
      currency: tourPackage.currency || 'RWF',
      image: packageImages[0],
      meta: selectedDuration
        ? `${selectedDuration.durationValue} ${selectedDuration.durationValue === 1 ? selectedDuration.durationUnit : `${selectedDuration.durationUnit}s`} • ${getTourPriceSuffix(pricingModel)}`
        : `${tourPackage.duration || 1} days • ${getTourPriceSuffix(pricingModel)}`,
      metadata: {
        participants,
        pricing_model: pricingModel,
      } as CartItemMetadata,
    }];
  }

  async function fetchDirectBooking(propertyId: string): Promise<CartItem[]> {
    // Fetch the property details directly
    const { data: property, error } = await ((supabase
      .from('properties')
      .select('id, title, price_per_night, currency, images, location, weekly_discount, monthly_discount, breakfast_available, breakfast_price_per_night') as any)
      .eq('id', propertyId)
      .single());
    
    if (error || !property) {
      console.error("Failed to load property for direct booking:", error);
      return [];
    }

    const withBreakfast = searchParams.get("withBreakfast") === "1";
    const breakfastPriceFromQuery = Number(searchParams.get("breakfastPricePerNight") || 0);
    const breakfastPriceFromProperty = Number((property as any).breakfast_price_per_night || 0);
    const breakfastPricePerNight = breakfastPriceFromQuery > 0 ? breakfastPriceFromQuery : breakfastPriceFromProperty;
    const breakfastIncluded = Boolean((property as any).breakfast_available) && withBreakfast && breakfastPricePerNight > 0;
    
    // Calculate nights from checkIn/checkOut params
    const checkIn = searchParams.get("checkIn");
    const checkOut = searchParams.get("checkOut");
    let nights = 1;
    
    if (checkIn && checkOut) {
      const start = parseDateValue(checkIn);
      const end = parseDateValue(checkOut);
      if (start && end) {
        nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      }
    }
    
    const guests = parseInt(searchParams.get("guests") || "1", 10);
    
    // Return as a cart item
    return [{
      id: `direct-${property.id}`,
      item_type: 'property',
      reference_id: property.id,
      quantity: nights,
      title: property.title,
      price: property.price_per_night,
      currency: property.currency || 'RWF',
      image: property.images?.[0],
      meta: property.location,
      weekly_discount: property.weekly_discount,
      monthly_discount: property.monthly_discount,
      metadata: {
        check_in: checkIn || undefined,
        check_out: checkOut || undefined,
        nights,
        guests,
        breakfast_included: breakfastIncluded,
        breakfast_price_per_night: breakfastIncluded ? breakfastPricePerNight : 0,
        breakfast_total: breakfastIncluded ? breakfastPricePerNight * nights : 0,
      }
    }];
  }

  async function fetchDirectTransport(itemType: string, referenceId: string): Promise<CartItem[]> {
    return enrichCartItems([
      {
        id: `direct-${itemType}-${referenceId}`,
        item_type: itemType,
        reference_id: referenceId,
        quantity: 1,
      },
    ]);
  }

  async function fetchUserCart(): Promise<CartItem[]> {
    const { data, error } = await ((supabase
      .from("trip_cart_items")
      .select("id, item_type, reference_id, quantity") as any)
      .eq("user_id", user!.id));

    if (error || !data?.length) return [];
    return enrichCartItems(data);
  }

  async function fetchGuestCart(): Promise<CartItem[]> {
    if (guestCart.length === 0) return [];
    return enrichCartItems(guestCart.map(g => ({
      id: g.id,
      item_type: g.item_type,
      reference_id: g.reference_id,
      quantity: g.quantity,
    })));
  }

  async function enrichCartItems(items: any[]): Promise<CartItem[]> {
    const tourIds = items.filter(i => i.item_type === 'tour').map(i => String(i.reference_id));
    const packageIds = items.filter(i => i.item_type === 'tour_package').map(i => String(i.reference_id));
    const propertyIds = items.filter(i => i.item_type === 'property').map(i => String(i.reference_id));
    const vehicleIds = items.filter(i => i.item_type === 'transport_vehicle').map(i => String(i.reference_id));
    const airportPricingIds = items.filter(i => i.item_type === 'airport_transfer_pricing').map(i => String(i.reference_id));
    const routeIds = items.filter(i => i.item_type === 'transport_route').map(i => String(i.reference_id));
    const serviceIds = items.filter(i => i.item_type === 'transport_service').map(i => String(i.reference_id));

    const [tours, packages, properties, vehicles, airportPricing, routes, services] = await Promise.all([
      tourIds.length ? ((supabase.from('tours').select('id, title, price_per_person, currency, images, duration_days, pricing_tiers') as any).in('id', tourIds).then((r: any) => r.data || [])) : [],
      packageIds.length ? ((supabase.from('tour_packages').select('id, title, price_per_adult, currency, cover_image, gallery_images, duration, pricing_tiers') as any).in('id', packageIds).then((r: any) => r.data || [])) : [],
      propertyIds.length ? ((supabase.from('properties').select('id, title, price_per_night, currency, images, location, weekly_discount, monthly_discount, breakfast_available, breakfast_price_per_night') as any).in('id', propertyIds).then((r: any) => r.data || [])) : [],
      vehicleIds.length ? ((supabase.from('transport_vehicles').select('id, title, price_per_day, currency, image_url, vehicle_type, seats') as any).in('id', vehicleIds).then((r: any) => r.data || [])) : [],
      airportPricingIds.length
        ? ((supabase as any)
            .from('airport_transfer_pricing')
            .select(`
              id, route_id, vehicle_id, price, currency,
              route:airport_transfer_routes(from_location, to_location, distance_km, currency),
              vehicle:transport_vehicles(title, image_url, vehicle_type, seats)
            `)
            .in('id', airportPricingIds)
            .then((r: any) => r.data || []))
        : [],
      routeIds.length ? ((supabase.from('transport_routes').select('id, from_location, to_location, base_price, currency') as any).in('id', routeIds).then((r: any) => r.data || [])) : [],
      serviceIds.length ? ((supabase.from('transport_services').select('id, title, description') as any).in('id', serviceIds).then((r: any) => r.data || [])) : [],
    ]) as any[];

    const maps: Record<string, Map<string, any>> = {
      tour: new Map(tours.map((t: any) => [String(t.id), t] as [string, any])),
      tour_package: new Map(packages.map((p: any) => [String(p.id), p] as [string, any])),
      property: new Map(properties.map((p: any) => [String(p.id), p] as [string, any])),
      transport_vehicle: new Map(vehicles.map((v: any) => [String(v.id), v] as [string, any])),
      airport_transfer_pricing: new Map(airportPricing.map((p: any) => [String(p.id), p] as [string, any])),
      transport_route: new Map(routes.map((r: any) => [String(r.id), r] as [string, any])),
      transport_service: new Map(services.map((s: any) => [String(s.id), s] as [string, any])),
    };

    return items.map(item => {
      const refId = String(item.reference_id);
      let resolvedType = item.item_type;
      let data: any = maps[resolvedType]?.get(refId);

      if (!data && resolvedType === 'tour') {
        const packageFallback = maps.tour_package.get(refId);
        if (packageFallback) {
          resolvedType = 'tour_package';
          data = packageFallback;
        }
      }

      if (!data) {
        console.warn(`Checkout item not found: ${item.item_type} ${refId}`);
        return null;
      }

      // Get metadata from localStorage for properties
      const metadata = resolvedType === 'property' ? getCartItemMetadata(refId) : undefined;

      const getDetails = () => {
        switch (resolvedType) {
          case 'tour':
            {
              const pricingModel = getTourPricingModel(data.pricing_tiers);
              const participants = Math.max(1, Number(item.metadata?.participants || item.quantity || 1));
              const perPersonPrice = getTourPerPersonUnitPrice(
                pricingModel,
                data.pricing_tiers,
                participants,
                Number(data.price_per_person || 0)
              );

            return {
              title: data.title,
              price: perPersonPrice,
              currency: data.currency || 'RWF',
              image: data.images?.[0],
              meta: `${data.duration_days} days • ${getTourPriceSuffix(pricingModel)}`,
            };
            }
          case 'tour_package':
            {
              const pricingModel = getTourPricingModel(data.pricing_tiers);
              const participants = Math.max(1, Number(item.metadata?.participants || item.quantity || 1));
              const perPersonPrice = getTourPerPersonUnitPrice(
                pricingModel,
                data.pricing_tiers,
                participants,
                Number(data.price_per_adult || 0)
              );

              return {
                title: data.title,
                price: perPersonPrice,
                currency: data.currency || 'RWF',
                image: data.cover_image || data.gallery_images?.[0],
                meta: `${parseInt(data.duration) || 1} days • ${getTourPriceSuffix(pricingModel)}`,
              };
            }
          case 'property':
            return { title: data.title, price: data.price_per_night, currency: data.currency || 'RWF', image: data.images?.[0], meta: data.location, weekly_discount: data.weekly_discount, monthly_discount: data.monthly_discount };
          case 'transport_vehicle':
            return { title: data.title, price: data.price_per_day, currency: data.currency || 'RWF', image: data.image_url, meta: `${data.vehicle_type} • ${data.seats} seats` };
          case 'airport_transfer_pricing': {
            const route = data.route || null;
            const vehicle = data.vehicle || null;
            const routeLabel = route ? `${route.from_location} → ${route.to_location}` : 'Airport transfer';
            return {
              title: routeLabel,
              price: Number(data.price || 0),
              currency: data.currency || route?.currency || 'RWF',
              image: vehicle?.image_url,
              meta: vehicle?.title ? `Airport transfer • ${vehicle.title}` : 'Airport transfer',
              transport_vehicle_id: data.vehicle_id || null,
            };
          }
          case 'transport_route':
            return {
              title: `${data.from_location} → ${data.to_location}`,
              price: Number(data.base_price || 0),
              currency: data.currency || 'RWF',
              meta: 'Intercity ride',
            };
          case 'transport_service':
            return {
              title: data.title,
              price: 0,
              currency: 'RWF',
              meta: data.description || 'Transport service',
            };
          default:
            return null;
        }
      };

      const details = getDetails();
      if (!details) return null;

      return { id: item.id, item_type: resolvedType, reference_id: item.reference_id, quantity: item.quantity, metadata, ...details } as CartItem;
    }).filter(Boolean) as CartItem[];
  }

  // Calculate totals
  const { subtotal, serviceFees, discount, stayDiscount, total, displayCurrency } = useMemo(() => {
    let subtotalAmount = 0;
    let stayDiscountAmount = 0;
    const curr = preferredCurrency || "RWF";
    const itemSnapshots: Array<{
      discountedAfterStay: number;
      isAccommodation: boolean;
    }> = [];

    cartItems.forEach((item) => {
      // For properties, use nights from metadata; for other items use quantity
      const isProperty = item.item_type === 'property';
      const nights = isProperty && item.metadata?.nights ? item.metadata.nights : 1;
      const multiplier = isProperty ? nights : item.quantity;
      const breakfastPerNight = isProperty && item.metadata?.breakfast_included
        ? Number(item.metadata?.breakfast_price_per_night || 0)
        : 0;
      const breakfastTotal = breakfastPerNight > 0 ? breakfastPerNight * nights : 0;
      const itemTotal = item.price * multiplier + breakfastTotal;
      const converted = convertAmount(itemTotal, item.currency, curr, usdRates) ?? itemTotal;
      subtotalAmount += converted;
      
      // Apply weekly/monthly discount for properties
      let stayDiscountForItem = 0;
      if (isProperty && nights > 0) {
        const weeklyDiscount = Number(item.weekly_discount ?? 0);
        const monthlyDiscount = Number(item.monthly_discount ?? 0);
        const discountPercent = nights >= 30 && monthlyDiscount > 0 
          ? monthlyDiscount 
          : nights >= 7 && weeklyDiscount > 0 
            ? weeklyDiscount 
            : 0;
        if (discountPercent > 0) {
            stayDiscountForItem = roundToCurrency((converted * discountPercent) / 100, curr);
            stayDiscountAmount += stayDiscountForItem;
        }
      }

        itemSnapshots.push({
          discountedAfterStay: Math.max(0, converted - stayDiscountForItem),
          isAccommodation: isProperty,
        });
    });

    let discountAmount = 0;
      const afterStayDiscount = Math.max(0, subtotalAmount - stayDiscountAmount);
    if (appliedDiscount) {
      if (appliedDiscount.discount_type === 'percentage') {
        discountAmount = afterStayDiscount * (appliedDiscount.discount_value / 100);
      } else {
        const converted = convertAmount(appliedDiscount.discount_value, appliedDiscount.currency, curr, usdRates);
        discountAmount = converted ?? 0;
      }
      if (appliedDiscount.minimum_amount) {
        const convertedMinimum = convertAmount(appliedDiscount.minimum_amount, appliedDiscount.currency, curr, usdRates);
        const minimumForCurrentCurrency = convertedMinimum ?? appliedDiscount.minimum_amount;
        if (afterStayDiscount < minimumForCurrentCurrency) {
          discountAmount = 0;
        }
      }
    }

    let feesAmount = 0;
    itemSnapshots.forEach((snapshot) => {
      if (!snapshot.isAccommodation) return;

      const promoShare = afterStayDiscount > 0
        ? (snapshot.discountedAfterStay / afterStayDiscount) * discountAmount
        : 0;
      const discountedListingSubtotal = Math.max(0, snapshot.discountedAfterStay - promoShare);
      const { guestFee } = calculateBookingFinancialsFromDiscountedListing(discountedListingSubtotal, 'accommodation');
      feesAmount += guestFee;
    });

    return {
      subtotal: subtotalAmount,
      stayDiscount: stayDiscountAmount,
      serviceFees: feesAmount,
      discount: discountAmount,
      total: afterStayDiscount - discountAmount + feesAmount,
      displayCurrency: curr,
    };
  }, [cartItems, preferredCurrency, usdRates, appliedDiscount]);

  // Check if there are tours with multiple participants
  const tourParticipants = useMemo(() => {
    return cartItems
      .filter(item => item.item_type === 'tour' || item.item_type === 'tour_package')
      .reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  const hasGroupBooking = tourParticipants > 1;
  
  // Calculate individual share when paying individually
  const individualShare = useMemo(() => {
    if (!hasGroupBooking || paymentType === 'group') return total;
    return Math.ceil(total / tourParticipants);
  }, [total, tourParticipants, paymentType, hasGroupBooking]);

  // The amount to actually pay based on payment type
  const payableAmount = paymentType === 'individual' && hasGroupBooking ? individualShare : total;

  // Apply discount code
  const handleApplyDiscount = async () => {
    if (!discountCodeInput.trim()) {
      setDiscountError("Please enter a discount code");
      return;
    }
    
    setDiscountLoading(true);
    setDiscountError(null);
    
    try {
      const { data, error } = await ((supabase
        .from("discount_codes")
        .select("*") as any)
        .eq("code", discountCodeInput.trim().toUpperCase())
        .eq("is_active", true)
        .single());
      
      if (error || !data) {
        setDiscountError("Invalid or expired discount code");
        return;
      }
      
      // Check if code has uses remaining
      if (data.max_uses && data.uses >= data.max_uses) {
        setDiscountError("This discount code has been fully used");
        return;
      }
      
      // Check expiry
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setDiscountError("This discount code has expired");
        return;
      }
      
      setAppliedDiscount(data);
      localStorage.setItem("applied_discount", JSON.stringify(data));
      setDiscountCodeInput(discountCodeInput.trim().toUpperCase());
      clearQueuedPromoPrefillCode();
      toast({
        title: "Discount applied!",
        description: data.discount_type === 'percentage'
          ? `${data.discount_value}% off your order`
          : (() => {
              const converted = convertAmount(data.discount_value, data.currency, displayCurrency, usdRates);
              return `${formatMoney(converted ?? data.discount_value, converted !== null ? displayCurrency : data.currency)} off your order`;
            })(),
      });
    } catch (err) {
      console.error("Discount error:", err);
      setDiscountError("Failed to apply discount code");
    } finally {
      setDiscountLoading(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    localStorage.removeItem("applied_discount");
    toast({ title: "Discount removed" });
  };

  // Check if payment method is a mobile money method (not card or bank)
  const isMobileMoneyMethod = paymentMethod !== 'card' && paymentMethod !== 'bank';

  const savedCardMethods = useMemo(
    () => savedPaymentMethods.filter((method) => method.method_type === 'card' && method.is_active),
    [savedPaymentMethods]
  );

  const savedMobileMethods = useMemo(
    () => savedPaymentMethods.filter((method) => method.method_type === 'mobile_money' && method.is_active),
    [savedPaymentMethods]
  );

  const defaultSavedCardMethod = useMemo(
    () => savedCardMethods.find((method) => method.is_default) || savedCardMethods[0] || null,
    [savedCardMethods]
  );

  const defaultSavedMobileMethod = useMemo(
    () => savedMobileMethods.find((method) => method.is_default) || savedMobileMethods[0] || null,
    [savedMobileMethods]
  );

  const selectedSavedCardMethod = useMemo(
    () => savedCardMethods.find((method) => method.id === selectedSavedMethodId) || null,
    [savedCardMethods, selectedSavedMethodId]
  );

  const findMobileMethodFromSaved = (saved: SavedPaymentMethod) => {
    const metadata = (saved.metadata && typeof saved.metadata === "object"
      ? saved.metadata
      : {}) as Record<string, unknown>;

    const metadataMethodId =
      typeof metadata.payment_method_id === "string" ? metadata.payment_method_id : null;

    if (metadataMethodId) {
      const exact = PAWAPAY_METHODS.find((method) => method.id === metadataMethodId);
      if (exact) return exact;
    }

    const normalizedProvider = (saved.provider || "").toUpperCase();
    const normalizedCountryCode = normalizeDialCode(saved.country_code);
    const providerMatches = PAWAPAY_METHODS.filter(
      (method) => method.provider.toUpperCase() === normalizedProvider
    );

    if (providerMatches.length === 0) return null;
    if (!normalizedCountryCode) return providerMatches[0];

    return (
      providerMatches.find((method) => method.countryCode === normalizedCountryCode) ||
      providerMatches[0]
    );
  };

  const applySavedMobileMethod = (saved: SavedPaymentMethod) => {
    const matchedMethod = findMobileMethodFromSaved(saved);

    if (matchedMethod) {
      setLastMobileMethod(matchedMethod.id);
      setPaymentMethod(matchedMethod.id);
      setCountryCode(matchedMethod.countryCode);
      setCurrency(matchedMethod.currency as any);
    }

    const localDigits = toLocalPhoneDigits(
      saved.phone_number,
      matchedMethod?.countryCode || normalizeDialCode(saved.country_code) || countryCode
    );

    if (localDigits) {
      setPhoneNumber(localDigits);
    }

    setSelectedSavedMethodId(saved.id);
    setShowContactModal(false);
  };

  const applySavedPaymentMethod = (saved: SavedPaymentMethod) => {
    if (saved.method_type === 'card') {
      if (isMobileMoneyMethod) setLastMobileMethod(paymentMethod);
      setPaymentMethod('card');
      setSelectedSavedMethodId(saved.id);
      setShowContactModal(false);

      const normalizedBillingCountry =
        saved.country_code && /^[A-Za-z]{2}$/.test(saved.country_code)
          ? saved.country_code.toUpperCase()
          : null;

      if (normalizedBillingCountry) {
        setFormData((prev) => ({ ...prev, billingCountry: normalizedBillingCountry }));
      }
      return;
    }

    applySavedMobileMethod(saved);
  };

  useEffect(() => {
    if (!user?.id || savedMethodsLoading || savedDefaultsApplied) return;

    if (savedPaymentMethods.length === 0) {
      setSavedDefaultsApplied(true);
      return;
    }

    if (isMobileMoneyMethod && !phoneNumber.trim() && defaultSavedMobileMethod) {
      const metadata = (defaultSavedMobileMethod.metadata && typeof defaultSavedMobileMethod.metadata === "object"
        ? defaultSavedMobileMethod.metadata
        : {}) as Record<string, unknown>;
      const metadataMethodId =
        typeof metadata.payment_method_id === "string" ? metadata.payment_method_id : null;

      const provider = (defaultSavedMobileMethod.provider || "").toUpperCase();
      const providerMatches = PAWAPAY_METHODS.filter(
        (method) => method.provider.toUpperCase() === provider
      );

      const matchedMethod = metadataMethodId
        ? (PAWAPAY_METHODS.find((method) => method.id === metadataMethodId) || null)
        : null;

      const fallbackMatch =
        matchedMethod ||
        providerMatches.find(
          (method) => method.countryCode === normalizeDialCode(defaultSavedMobileMethod.country_code)
        ) ||
        providerMatches[0] ||
        null;

      if (fallbackMatch) {
        setLastMobileMethod(fallbackMatch.id);
        setPaymentMethod(fallbackMatch.id);
        setCountryCode(fallbackMatch.countryCode);
        setCurrency(fallbackMatch.currency as any);
      }

      const localDigits = toLocalPhoneDigits(
        defaultSavedMobileMethod.phone_number,
        fallbackMatch?.countryCode || normalizeDialCode(defaultSavedMobileMethod.country_code) || countryCode
      );

      if (localDigits) {
        setPhoneNumber(localDigits);
      }

      setSelectedSavedMethodId(defaultSavedMobileMethod.id);
      setShowContactModal(false);
      setSavedDefaultsApplied(true);
      return;
    }

    if (paymentMethod === 'card' && defaultSavedCardMethod) {
      setSelectedSavedMethodId(defaultSavedCardMethod.id);
      setSavedDefaultsApplied(true);
      return;
    }

    setSavedDefaultsApplied(true);
  }, [
    user?.id,
    savedMethodsLoading,
    savedDefaultsApplied,
    savedPaymentMethods,
    isMobileMoneyMethod,
    phoneNumber,
    countryCode,
    defaultSavedMobileMethod,
    paymentMethod,
    defaultSavedCardMethod,
    setCurrency,
  ]);

  // Only show methods relevant to detected region (single-country fallback when region is unavailable)
  const visibleMobileMoneyCountries = useMemo(() => {
    const singleCountry = (countryName?: string) => {
      if (!countryName || !METHODS_BY_COUNTRY[countryName]) return [] as [string, typeof METHODS_BY_COUNTRY[string]][];
      return [[countryName, METHODS_BY_COUNTRY[countryName]]] as [string, typeof METHODS_BY_COUNTRY[string]][];
    };

    if (isAfricanRegion !== true) {
      return [] as [string, typeof METHODS_BY_COUNTRY[string]][];
    }

    const detectedName = detectedCountry ? PAWAPAY_COUNTRY_BY_ISO[detectedCountry.toUpperCase()] : undefined;
    const detected = singleCountry(detectedName);
    if (detected.length > 0) return detected;

    const selectedName = PAWAPAY_METHODS.find((method) => method.id === paymentMethod)?.country;
    const selected = singleCountry(selectedName);
    if (selected.length > 0) return selected;

    const codeFallbackName = COUNTRY_BY_CODE[countryCode];
    const codeFallback = singleCountry(codeFallbackName);
    if (codeFallback.length > 0) return codeFallback;

    return [] as [string, typeof METHODS_BY_COUNTRY[string]][];
  }, [detectedCountry, paymentMethod, countryCode, isAfricanRegion]);

  useEffect(() => {
    if (!isMobileMoneyMethod) return;
    const availableMethodIds = visibleMobileMoneyCountries.flatMap(([, entry]) => entry.methods.map((method) => method.id));
    if (availableMethodIds.length === 0 || availableMethodIds.includes(paymentMethod)) return;

    const nextMethodId = availableMethodIds[0];
    const nextMethod = PAWAPAY_METHODS.find((method) => method.id === nextMethodId);
    setLastMobileMethod(nextMethodId);
    setPaymentMethod(nextMethodId);
    if (nextMethod) {
      setCountryCode(nextMethod.countryCode);
      setCurrency(nextMethod.currency as any);
    }
  }, [isMobileMoneyMethod, visibleMobileMoneyCountries, paymentMethod, setCurrency]);

  const isBankValid = true;

  const goToStep = (step: Step) => {
    if (step === 'payment' && !isDetailsValid) {
      toast({ variant: "destructive", title: "Please complete your details" });
      return;
    }
    if (step === 'confirm' && !isPaymentValid) {
      const message = isMobileMoneyMethod
        ? "Please enter your phone number"
        : paymentMethod === 'card'
          ? "Please choose a payment method"
          : "Please select a payment method";
      toast({ variant: "destructive", title: message });
      return;
    }
    setCurrentStep(step);
    setPaymentError(null);
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'property': return <Home className="w-4 h-4" />;
      case 'tour':
      case 'tour_package': return <MapPin className="w-4 h-4" />;
      case 'transport_vehicle': return <Car className="w-4 h-4" />;
      default: return <ShoppingBag className="w-4 h-4" />;
    }
  };

  const toDateOnly = (value?: string | null) => {
    if (!value) return null;
    if (DATE_ONLY_PATTERN.test(value)) return value;
    const parsed = parseDateValue(value);
    if (!parsed) return null;
    return formatDateOnlyLocal(parsed);
  };

  const addDays = (dateOnly: string, days: number) => addDaysToDateOnly(dateOnly, days);

  const getDefaultBookingDates = () => {
    const today = formatDateOnlyLocal(new Date());
    return { checkIn: today, checkOut: addDays(today, 1) };
  };

  const formatDateForDisplay = (value?: string | null) => {
    const parsed = parseDateValue(value);
    if (!parsed) return value || "";
    return parsed.toLocaleDateString();
  };
  
  const getNormalizedPhone = () => {
    const digitsOnly = phoneNumber.replace(/\D/g, "").replace(/^0+/, "");
    if (digitsOnly.length >= 9) {
      return `${countryCode}${digitsOnly}`;
    }
    return formData.phone?.trim() || null;
  };

  const getBillingCountryCode = () => {
    const normalized = (formData.billingCountry || "").trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(normalized)) return normalized;

    const fromLabel = BILLING_COUNTRY_OPTIONS.find(
      (option) => option.label.toLowerCase() === normalized.toLowerCase()
    );
    if (fromLabel) return fromLabel.code;

    if (countryCode === "+250") return "RW";
    if (countryCode === "+254") return "KE";
    if (countryCode === "+256") return "UG";
    if (countryCode === "+260") return "ZM";
    return "RW";
  };

  const requiresBillingState = () => {
    const country = getBillingCountryCode();
    return country === "US" || country === "CA";
  };

  const isCardBillingValid =
    Boolean(formData.billingAddress1.trim()) &&
    Boolean(formData.billingCity.trim()) &&
    Boolean(formData.billingPostalCode.trim()) &&
    Boolean(getBillingCountryCode()) &&
    (!requiresBillingState() || Boolean(formData.billingState.trim()));

  // Step validation
  const isDetailsValid = formData.fullName.trim() && formData.email.trim();
  const isPaymentValid = isMobileMoneyMethod
    ? phoneNumber.length >= 9
    : paymentMethod === 'card'
      ? isCardBillingValid
      : isBankValid;

  // Process payment
  const handlePayment = async () => {
    // Validate required guest info for non-logged-in users
    if (!user && (!formData.fullName.trim() || !formData.email.trim())) {
      setPaymentError("Please provide your name and email to complete booking");
      toast({
        variant: "destructive",
        title: "Contact info required",
        description: "Please provide your name and email address.",
      });
      setIsProcessing(false);
      return;
    }

    if (!acceptedAdult) {
      setPaymentError("Please confirm you are 18 years or older to complete booking");
      toast({
        variant: "destructive",
        title: "18+ confirmation required",
        description: "Please confirm you are 18 years or older to continue.",
      });
      return;
    }
    
    setIsProcessing(true);
    setPaymentError(null);
    
    try {
      // Persist adult confirmation for logged-in users (one-time)
      if (user && acceptedAdult && !profileAdultConfirmed) {
        const { error: adultError } = await (supabase
          .from('profiles')
          .upsert({
            user_id: user.id,
            is_adult_confirmed: true,
            adult_confirmed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as any, { onConflict: 'user_id' }) as any);

        if (adultError) {
          throw new Error("Unable to save 18+ confirmation. Please try again.");
        }
        setProfileAdultConfirmed(true);
      }

      // Normalize phone once, then reuse for checkout payloads and provider prefill.
      const normalizedPhone = getNormalizedPhone();
      const [firstName, ...lastNameParts] = formData.fullName.trim().split(/\s+/).filter(Boolean);
      const billingAddress = {
        firstName: firstName || "Customer",
        lastName: lastNameParts.join(" ") || "Customer",
        line1: formData.billingAddress1.trim() || undefined,
        line2: formData.billingAddress2.trim() || undefined,
        city: formData.billingCity.trim() || undefined,
        state: formData.billingState.trim() || undefined,
        postalCode: formData.billingPostalCode.trim() || undefined,
        countryCode: getBillingCountryCode(),
        phoneNumber: normalizedPhone || undefined,
      };

      // Clean phone number for mobile money payments only
      let fullPhone = null;
      if (isMobileMoneyMethod) {
        let cleanedPhone = phoneNumber.replace(/^0+/, ''); // Remove leading zeros
        const countryDigits = countryCode.replace('+', '');
        if (cleanedPhone.startsWith(countryDigits) && cleanedPhone.length >= 11) {
          cleanedPhone = cleanedPhone.substring(countryDigits.length);
        }
        fullPhone = `${countryCode}${cleanedPhone}`;

        console.log("📱 Phone number processing:", {
          raw: phoneNumber,
          cleaned: cleanedPhone,
          countryCode,
          fullPhone
        });
      }
      
      // Build cart items metadata with calculated prices
      const cartItemsWithPrices = cartItems.map(item => {
        const isAccommodation = item.item_type === 'property';
        const nights = isAccommodation && item.metadata?.nights ? Number(item.metadata.nights) : Number(item.quantity || 1);
        const breakfastPerNight = isAccommodation && item.metadata?.breakfast_included
          ? Number(item.metadata?.breakfast_price_per_night || 0)
          : 0;
        const breakfastTotal = breakfastPerNight > 0 ? breakfastPerNight * nights : 0;
        const itemTotal = Number(item.price || 0) * (isAccommodation ? nights : Number(item.quantity || 1)) + breakfastTotal;
        // IMPORTANT: Keep each item's calculated_price in the item's own currency
        // so booking records can store a consistent (amount + currency) pair.
        // Payment conversion to RWF is handled separately at the checkout level.
        const converted = itemTotal;
        const weeklyDiscount = Number(item.weekly_discount ?? 0);
        const monthlyDiscount = Number(item.monthly_discount ?? 0);
        const stayDiscountPercent = isAccommodation && nights > 0
          ? (nights >= 30 && monthlyDiscount > 0
              ? monthlyDiscount
              : nights >= 7 && weeklyDiscount > 0
                ? weeklyDiscount
                : 0)
          : 0;
        const stayDiscountForItem = stayDiscountPercent > 0
          ? roundToCurrency((converted * stayDiscountPercent) / 100, item.currency)
          : 0;
        const itemAfterStayDiscount = Math.max(0, converted - stayDiscountForItem);
        
        // Apply proportional discount
        let itemDiscount = 0;
        const discountableSubtotal = Math.max(0, subtotal - stayDiscount);
        if (discount > 0 && discountableSubtotal > 0) {
          itemDiscount = (itemAfterStayDiscount / discountableSubtotal) * discount;
        }

        const totalItemDiscount = stayDiscountForItem + itemDiscount;
        const discountedListingSubtotal = Math.max(0, converted - totalItemDiscount);
        const itemServiceType: 'accommodation' | 'tour' | 'transport' =
          isAccommodation
            ? 'accommodation'
            : (item.item_type === 'tour' || item.item_type === 'tour_package')
              ? 'tour'
              : 'transport';
        const financials = isAccommodation
          ? calculateBookingFinancialsFromDiscountedListing(discountedListingSubtotal, 'accommodation')
          : calculateBookingFinancialsFromDiscountedListing(discountedListingSubtotal, itemServiceType);
        
        return {
          ...item,
          calculated_price: financials.guestTotal,
          calculated_price_currency: item.currency,
          platform_fee: financials.guestFee,
          host_fee_amount: financials.hostFee,
          host_earnings_amount: financials.hostNetEarnings,
          discounted_listing_subtotal: financials.discountedListingSubtotal,
          guest_fee_percent: financials.guestFeePercent,
          host_fee_percent: financials.hostFeePercent,
          discount_applied: totalItemDiscount,
        };
      });
      
      // Get booking details if this is a direct booking
      const mode = searchParams.get("mode");
      const bookingDetails = mode === "booking" ? {
        property_id: searchParams.get("propertyId"),
        check_in: searchParams.get("checkIn"),
        check_out: searchParams.get("checkOut"),
        guests: Number(searchParams.get("guests")) || 1,
      } : null;
      
      // Convert total to RWF for storage (all non-card checkouts stored in RWF)
      // Use payableAmount (which may be individual share or full total)
      let amountInRwf = payableAmount;
      if (displayCurrency !== 'RWF') {
        const converted = convertAmount(payableAmount, displayCurrency, 'RWF', usdRates);
        if (!converted) {
          throw new Error(`Unable to convert ${displayCurrency} to RWF. Please try again.`);
        }
        amountInRwf = converted;
        console.log("💱 Converted checkout amount to RWF:", {
          from: displayCurrency,
          original: payableAmount,
          rwf: amountInRwf
        });
      }

      // For card payments, pre-compute the USD charge amount BEFORE creating the checkout
      // row so the DB stores USD as the canonical currency. This eliminates double-conversion
      // (display→RWF→USD) and ensures retries use the exact same USD figure.
      let cardAmountUsd: number | null = null;
      if (paymentMethod === 'card') {
        const rawUsd = convertAmount(amountInRwf, 'RWF', 'USD', usdRates);
        if (!rawUsd || rawUsd <= 0) {
          throw new Error('Unable to convert booking total to USD. Please try again.');
        }
        cardAmountUsd = roundToCurrency(rawUsd, 'USD');
        if (cardAmountUsd < 1) {
          throw new Error('Minimum card payment is $1.00 USD. Please add more items or use Mobile Money / Bank Transfer.');
        }
      }
      
      // Calculate host earnings from total guest-paid amount (already includes discount-first pricing)
      const serviceType: 'accommodation' | 'tour' | 'transport' = 
        cartItems.some(i => i.item_type === 'property') ? 'accommodation' 
        : cartItems.some(i => i.item_type === 'tour' || i.item_type === 'tour_package') ? 'tour' 
        : 'transport';
      const guestFeePercent = PLATFORM_FEES[serviceType].guestFeePercent;
      const hostFeePercent = serviceType === 'accommodation'
        ? PLATFORM_FEES.accommodation.hostFeePercent
        : PLATFORM_FEES[serviceType].providerFeePercent;
      const discountedListingSubtotalRwf = roundToCurrency(amountInRwf / (1 + (guestFeePercent / 100)), 'RWF');
      const hostFeeAmountRwf = roundToCurrency((discountedListingSubtotalRwf * hostFeePercent) / 100, 'RWF');
      const hostEarningsAmountRwf = discountedListingSubtotalRwf - hostFeeAmountRwf;
      
      // Create a single checkout request with all cart items in metadata
      const checkoutData: any = {
        user_id: user?.id || null,
        name: formData.fullName,
        email: formData.email,
        phone: fullPhone || normalizedPhone,
        message: formData.notes || null,
        // Card payments are stored in USD; all other methods store in RWF.
        total_amount: paymentMethod === 'card' ? cardAmountUsd! : roundToCurrency(amountInRwf, 'RWF'),
        currency: paymentMethod === 'card' ? 'USD' : 'RWF',
        // Fee breakdown fields
        base_price_amount: discountedListingSubtotalRwf,
        service_fee_amount: roundToCurrency(serviceFees * (displayCurrency === 'RWF' ? 1 : (amountInRwf / payableAmount)), 'RWF'),
        host_earnings_amount: hostEarningsAmountRwf,
        payment_status: 'pending',
        payment_method: paymentMethod === 'card' ? 'card' : paymentMethod === 'bank' ? 'bank_transfer' : 'mobile_money',
        metadata: {
          items: cartItemsWithPrices,
          booking_details: bookingDetails,
          guest_info: {
            name: formData.fullName,
            email: formData.email,
            phone: fullPhone || normalizedPhone,
            billing_address: billingAddress,
          },
          billing_address: billingAddress,
          special_requests: formData.notes || null,
          discount_code: appliedDiscount?.code || null,
          discount_amount: discount,
          payment_type: paymentType,
          total_participants: hasGroupBooking ? tourParticipants : 1,
          group_total: hasGroupBooking ? total : null,
          selected_payment_method_id: paymentMethod,
          selected_saved_payment_method_id: selectedSavedMethodId,
          payment_country_code: isMobileMoneyMethod ? countryCode : null,
          save_payment_method: Boolean(user),
          payment_provider: (() => {
            if (paymentMethod === 'card') return 'FLUTTERWAVE';
            if (paymentMethod === 'bank') return 'BANK_TRANSFER';
            const methodInfo = PAWAPAY_METHODS.find(m => m.id === paymentMethod);
            return methodInfo?.provider || paymentMethod.toUpperCase();
          })(),
        },
      };

      console.log("📝 Creating checkout with data:", {
        ...checkoutData,
        metadata: { ...checkoutData.metadata, items: `[${cartItemsWithPrices.length} items]` }
      });

      const { data: checkout, error: checkoutError } = await (supabase
        .from("checkout_requests")
        .insert(checkoutData)
        .select("id")
        .single() as any);

      if (checkoutError) {
        console.error("❌ Checkout insert error:", checkoutError);
        throw checkoutError;
      }
      const checkoutId = checkout.id;

      // For bank transfer, create pending bookings and show confirmation
      if (paymentMethod === 'bank') {
        const defaultDates = getDefaultBookingDates();
        const bookingRows = cartItemsWithPrices.map((item) => {
          const mappedBookingType: 'property' | 'tour' | 'transport' =
            item.item_type === 'property'
              ? 'property'
              : (item.item_type === 'transport_vehicle' || item.item_type === 'airport_transfer_pricing' || item.item_type === 'transport_route' || item.item_type === 'transport_service')
                ? 'transport'
                : 'tour';

          const isProperty = item.item_type === 'property';
          const propertyCheckIn = toDateOnly(item.metadata?.check_in) || toDateOnly(bookingDetails?.check_in) || defaultDates.checkIn;
          const propertyCheckOut = toDateOnly(item.metadata?.check_out) || toDateOnly(bookingDetails?.check_out) || addDays(propertyCheckIn, 1);

          const itemAmount = Math.max(0, Number(item.calculated_price ?? 0));
          const breakfastRequestText = isProperty
            ? (item.metadata?.breakfast_included
                ? `Breakfast included (+${Number(item.metadata?.breakfast_total || 0).toFixed(2)} ${item.currency || 'RWF'})`
                : 'Breakfast not included')
            : null;
          const specialRequests = [formData.notes || null, breakfastRequestText].filter(Boolean).join(' | ') || null;

          return {
            order_id: checkoutId,
            guest_id: user?.id || null,
            property_id: item.item_type === 'property' ? item.reference_id : null,
            tour_id: (item.item_type === 'tour' || item.item_type === 'tour_package') ? item.reference_id : null,
            transport_id: item.item_type === 'transport_vehicle'
              ? item.reference_id
              : item.item_type === 'airport_transfer_pricing'
                ? item.transport_vehicle_id || null
                : null,
            booking_type: mappedBookingType,
            check_in: isProperty ? propertyCheckIn : defaultDates.checkIn,
            check_out: isProperty ? propertyCheckOut : defaultDates.checkOut,
            guests: isProperty
              ? Number(item.metadata?.guests || bookingDetails?.guests || 1)
              : Number((item.metadata as any)?.participants || item.quantity || 1),
            total_price: roundToCurrency(itemAmount, item.calculated_price_currency || item.currency || 'RWF'),
            currency: item.calculated_price_currency || item.currency || 'RWF',
            status: 'pending',
            payment_status: 'pending',
            payment_method: 'bank_transfer',
            special_requests: specialRequests,
            guest_name: formData.fullName || null,
            guest_email: formData.email || null,
            guest_phone: fullPhone || normalizedPhone,
            is_guest_booking: !user,
          };
        });

        const { error: pendingBookingsError } = await (supabase
          .from('bookings')
          .insert(bookingRows as any) as any);

        if (pendingBookingsError) {
          console.error('❌ Pending bookings insert error:', pendingBookingsError);
          throw pendingBookingsError;
        }

        try {
          const pendingOrderEmailRes = await fetch("/api/booking-confirmation-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "pending_order",
              checkoutId,
              guestName: formData.fullName,
              guestEmail: formData.email,
              guestPhone: fullPhone || normalizedPhone,
              totalAmount: roundToCurrency(amountInRwf, 'RWF'),
              currency: 'RWF',
              paymentMethod: 'bank_transfer',
              items: cartItemsWithPrices.map((item) => ({
                item_type: item.item_type,
                reference_id: item.reference_id,
                title: item.title,
                quantity: item.quantity,
                total_price: item.calculated_price,
              })),
            }),
          });

          if (!pendingOrderEmailRes.ok) {
            const details = await pendingOrderEmailRes.json().catch(() => ({}));
            console.warn("Pending-order email notification failed", details);
          }
        } catch (emailError) {
          console.warn("Pending-order email request failed", emailError);
        }

        await clearCart();
        localStorage.removeItem("applied_discount");
        clearCheckoutDraft();

        // Redirect to booking success with a message about expecting a call
        navigate(`/booking-success?checkoutId=${checkoutId}&method=${paymentMethod}`);
        return;
      }

      if (paymentMethod === 'card') {
        // cardAmountUsd was computed and stored in the checkout row above — use it directly.
        // No re-conversion needed; the DB and Flutterwave both see the same USD figure.
        const cardInitResponse = await fetch("/api/flutterwave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create-payment",
            inline: true,
            checkoutId,
            amount: cardAmountUsd,
            currency: 'USD',
            payerName: formData.fullName,
            payerEmail: formData.email,
            phoneNumber: fullPhone || normalizedPhone,
            description: `Merry360x Booking - ${cartItems.length} item(s)`,
            billingAddress,
            metadata: {
              item_count: cartItems.length,
              payment_type: paymentType,
              selected_saved_payment_method_id: selectedSavedMethodId,
            },
          }),
        });

        const cardInitData = await cardInitResponse.json().catch(() => ({}));
        if (!cardInitResponse.ok || !cardInitData?.txRef) {
          throw new Error(cardInitData?.error || cardInitData?.message || 'Unable to initialize card payment');
        }

        await loadFlutterwaveInlineSdk();

        const capturedCheckoutId = checkoutId;
        const capturedTxRef = cardInitData.txRef;
        const capturedAmount = cardAmountUsd;

        (window as any).FlutterwaveCheckout({
          public_key: import.meta.env.VITE_FLW_PUBLIC_KEY,
          tx_ref: capturedTxRef,
          amount: capturedAmount,
          currency: 'USD',
          payment_options: 'card',
          customer: {
            email: formData.email,
            name: formData.fullName,
            phone_number: fullPhone || normalizedPhone || undefined,
          },
          customizations: {
            title: 'Merry360x',
            description: `Booking - ${cartItems.length} item(s)`,
            logo: `${window.location.origin}/brand/logo.png`,
          },
          meta: {
            checkout_id: capturedCheckoutId,
            billing_country: billingAddress.countryCode,
          },
          callback: async (data: any) => {
            const txId = String(data?.transaction_id || data?.id || '');
            const status = String(data?.status || '').toLowerCase();
            if (status === 'successful' || status === 'completed') {
              await clearCart();
              localStorage.removeItem("applied_discount");
              clearCheckoutDraft();
              navigate(
                `/payment-pending?checkoutId=${encodeURIComponent(capturedCheckoutId)}&provider=flutterwave&tx_ref=${encodeURIComponent(capturedTxRef)}&transaction_id=${encodeURIComponent(txId)}`,
                { replace: true }
              );
              return;
            }

            setIsProcessing(false);
            navigate(
              `/payment-failed?checkoutId=${encodeURIComponent(capturedCheckoutId)}&provider=flutterwave&reason=${encodeURIComponent(status || 'Payment not completed')}`,
              { replace: true }
            );
          },
          onclose: () => {
            setIsProcessing(false);
          },
        });
        return;
      }

      // Get the selected payment method info to determine the payment currency
      const selectedMethodInfo = PAWAPAY_METHODS.find(m => m.id === paymentMethod);
      const provider = selectedMethodInfo?.provider || 'MTN';
      const paymentCurrency = selectedMethodInfo?.currency || 'RWF';
      
      // Convert amount from RWF to payment method's currency
      let paymentAmount = amountInRwf;
      if (paymentCurrency !== 'RWF') {
        const converted = convertAmount(amountInRwf, 'RWF', paymentCurrency, usdRates);
        if (!converted) {
          throw new Error(`Unable to convert RWF to ${paymentCurrency}. Please try again.`);
        }
        paymentAmount = converted;
        console.log("💱 Converted payment amount:", {
          from: 'RWF',
          to: paymentCurrency,
          original: amountInRwf,
          converted: paymentAmount
        });
      }
      
      const finalAmount = roundToCurrency(paymentAmount, paymentCurrency);
      
      // Validate amount before initiating payment
      const minAmount = paymentCurrency === 'RWF' ? 100 : 
                        paymentCurrency === 'KES' ? 10 :
                        paymentCurrency === 'UGX' ? 500 :
                        paymentCurrency === 'TZS' ? 500 :
                        paymentCurrency === 'GHS' ? 1 :
                        paymentCurrency === 'CDF' ? 500 :
                        paymentCurrency === 'XAF' ? 100 :
                        paymentCurrency === 'XOF' ? 100 :
                        paymentCurrency === 'MZN' ? 10 :
                        paymentCurrency === 'MWK' ? 100 :
                        paymentCurrency === 'BIF' ? 500 :
                        paymentCurrency === 'ZMW' ? 1 : 100;
      const maxAmount = paymentCurrency === 'RWF' ? 2_000_000 : Number.POSITIVE_INFINITY;
      
      if (finalAmount < minAmount) {
        throw new Error(`Minimum payment amount is ${minAmount} ${paymentCurrency}`);
      }

      if (finalAmount > maxAmount) {
        throw new Error(`Payment amount exceeds the provider limit (${maxAmount} ${paymentCurrency}). Please reduce the amount and try again.`);
      }

      // Initiate PawaPay payment for mobile money
      console.log("🔄 Initiating PawaPay payment:", {
        checkoutId,
        amount: finalAmount,
        currency: paymentCurrency,
        phoneNumber: fullPhone,
        provider,
        country: countryCode,
        paymentMethodId: paymentMethod,
      });

      const paymentResponse = await fetch("/api/pawapay-create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutId,
          amount: finalAmount,
          currency: paymentCurrency,
          phoneNumber: fullPhone,
          description: `Merry360x Booking - ${cartItems.length} item(s)`,
          payerEmail: formData.email,
          payerName: formData.fullName,
          provider,
        }),
      });

      const paymentData = await paymentResponse.json();
      console.log("📥 PawaPay API response:", paymentData);

      // Check if payment was immediately rejected
      if (paymentData.success === false || paymentData.status === 'REJECTED' || paymentData.status === 'FAILED') {
        console.error("❌ Payment rejected:", paymentData);
        
        // Extract detailed error information
        const failureCode = paymentData.failureCode || paymentData.data?.reason;
        const errorMsg = paymentData.message || "Payment could not be processed";
        
        console.error("Failure code:", failureCode);
        console.error("Error message:", errorMsg);
        
        const friendlyError = getFriendlyPaymentErrorMessage(
          failureCode ? `${failureCode}: ${errorMsg}` : errorMsg
        );
        setPaymentError(friendlyError);
        setIsProcessing(false);
        
        toast({
          title: "Payment Failed",
          description: friendlyError,
          variant: "destructive",
        });
        return;
      }

      if (!paymentResponse.ok) {
        console.error("❌ PawaPay API error:", paymentData);
        throw new Error(paymentData.error || paymentData.message || "Payment initiation failed");
      }

      // Ensure we have a depositId
      if (!paymentData.depositId) {
        console.error("❌ Missing depositId in response:", paymentData);
        throw new Error("Invalid payment response - missing deposit ID");
      }

      console.log("✅ Payment initiated successfully:", paymentData.depositId);

      // Clear cart
      await clearCart();
      localStorage.removeItem("applied_discount");
      clearCheckoutDraft();

      // Show success message
      toast({
        title: "Payment Initiated",
        description: "Check your phone to complete the payment",
      });

      // Redirect to payment pending
      navigate(`/payment-pending?checkoutId=${checkoutId}&depositId=${paymentData.depositId}`);
      
    } catch (error: any) {
      console.error("Payment error:", error);
      setPaymentError(getFriendlyPaymentErrorMessage(error.message));
      setIsProcessing(false);
    }
  };

  if (!authLoading && !isLoading && cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-semibold mb-2">{t("checkout.emptyCart")}</h1>
          <p className="text-muted-foreground mb-6">
            {t("checkout.emptyCartDesc")}
          </p>
          <Link to="/trip-cart">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("checkout.backToTripCart")}
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-12 pb-40 md:pb-12">
        <div ref={checkoutStepTopRef} />
        {/* Header */}
        <div className="mb-8">
          <Link to="/trip-cart" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t("checkout.backToCart")}
          </Link>
          <h1 className="text-3xl md:text-4xl font-light tracking-tight">{t("checkout.title")}</h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="min-w-0 lg:col-span-2">
            {/* Progress Steps */}
            <div className="mb-8 md:hidden">
              <div className="flex items-center">
                {STEP_ORDER.map((step, index) => {
                  const isActive = step === currentStep;
                  const isCompleted = STEP_ORDER.indexOf(currentStep) > index;
                  const stepNumber = index + 1;

                  return (
                    <Fragment key={step}>
                      <button
                        onClick={() => {
                          if (isCompleted) goToStep(step);
                        }}
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors",
                          isActive && "bg-primary text-primary-foreground",
                          isCompleted && "cursor-pointer bg-green-500 text-white hover:bg-green-600",
                          !isActive && !isCompleted && "bg-muted text-muted-foreground"
                        )}
                      >
                        {stepNumber}
                      </button>
                      {index < STEP_ORDER.length - 1 && (
                        <div
                          className={cn(
                            "mx-2 h-px min-w-0 flex-1",
                            isCompleted ? "bg-green-500" : "bg-border"
                          )}
                        />
                      )}
                    </Fragment>
                  );
                })}
              </div>
            </div>

            <div className="mb-8 hidden items-center md:flex">
              {STEP_ORDER.map((step, index) => {
                const isActive = step === currentStep;
                const isCompleted = STEP_ORDER.indexOf(currentStep) > index;
                const stepNumber = index + 1;
                const labels = { details: t("checkout.steps.details"), payment: t("checkout.steps.payment"), confirm: t("checkout.steps.confirm") };

                return (
                  <div key={step} className="flex min-w-0 flex-1 items-center">
                    <button
                      onClick={() => {
                        if (isCompleted) goToStep(step);
                      }}
                      className={cn(
                        "flex min-w-0 items-center gap-2 transition-colors",
                        isActive && "text-foreground",
                        isCompleted && "cursor-pointer text-foreground hover:text-primary",
                        !isActive && !isCompleted && "text-muted-foreground"
                      )}
                    >
                      <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                        isActive && "bg-primary text-primary-foreground",
                        isCompleted && "bg-green-500 text-white",
                        !isActive && !isCompleted && "bg-muted text-muted-foreground"
                      )}>
                        {stepNumber}
                      </div>
                      <span className="min-w-0 truncate text-sm font-medium">{labels[step]}</span>
                    </button>
                    {index < STEP_ORDER.length - 1 && (
                      <div
                        className={cn(
                          "mx-4 h-px flex-1",
                          isCompleted ? "bg-green-500" : "bg-border"
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Step Content */}
            <div className="min-w-0 overflow-hidden bg-card rounded-2xl border border-border/50 p-4 sm:p-6 md:p-8">
              {/* Step 1: Details */}
              {currentStep === 'details' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold mb-1">{t("checkout.contact.title")}</h2>
                      <p className="text-sm text-muted-foreground">{t("checkout.contact.subtitle")}</p>
                    </div>
                    {/* Quick Pay - Skip to payment if details are complete */}
                    {formData.fullName && formData.email && phoneNumber && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (isDetailsValid) {
                            commitDraftStayDates();
                            goToStep('payment');
                            toast({ title: "Fast checkout enabled", description: "Your details are pre-filled" });
                          }
                        }}
                        className="shrink-0"
                      >
                        <ArrowRight className="w-4 h-4 mr-2" />
                        {t("checkout.contact.quickPay")}
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid gap-4">
                    {isDirectPropertyCheckout && (
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">Stay Dates</p>
                          <span className="text-xs text-muted-foreground">Editable on mobile</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="checkInDate">Check-in</Label>
                            <Input
                              id="checkInDate"
                              type="date"
                              value={draftStayDates.checkIn}
                              min={formatDateOnlyLocal(new Date())}
                              onChange={(e) => {
                                const nextCheckIn = e.target.value;
                                if (!nextCheckIn) return;

                                setDraftStayDates((prev) => {
                                  const nextCheckOut = !prev.checkOut || prev.checkOut <= nextCheckIn
                                    ? addDaysToDateOnly(nextCheckIn, 1)
                                    : prev.checkOut;

                                  return {
                                    checkIn: nextCheckIn,
                                    checkOut: nextCheckOut,
                                  };
                                });
                              }}
                              className="mt-1.5"
                            />
                          </div>

                          <div>
                            <Label htmlFor="checkOutDate">Check-out</Label>
                            <Input
                              id="checkOutDate"
                              type="date"
                              value={draftStayDates.checkOut}
                              min={draftStayDates.checkIn || formatDateOnlyLocal(new Date())}
                              onChange={(e) => {
                                const nextCheckOut = e.target.value;
                                if (!nextCheckOut || !draftStayDates.checkIn) return;

                                setDraftStayDates((prev) => ({
                                  ...prev,
                                  checkOut: nextCheckOut,
                                }));
                              }}
                              className="mt-1.5"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-1">
                          <p className="text-xs text-muted-foreground">
                            Dates update after you confirm them.
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => commitDraftStayDates()}
                            disabled={!stayDatesDirty || !stayDatesValid}
                          >
                            Update dates
                          </Button>
                        </div>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="fullName">{t("checkout.contact.fullName")}</Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                        placeholder="John Doe"
                        className="mt-1.5"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">{t("checkout.contact.email")}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="john@example.com"
                        className="mt-1.5"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="notes">{t("checkout.contact.specialRequests")}</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder={t("checkout.contact.specialRequestsPlaceholder")}
                        rows={3}
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  <Button 
                    size="lg" 
                    className="hidden md:flex w-full"
                    onClick={() => {
                      commitDraftStayDates();
                      goToStep('payment');
                    }}
                    disabled={!isDetailsValid}
                  >
                    {t("checkout.contact.continue")}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {/* Step 2: Payment */}
              {currentStep === 'payment' && (
                <div className="space-y-4 md:space-y-6">
                  <div>
                    <h2 className="text-lg md:text-xl font-semibold mb-1">{t("checkout.payment.title")}</h2>
                    <p className="text-xs md:text-sm text-muted-foreground">{t("checkout.payment.subtitle")}</p>
                  </div>

                  <div className={cn("grid gap-2 md:gap-3", isAfricanRegion === false ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
                    {/* Mobile Money tab — only shown in African PawaPay regions */}
                    {isAfricanRegion === true && (
                    <button
                      onClick={() => {
                        if (defaultSavedMobileMethod) {
                          applySavedMobileMethod(defaultSavedMobileMethod);
                          return;
                        }

                        const nextMethod = isMobileMoneyMethod ? paymentMethod : lastMobileMethod;
                        setPaymentMethod(nextMethod || geoDefaults?.method || 'mtn_rwa');
                        setSelectedSavedMethodId(null);
                        setShowContactModal(false);
                      }}
                      className={cn(
                        "border-2 rounded-lg md:rounded-xl p-3 md:p-4 text-left transition-all",
                        isMobileMoneyMethod ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg border border-border bg-background flex items-center justify-center flex-shrink-0">
                          <Smartphone className="w-4 h-4 md:w-5 md:h-5 text-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm md:text-base truncate">Mobile Money</p>
                          <p className="text-xs text-muted-foreground hidden sm:block">MTN, Airtel, M-Pesa, Zamtel</p>
                        </div>
                      </div>
                    </button>
                    )}

                    <button
                      onClick={() => {
                        if (isMobileMoneyMethod) setLastMobileMethod(paymentMethod);
                        setPaymentMethod('card');
                        setSelectedSavedMethodId(defaultSavedCardMethod?.id || null);
                        setShowContactModal(false);
                      }}
                      className={cn(
                        "border-2 rounded-lg md:rounded-xl p-3 md:p-4 text-left transition-all",
                        paymentMethod === 'card'
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg border border-border bg-background flex items-center justify-center flex-shrink-0">
                          <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm md:text-base truncate">{t("checkout.payment.card")}</p>
                          <div className="hidden sm:flex items-center gap-1.5 mt-1">
                            {CARD_BRAND_LOGOS.map((brand) => (
                              <span
                                key={brand.alt}
                                className="h-5 rounded-sm border border-border/70 bg-white px-1.5 py-0.5 flex items-center justify-center"
                              >
                                <img src={brand.src} alt={brand.alt} className="h-3 w-auto" loading="lazy" />
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        if (isMobileMoneyMethod) setLastMobileMethod(paymentMethod);
                        setPaymentMethod('bank');
                        setSelectedSavedMethodId(null);
                        setShowContactModal(true);
                      }}
                      className={cn(
                        "border-2 rounded-lg md:rounded-xl p-3 md:p-4 text-left transition-all",
                        paymentMethod === 'bank'
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg border border-border bg-background flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 md:w-5 md:h-5 text-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm md:text-base truncate">{t("checkout.payment.bankTransfer")}</p>
                          <p className="text-xs text-muted-foreground hidden sm:block">{t("checkout.payment.bankTransferDesc")}</p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {user && (savedMethodsLoading || savedPaymentMethods.length > 0) && (
                    <div className="rounded-xl border border-border bg-card p-3 md:p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-foreground" />
                          <p className="text-sm font-medium text-foreground">Saved payment methods</p>
                        </div>
                        {savedMethodsLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                      </div>

                      {!savedMethodsLoading && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {savedPaymentMethods.slice(0, 4).map((savedMethod) => {
                            const isCardMethod = savedMethod.method_type === 'card';
                            const isSelected = selectedSavedMethodId === savedMethod.id;
                            const title = isCardMethod
                              ? (savedMethod.display_name || `${savedMethod.card_brand || 'Card'}${savedMethod.card_last4 ? ` •••• ${savedMethod.card_last4}` : ''}`)
                              : (savedMethod.display_name || `${savedMethod.provider} Mobile Money`);
                            const subtitle = isCardMethod
                              ? (savedMethod.card_expiry ? `Exp ${savedMethod.card_expiry}` : 'Secure card vault')
                              : `${savedMethod.country_code || ''} ${maskPhoneNumber(savedMethod.phone_number)}`.trim();

                            return (
                              <button
                                key={savedMethod.id}
                                type="button"
                                onClick={() => applySavedPaymentMethod(savedMethod)}
                                className={cn(
                                  "rounded-lg border p-3 text-left transition-all",
                                  isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{title}</p>
                                    <p className="text-xs text-muted-foreground truncate">{subtitle || 'Saved method'}</p>
                                  </div>
                                  {isCardMethod ? (
                                    <CreditCard className="w-4 h-4 text-muted-foreground shrink-0" />
                                  ) : (
                                    <Smartphone className="w-4 h-4 text-muted-foreground shrink-0" />
                                  )}
                                </div>
                                {savedMethod.is_default && (
                                  <span className="inline-flex mt-2 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                    Default
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {!savedMethodsLoading && savedPaymentMethods.length > 4 && (
                        <p className="text-xs text-muted-foreground">Showing your 4 most recent methods.</p>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Saved cards are stored as masked details and provider tokens only. CVV is never stored.
                      </p>
                    </div>
                  )}

                  {/* Payment Methods by Country */}
                  {isMobileMoneyMethod && <div className="space-y-4">
                    {visibleMobileMoneyCountries.map(([country, { countryCode: cc, currency, methods }]) => {
                      const selectedMethod = PAWAPAY_METHODS.find(m => m.id === paymentMethod);
                      const isCountrySelected = selectedMethod?.country === country;
                      const convertedTotal = currency === displayCurrency 
                        ? total 
                        : (convertAmount(total, displayCurrency, currency, usdRates) ?? total);
                      
                      return (
                        <div key={country} className={cn(
                          "border rounded-xl overflow-hidden transition-all",
                          isCountrySelected ? "border-primary ring-2 ring-primary/20" : "border-border"
                        )}>
                          {/* Country Header */}
                          <div className={cn(
                            "px-4 py-3 flex items-center justify-between",
                            isCountrySelected ? "bg-primary/5" : "bg-muted/30"
                          )}>
                            <div className="flex items-center gap-2">
                              <div>
                                <span className="font-medium">{country}</span>
                                <span className="text-xs text-muted-foreground ml-2">({cc})</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{formatMoney(convertedTotal, currency)}</p>
                              <p className="text-xs text-muted-foreground">{currency}</p>
                            </div>
                          </div>
                          
                          {/* Payment Methods for this country */}
                          <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {methods.map((method) => {
                              const isSelected = paymentMethod === method.id;
                              return (
                                <button
                                  key={method.id}
                                  onClick={() => {
                                    setLastMobileMethod(method.id);
                                    setPaymentMethod(method.id);
                                    setCountryCode(method.countryCode);
                                    setCurrency(method.currency as any);
                                    setSelectedSavedMethodId(null);
                                  }}
                                  className={cn(
                                    "border-2 rounded-lg p-2.5 text-center transition-all",
                                    isSelected 
                                      ? "border-primary bg-primary/10" 
                                      : "border-transparent bg-muted/30 hover:border-primary/30"
                                  )}
                                >
                                  <div className={cn(
                                    "w-10 h-10 rounded-lg mx-auto flex items-center justify-center",
                                    method.color
                                  )}>
                                    <span className={cn("font-bold text-xs", method.textColor)}>
                                      {method.shortName}
                                    </span>
                                  </div>
                                  <p className="text-xs font-medium mt-1.5 truncate">{method.name}</p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {visibleMobileMoneyCountries.length === 0 && (
                      <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                        Mobile money providers are not available for your detected region.
                      </div>
                    )}
                  </div>}

                  {/* Card checkout — USD amount + billing details */}
                  {paymentMethod === 'card' && (
                    <div className="rounded-xl border border-border bg-card p-4 md:p-5 space-y-4">
                      {/* Header row */}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-2">
                          <CreditCard className="w-5 h-5 text-foreground" />
                          <p className="text-sm font-semibold text-foreground">Pay with Card</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {CARD_BRAND_LOGOS.map((brand) => (
                            <span
                              key={brand.alt}
                              className="h-6 rounded-md border border-border/70 bg-white px-1.5 py-1 flex items-center justify-center"
                            >
                              <img src={brand.src} alt={brand.alt} className="h-3.5 w-auto" loading="lazy" />
                            </span>
                          ))}
                        </div>
                      </div>

                      {selectedSavedCardMethod && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                          Using saved card: {selectedSavedCardMethod.display_name || `${selectedSavedCardMethod.card_brand || 'Card'}${selectedSavedCardMethod.card_last4 ? ` •••• ${selectedSavedCardMethod.card_last4}` : ''}`}
                          {selectedSavedCardMethod.card_expiry ? ` (Exp ${selectedSavedCardMethod.card_expiry})` : ''}
                        </div>
                      )}

                      {/* USD amount badge */}
                      {(() => {
                        const inRwf = displayCurrency === 'RWF'
                          ? payableAmount
                          : (convertAmount(payableAmount, displayCurrency, 'RWF', usdRates) ?? 0);
                        const rawUsd = inRwf ? convertAmount(inRwf, 'RWF', 'USD', usdRates) : null;
                        const usdAmt = rawUsd ? roundToCurrency(rawUsd, 'USD') : null;
                        return usdAmt && usdAmt > 0 ? (
                          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-800/50 dark:bg-emerald-950/30 sm:items-center">
                            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <p className="min-w-0 break-words text-sm text-emerald-700 dark:text-emerald-300">
                              You'll be charged <strong>${usdAmt.toFixed(2)} USD</strong> · Visa, Mastercard and AmEx accepted worldwide
                            </p>
                          </div>
                        ) : null;
                      })()}

                      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">Billing address</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Required for international cards, especially Canada and US cards using address verification.
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="billingAddress1">Address line 1</Label>
                          <Input
                            id="billingAddress1"
                            value={formData.billingAddress1}
                            onChange={(e) => setFormData((prev) => ({ ...prev, billingAddress1: e.target.value }))}
                            placeholder="123 Main St"
                            className="mt-1.5"
                          />
                        </div>

                        <div>
                          <Label htmlFor="billingAddress2">Address line 2 (optional)</Label>
                          <Input
                            id="billingAddress2"
                            value={formData.billingAddress2}
                            onChange={(e) => setFormData((prev) => ({ ...prev, billingAddress2: e.target.value }))}
                            placeholder="Apartment, suite, unit"
                            className="mt-1.5"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="billingCity">City</Label>
                            <Input
                              id="billingCity"
                              value={formData.billingCity}
                              onChange={(e) => setFormData((prev) => ({ ...prev, billingCity: e.target.value }))}
                              placeholder="Toronto"
                              className="mt-1.5"
                            />
                          </div>
                          <div>
                            <Label htmlFor="billingPostalCode">Postal code</Label>
                            <Input
                              id="billingPostalCode"
                              value={formData.billingPostalCode}
                              onChange={(e) => setFormData((prev) => ({ ...prev, billingPostalCode: e.target.value }))}
                              placeholder="M5V 2T6"
                              className="mt-1.5"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="billingCountry">Billing country</Label>
                            <select
                              id="billingCountry"
                              value={formData.billingCountry}
                              onChange={(e) => setFormData((prev) => ({ ...prev, billingCountry: e.target.value }))}
                              className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                            >
                              {BILLING_COUNTRY_OPTIONS.map((option) => (
                                <option key={option.code} value={option.code}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label htmlFor="billingState">
                              {requiresBillingState() ? 'State / Province' : 'State / Province (optional)'}
                            </Label>
                            <Input
                              id="billingState"
                              value={formData.billingState}
                              onChange={(e) => setFormData((prev) => ({ ...prev, billingState: e.target.value }))}
                              placeholder={getBillingCountryCode() === 'CA' ? 'Ontario' : 'State / Province'}
                              className="mt-1.5"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Security note */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <LockKeyhole className="w-3.5 h-3.5 shrink-0" />
                        <span>PCI-compliant · Card details entered on Flutterwave's secure modal · No full-page redirect</span>
                      </div>
                    </div>
                  )}

                  {/* Phone Number Input - only for mobile money */}
                  {paymentMethod !== 'card' && paymentMethod !== 'bank' && (
                    <>
                      <div>
                        <Label htmlFor="phone">{t("checkout.payment.phoneNumber")}</Label>
                        <div className="flex flex-col sm:flex-row gap-2 mt-1.5">
                          <div className="h-11 px-3 rounded-lg border bg-muted/50 flex items-center text-sm w-fit">
                            {countryCode}
                          </div>
                          <div className="relative flex-1">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="phone"
                              type="tel"
                              value={phoneNumber}
                              onChange={(e) => {
                                setPhoneNumber(e.target.value.replace(/\D/g, ''));
                                setSelectedSavedMethodId(null);
                              }}
                              placeholder="78XXXXXXX"
                              className="pl-10 h-11"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          You'll receive a {PAWAPAY_METHODS.find(m => m.id === paymentMethod)?.name} payment prompt on this number
                        </p>
                      </div>

                      {/* Info Box */}
                      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4">
                        <div className="flex gap-3">
                          <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">{t("checkout.payment.howItWorks")}</p>
                            <ol className="text-blue-600 dark:text-blue-400 space-y-1 list-decimal list-inside">
                              <li>Click "Review Booking" below</li>
                              <li>You'll receive a payment prompt on your phone</li>
                              <li>Enter your PIN to confirm</li>
                              <li>We'll confirm your booking automatically</li>
                            </ol>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex md:flex-row gap-3">
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={() => goToStep('details')}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button 
                      size="lg" 
                      className="hidden md:flex flex-1"
                      onClick={() => goToStep('confirm')}
                      disabled={!isPaymentValid}
                    >
                      {t("checkout.payment.reviewBooking")}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>

                  {paymentMethod === 'card' && !isCardBillingValid && (
                    <p className="text-xs text-center text-muted-foreground">
                      Complete your billing address to continue with card payment.
                    </p>
                  )}
                </div>
              )}

              {/* Step 3: Confirm */}
              {currentStep === 'confirm' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">{t("checkout.review.title")}</h2>
                    <p className="text-sm text-muted-foreground">{t("checkout.review.subtitle")}</p>
                  </div>

                  {/* Order Items */}
                  <div className="divide-y rounded-xl border overflow-hidden">
                    {cartItems.map((item) => {
                      const itemPrice = convertAmount(item.price * item.quantity, item.currency, displayCurrency, usdRates) ?? item.price * item.quantity;
                      const mode = searchParams.get("mode");
                      const checkIn = searchParams.get("checkIn");
                      const checkOut = searchParams.get("checkOut");
                      const guests = searchParams.get("guests");
                      
                      return (
                        <div key={item.id} className="min-w-0 overflow-hidden p-4">
                          <div className="flex min-w-0 gap-4">
                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                              {item.image ? (
                                <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  {getItemIcon(item.item_type)}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="truncate font-medium">{item.title}</h4>
                              <p className="break-words text-sm text-muted-foreground sm:truncate">
                                {mode === 'booking' && checkIn && checkOut && item.item_type === 'property' 
                                  ? `${formatDateForDisplay(checkIn)} - ${formatDateForDisplay(checkOut)} • ${guests || 1} guest(s) • ${item.quantity} night(s)`
                                  : `Qty: ${item.quantity}`
                                }
                              </p>
                              <p className="mt-2 text-sm font-medium sm:hidden">{formatMoney(itemPrice, displayCurrency)}</p>
                            </div>
                            <div className="hidden shrink-0 text-right sm:block">
                              <p className="whitespace-nowrap text-sm font-medium md:text-base">{formatMoney(itemPrice, displayCurrency)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Contact & Payment Summary */}
                  <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                    <div className="bg-muted/30 rounded-xl p-4">
                      <h4 className="text-sm font-medium mb-2">{t("checkout.review.contactDetails")}</h4>
                      <p className="break-words text-sm">{formData.fullName}</p>
                      <p className="break-words text-sm text-muted-foreground">{formData.email}</p>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-4">
                      <h4 className="text-sm font-medium mb-2">{t("checkout.review.paymentMethod")}</h4>
                      {(() => {
                        const selectedMethodInfo = PAWAPAY_METHODS.find(m => m.id === paymentMethod);
                        const isMobileMoney = selectedMethodInfo != null;
                        
                        return (
                          <>
                            <div className="min-w-0 text-sm">
                              {isMobileMoney && selectedMethodInfo && (
                                <span className="flex min-w-0 items-center gap-2">
                                  {selectedMethodInfo.name}
                                </span>
                              )}
                              {paymentMethod === 'card' && (
                                selectedSavedCardMethod?.display_name ||
                                `${selectedSavedCardMethod?.card_brand || 'Credit / Debit Card'}${selectedSavedCardMethod?.card_last4 ? ` •••• ${selectedSavedCardMethod.card_last4}` : ''}`
                              )}
                              {paymentMethod === 'bank' && 'Bank Transfer'}
                              {!isMobileMoney && paymentMethod !== 'card' && paymentMethod !== 'bank' && 'No payment method selected'}
                            </div>
                            {isMobileMoney && (
                              <p className="break-words text-sm text-muted-foreground">{countryCode} {phoneNumber}</p>
                            )}
                            {paymentMethod === 'card' && selectedSavedCardMethod?.card_expiry && (
                              <p className="text-sm text-muted-foreground">Exp {selectedSavedCardMethod.card_expiry}</p>
                            )}
                            {(paymentMethod === 'card' || paymentMethod === 'bank') && (
                              <p className="break-words text-sm text-muted-foreground">
                                {paymentMethod === 'card'
                                  ? 'Secure hover window (no iframe styling)'
                                  : 'Agent will call you'}
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Card/Bank notice */}
                  {(paymentMethod === 'card' || paymentMethod === 'bank') && (
                    <div className="rounded-xl border border-border bg-card p-4">
                        <div className="flex min-w-0 gap-3">
                        {paymentMethod === 'card' ? (
                          <LockKeyhole className="w-5 h-5 text-foreground shrink-0 mt-0.5" />
                        ) : (
                          <Clock className="w-5 h-5 text-foreground shrink-0 mt-0.5" />
                        )}
                          <div className="min-w-0 text-sm">
                          <p className="font-medium text-foreground mb-1">
                            {paymentMethod === 'card' ? 'Secure payment step' : 'Bank transfer follow-up'}
                          </p>
                            <p className="break-words text-muted-foreground">
                            {paymentMethod === 'card'
                              ? <>After clicking "Pay", the Flutterwave secure modal opens on this page. Enter your card details there — no full-page redirect, and card data never touches our servers.</>
                              : <>After clicking "Pay", our payment team will call you at <span className="font-medium text-foreground">{formData.email}</span> to complete your bank transfer.</>}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">Need help: +250 796 214 719</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Legal Acknowledgment Checkboxes */}
                  <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-medium mb-3">{t("checkout.review.beforeProceed")}</h4>
                    
                    <label className="group flex min-w-0 items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="min-w-0 break-words text-sm text-muted-foreground transition-colors group-hover:text-foreground">
                        {t("checkout.review.agreeTerms")}{' '}
                        <Link to="/terms-and-conditions" target="_blank" className="text-primary hover:underline font-medium">
                          {t("checkout.review.termsConditions")}
                        </Link>
                      </span>
                    </label>

                    <label className="group flex min-w-0 items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedPrivacy}
                        onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="min-w-0 break-words text-sm text-muted-foreground transition-colors group-hover:text-foreground">
                        I have read and understood the{' '}
                        <Link to="/privacy-policy" target="_blank" className="text-primary hover:underline font-medium">
                          {t("checkout.review.privacyPolicy")}
                        </Link>
                      </span>
                    </label>

                    <label className="group flex min-w-0 items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedCancellation}
                        onChange={(e) => setAcceptedCancellation(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="min-w-0 break-words text-sm text-muted-foreground transition-colors group-hover:text-foreground">
                        I understand the{' '}
                        <Link to="/refund-policy" target="_blank" className="text-primary hover:underline font-medium">
                          {t("checkout.review.cancellationPolicy")}
                        </Link>
                      </span>
                    </label>

                    <label className="group flex min-w-0 items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedAdult}
                        onChange={(e) => setAcceptedAdult(e.target.checked)}
                        disabled={profileAdultConfirmed}
                        className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-60"
                      />
                      <span className="min-w-0 break-words text-sm text-muted-foreground transition-colors group-hover:text-foreground">
                        I confirm I am 18 years or older.
                      </span>
                    </label>
                  </div>

                  {/* Error */}
                  {paymentError && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex gap-3">
                      <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-destructive">
                          {paymentError.includes("sign in") ? "Sign In Required" : "Payment Failed"}
                        </p>
                        <p className="text-sm text-destructive/80">{paymentError}</p>
                        {paymentError.includes("sign in") && (
                          <Link to="/auth" className="inline-block mt-2">
                            <Button size="sm" variant="destructive">
                              Sign In to Book
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex md:flex-row gap-3">
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={() => goToStep('payment')}
                      disabled={isProcessing}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button 
                      size="lg" 
                      className="hidden md:flex flex-1"
                      onClick={handlePayment}
                      disabled={isProcessing || !acceptedTerms || !acceptedPrivacy || !acceptedCancellation || !acceptedAdult}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay {formatMoney(payableAmount, displayCurrency)}
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Validation hint */}
                  {(!acceptedTerms || !acceptedPrivacy || !acceptedCancellation) && (
                    <p className="text-xs text-muted-foreground md:text-center">
                      {t("checkout.review.acceptAll")}
                    </p>
                  )}

                  {/* Security Note */}
                  <div className="flex flex-wrap items-center gap-2 pt-4 text-xs text-muted-foreground md:justify-center">
                    <Shield className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 break-words">{t("checkout.review.securedEncrypted")}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Booking Summary Sidebar */}
          <div className="min-w-0 lg:col-span-1">
            <div className="bg-card rounded-2xl border border-border/50 p-4 md:p-6 lg:sticky lg:top-24">
              <h2 className="text-lg font-semibold mb-4">{t("checkout.summary.title")}</h2>
              
              {/* Items Preview */}
              <div className="space-y-3 mb-4">
                {cartItems.slice(0, 3).map((item) => {
                  const isProperty = item.item_type === 'property';
                  const nights = isProperty && item.metadata?.nights ? item.metadata.nights : item.quantity;
                  const multiplier = isProperty ? nights : item.quantity;
                  const breakfastPerNight = isProperty && item.metadata?.breakfast_included
                    ? Number(item.metadata?.breakfast_price_per_night || 0)
                    : 0;
                  const breakfastTotal = breakfastPerNight > 0 ? breakfastPerNight * nights : 0;
                  const rawItemTotal = item.price * multiplier + breakfastTotal;
                  const itemPrice = convertAmount(rawItemTotal, item.currency, displayCurrency, usdRates) ?? rawItemTotal;
                  
                  return (
                    <div key={item.id} className="flex min-w-0 items-start gap-3 overflow-hidden">
                      <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {getItemIcon(item.item_type)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        {isProperty && item.metadata?.check_in && item.metadata?.check_out ? (
                          <>
                            <p className="break-words text-xs text-muted-foreground sm:truncate">
                              {new Date(item.metadata.check_in).toLocaleDateString()} - {new Date(item.metadata.check_out).toLocaleDateString()} ({nights} {nights === 1 ? 'night' : 'nights'})
                            </p>
                            <p className="break-words text-xs text-muted-foreground sm:truncate">
                              {item.metadata?.breakfast_included ? 'With breakfast' : 'Without breakfast'}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-right whitespace-nowrap shrink-0">{formatMoney(itemPrice, displayCurrency)}</p>
                    </div>
                  );
                })}
                {cartItems.length > 3 && (
                  <p className="text-sm text-muted-foreground">+{cartItems.length - 3} more items</p>
                )}
              </div>

              {/* Discount Code Input */}
              <div className="border-t pt-4 pb-2">
                {appliedDiscount ? (
                  <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">
                        {appliedDiscount.code}
                      </span>
                      <span className="text-xs text-green-600 dark:text-green-400">
                        ({appliedDiscount.discount_type === 'percentage' 
                          ? `${appliedDiscount.discount_value}% off` 
                          : (() => {
                              const converted = convertAmount(appliedDiscount.discount_value, appliedDiscount.currency, displayCurrency, usdRates);
                              return `${formatMoney(converted ?? appliedDiscount.discount_value, converted !== null ? displayCurrency : appliedDiscount.currency)} off`;
                            })()})
                      </span>
                    </div>
                    <button
                      onClick={handleRemoveDiscount}
                      className="text-red-500 hover:text-red-600 text-xs font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={discountCodeInput}
                        onChange={(e) => {
                          setDiscountCodeInput(e.target.value.toUpperCase());
                          setDiscountError(null);
                        }}
                        placeholder="Discount code"
                        className="flex-1 h-10 text-sm uppercase"
                      />
                      <Button
                        onClick={handleApplyDiscount}
                        variant="outline"
                        size="sm"
                        disabled={discountLoading || !discountCodeInput.trim()}
                        className="h-10 px-4 w-full sm:w-auto"
                      >
                        {discountLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Apply"
                        )}
                      </Button>
                    </div>
                    {discountError && (
                      <p className="text-xs text-red-500">{discountError}</p>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowPriceBreakdown((prev) => !prev)}
                className="w-full border-t pt-4 flex items-center justify-between text-sm font-medium text-foreground"
              >
                <span>Price breakdown</span>
                {showPriceBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showPriceBreakdown && (
              <>
              <div className="space-y-3 text-sm">
                {/* Base price (before any discounts) */}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("common.basePrice")}</span>
                  <span>{formatMoney(subtotal, displayCurrency)}</span>
                </div>
                
                {/* Stay discount (weekly/monthly) */}
                {stayDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {cartItems.some(i => i.item_type === 'property' && (i.metadata?.nights ?? 0) >= 30) 
                        ? 'Monthly stay discount' 
                        : 'Weekly stay discount'}
                    </span>
                    <span>-{formatMoney(stayDiscount, displayCurrency)}</span>
                  </div>
                )}
                
                {/* Subtotal after stay discounts */}
                {stayDiscount > 0 && (
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">{t("common.subtotal")}</span>
                    <span>{formatMoney(subtotal - stayDiscount, displayCurrency)}</span>
                  </div>
                )}
                
                {/* Service fees */}
                {serviceFees > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("common.serviceFees")}</span>
                    <span>+{formatMoney(serviceFees, displayCurrency)}</span>
                  </div>
                )}
                
                {/* Promo code discount */}
                {discount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Promo ({appliedDiscount?.code})
                    </span>
                    <span>-{formatMoney(discount, displayCurrency)}</span>
                  </div>
                )}
              </div>
              
              </>
              )}

              {/* Payment Type Selector - only show for group bookings */}
              {hasGroupBooking && (
                <div className="border-t pt-4 space-y-3">
                  <div className="text-sm font-semibold text-foreground">{t("checkout.paymentType", "Payment Type")}</div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={paymentType === 'group' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentType('group')}
                      className="flex-1"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      {t("checkout.payAsGroup", "Pay for Everyone")}
                    </Button>
                    <Button
                      variant={paymentType === 'individual' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPaymentType('individual')}
                      className="flex-1"
                    >
                      {t("checkout.payIndividual", "Pay My Share")}
                    </Button>
                  </div>
                  {paymentType === 'individual' && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t("checkout.yourShare", "Your share")} (1/{tourParticipants})</span>
                        <span className="font-semibold text-primary">{formatMoney(individualShare, displayCurrency)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{t("checkout.individualNote", "Other participants will need to complete their own payment")}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between items-baseline py-4 mt-4 border-t gap-3 min-w-0">
                <span className="font-semibold shrink-0">{paymentType === 'individual' && hasGroupBooking ? t("checkout.youPay", "You Pay") : t("common.total")}</span>
                <span className="text-xl sm:text-2xl font-bold text-right leading-tight break-words">{formatMoney(payableAmount, displayCurrency)}</span>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 border-t space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  {t("common.securePayment")}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  {t("checkout.summary.instantConfirmation")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {cartItems.length > 0 && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur shadow-[0_-10px_30px_rgba(15,23,42,0.08)]">
          <div
            className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-3"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <div className="min-w-0 max-w-[42vw] xs:max-w-[48vw] sm:max-w-none">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-base font-semibold text-foreground truncate">{formatMoney(payableAmount, displayCurrency)}</p>
            </div>

            {currentStep === 'details' ? (
              <Button
                className="h-11 px-3 whitespace-nowrap"
                onClick={() => {
                  commitDraftStayDates();
                  goToStep('payment');
                }}
                disabled={!isDetailsValid}
              >
                {t("checkout.contact.continue")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : currentStep === 'payment' ? (
              <Button className="h-11 px-3 whitespace-nowrap" onClick={() => goToStep('confirm')} disabled={!isPaymentValid}>
                <span className="sm:hidden">Review</span>
                <span className="hidden sm:inline">{t("checkout.payment.reviewBooking")}</span>
                <ArrowRight className="w-4 h-4 ml-2 hidden sm:inline" />
              </Button>
            ) : (
              <Button
                className="h-11 px-3 whitespace-nowrap"
                onClick={handlePayment}
                disabled={isProcessing || !acceptedTerms || !acceptedPrivacy || !acceptedCancellation || !acceptedAdult}
              >
                {isProcessing ? "Processing..." : (
                  <>
                    <span className="sm:hidden">Pay now</span>
                    <span className="hidden sm:inline">Pay {formatMoney(payableAmount, displayCurrency)}</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Contact Modal for Bank Transfer only */}
      {showContactModal && paymentMethod === 'bank' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Bank Transfer
              </h3>
              <p className="text-muted-foreground text-sm">
                Our team will contact you within <span className="font-semibold text-foreground">5 minutes</span> to complete your payment securely.
              </p>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-sm font-medium mb-1">What happens next?</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• A payment specialist will call you</li>
                  <li>• They'll guide you through the secure payment</li>
                  <li>• Your booking will be confirmed immediately</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Call us directly</p>
                    <a href="tel:+250796214719" className="font-medium text-foreground hover:text-primary">
                      +250 796 214 719
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">WhatsApp</p>
                    <a href="https://wa.me/250796214719" target="_blank" rel="noreferrer" className="font-medium text-foreground hover:text-primary">
                      +250 796 214 719
                    </a>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email support</p>
                    <a href="mailto:support@merry360x.com" className="font-medium text-foreground hover:text-primary">
                      support@merry360x.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowContactModal(false); setPaymentMethod('mtn_rwa'); }}
              >
                Use Mobile Money
              </Button>
              <Button
                className="flex-1"
                onClick={() => setShowContactModal(false)}
              >
                I Understand
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
