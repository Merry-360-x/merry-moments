import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2, Upload, X, Save } from "lucide-react";
import { CloudinaryUploadDialog } from "@/components/CloudinaryUploadDialog";
import { uploadFile } from "@/lib/uploads";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { DISPLAY_CURRENCIES } from "@/lib/currencies";
import { getTourPricingModels } from "@/lib/tour-pricing";

const categories = ["Cultural", "Adventure", "Wildlife", "City Tours", "Hiking", "Photography", "Historical", "Eco-Tourism"];
const tourTypes = ["Private", "Group"];
const tourPricingModels = [
  { value: "per_person", label: "Per person" },
  { value: "per_group", label: "Per group" },
  { value: "per_hour", label: "Per hour" },
  { value: "per_minute", label: "Per minute" },
] as const;
type TourPricingModel = (typeof tourPricingModels)[number]["value"];
type TimePricingTier = { duration_value: number; duration_unit: "minute" | "hour"; price: number };
type GroupPricingTier = { min_group_size: number; max_group_size: number; price: number };

function normalizeTimePricingTiers(raw: unknown, fallbackPricingModel: TourPricingModel): TimePricingTier[] {
  if (!Array.isArray(raw)) return [];
  const defaultUnit: "minute" | "hour" = fallbackPricingModel === "per_hour" ? "hour" : "minute";
  return raw
    .map((tier: any) => ({
      duration_value: Number(tier?.duration_value || 0),
      duration_unit: tier?.duration_unit === "hour" ? "hour" : tier?.duration_unit === "minute" ? "minute" : defaultUnit,
      price: Number(tier?.price || 0),
    }))
    .filter((tier) => tier.duration_value > 0 && tier.price > 0);
}

function normalizeGroupPricingTiers(raw: unknown): GroupPricingTier[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((tier: any) => ({
      min_group_size: Math.max(1, Math.floor(Number(tier?.min_group_size || 1))),
      max_group_size: Math.max(1, Math.floor(Number(tier?.max_group_size || 1))),
      price: Number(tier?.price || 0),
    }))
    .filter((tier) => tier.min_group_size >= 1 && tier.max_group_size >= tier.min_group_size && tier.price > 0);
}

export default function CreateTourPackage() {
  const { user, isHost, isLoading, roles } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const redirectTo = searchParams.get("redirect") || "/host-dashboard";
  const editId = searchParams.get("editId");
  const isEditMode = Boolean(editId);

  const defaultCancellationPolicy = `STANDARD EXPERIENCES (Day Tours & Activities)
• More than 72 hours before start time: Full refund (excluding platform service fees and payment processing fees)
• 48–72 hours before start time: 50% refund (excluding platform service fees)
• Less than 48 hours before start time: No refund
• No-shows or late arrivals: No refund

MULTI-DAY, PRIVATE & CUSTOM EXPERIENCES
• More than 14 days before start date: Full refund minus non-refundable deposits and third-party costs
• 7–14 days before start date: 50% refund
• Less than 7 days before start date: No refund
• Custom or tailor-made itineraries may require non-refundable deposits, clearly disclosed at booking

NON-REFUNDABLE COSTS
Some components are non-refundable once booked, including but not limited to:
• National park and conservation permits
• Gorilla trekking and special access permits
• Third-party accommodation, transport, flights, or activity tickets
• Experiences marked "Non-Refundable" on the listing page`;

  const [formData, setFormData] = useState({
    title: "",
    categories: [] as string[],
    tour_types: [] as string[],
    description: "",
    city: "",
    duration: "",
    daily_itinerary: "",
    included_services: "",
    excluded_services: "",
    meeting_point: "",
    what_to_bring: "",
    cancellation_policy: defaultCancellationPolicy,
    price_per_adult: "",
    pricing_model: "per_person" as TourPricingModel,
    pricing_models: ["per_person"] as TourPricingModel[],
    pricing_duration_value: 1,
    time_pricing_tiers: [] as TimePricingTier[],
    group_pricing_tiers: [] as GroupPricingTier[],
    currency: "RWF",
    min_guests: 1,
    max_guests: 10,
    has_differential_pricing: false,
    price_for_citizens: "",
    price_for_east_african: "",
    price_for_foreigners: "",
  });

  // Group discounts as an array of tiers
  const [groupDiscounts, setGroupDiscounts] = useState<Array<{min_people: number, max_people: number | null, discount_percentage: number}>>([]);

  // Flexible per-person pricing by group size and room type
  const [pricingTiers, setPricingTiers] = useState<Array<{ group_size: number; room_type: "double_twin" | "single"; price_per_person: number }>>([]);

  const roomTypeLabels: Record<string, string> = {
    double_twin: "Double/Twin Room (shared)",
    single: "Single Room (private)",
  };

  const nonRefundableOptions = [
    "National park and conservation permits",
    "Gorilla trekking and special access permits",
    "Third-party accommodation",
    "Transport and flights",
    "Activity tickets",
  ];

  const [selectedNonRefundable, setSelectedNonRefundable] = useState<string[]>([]);
  const [customNonRefundable1, setCustomNonRefundable1] = useState("");
  const [customNonRefundable2, setCustomNonRefundable2] = useState("");

  const [coverImage, setCoverImage] = useState<string>("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [galleryDialogOpen, setGalleryDialogOpen] = useState(false);
  const [licenseUrl, setLicenseUrl] = useState<string>("");
  const [licenseDialogOpen, setLicenseDialogOpen] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [customPolicyText, setCustomPolicyText] = useState("");
  const [customPolicyFile, setCustomPolicyFile] = useState<File | null>(null);
  const [customPolicyUrl, setCustomPolicyUrl] = useState<string>("");
  const [uploadingCustomPolicy, setUploadingCustomPolicy] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [includeRoomType, setIncludeRoomType] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const canPublishWithoutCertificate = roles.includes("admin") || roles.includes("certificate_override");

  // Use a stable storage key - always use user ID if available, otherwise anonymous
  const getStorageKey = () => user?.id ? `tour-package-draft-${user.id}` : 'tour-package-draft-anonymous';

  useEffect(() => {
    if (!isEditMode || !editId || !user?.id) return;

    let isMounted = true;
    const toText = (value: unknown) => {
      if (Array.isArray(value)) return value.filter(Boolean).join("\n");
      return typeof value === "string" ? value : "";
    };

    const fetchPackageForEdit = async () => {
      setIsEditLoading(true);
      const { data, error } = await supabase
        .from("tour_packages")
        .select("*")
        .eq("id", editId)
        .eq("host_id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error || !data) {
        toast({
          title: "Tour package not found",
          description: "We couldn't load this package for editing.",
          variant: "destructive",
        });
        navigate("/host-dashboard");
        setIsEditLoading(false);
        return;
      }

      const categoriesFromDb = ((data as any).categories as string[] | null) || [];
      const tourTypesFromDb = ((data as any).tour_types as string[] | null) || [];
      const mergedCategories = categoriesFromDb.length > 0
        ? categoriesFromDb
        : [data.category].filter(Boolean) as string[];
      const mergedTourTypes = tourTypesFromDb.length > 0
        ? tourTypesFromDb
        : [data.tour_type].filter(Boolean) as string[];

      setFormData({
        title: data.title || "",
        categories: mergedCategories,
        tour_types: mergedTourTypes,
        description: data.description || "",
        city: data.city || "",
        duration: data.duration || "",
        daily_itinerary: data.daily_itinerary || "",
        included_services: toText((data as any).included_services),
        excluded_services: toText((data as any).excluded_services),
        meeting_point: data.meeting_point || "",
        what_to_bring: toText((data as any).what_to_bring),
        cancellation_policy: data.cancellation_policy || defaultCancellationPolicy,
        price_per_adult: data.price_per_adult != null ? String(data.price_per_adult) : "",
        pricing_model: (() => {
          const parsed = getTourPricingModels((data as any)?.pricing_tiers);
          return parsed[0] || "per_person";
        })(),
        pricing_models: getTourPricingModels((data as any)?.pricing_tiers),
        pricing_duration_value: (() => {
          const raw = (data as any)?.pricing_tiers;
          if (!raw || Array.isArray(raw) || typeof raw !== "object") return 1;
          const next = Number((raw as { pricing_duration_value?: number }).pricing_duration_value || 1);
          return Number.isFinite(next) && next > 0 ? next : 1;
        })(),
        time_pricing_tiers: (() => {
          const raw = (data as any)?.pricing_tiers;
          if (!raw || Array.isArray(raw) || typeof raw !== "object") return [] as TimePricingTier[];
          const pricingModel = getTourPricingModels(raw)[0] || "per_person";
          return normalizeTimePricingTiers((raw as any).time_pricing_tiers, pricingModel);
        })(),
        group_pricing_tiers: (() => {
          const raw = (data as any)?.pricing_tiers;
          if (!raw || Array.isArray(raw) || typeof raw !== "object") return [] as GroupPricingTier[];
          return normalizeGroupPricingTiers((raw as any).group_pricing_tiers);
        })(),
        currency: data.currency || "RWF",
        min_guests: Number(data.min_guests || 1),
        max_guests: Number(data.max_guests || 10),
        has_differential_pricing: Boolean((data as any).has_differential_pricing),
        price_for_citizens: (data as any).price_for_citizens != null ? String((data as any).price_for_citizens) : "",
        price_for_east_african: (data as any).price_for_east_african != null ? String((data as any).price_for_east_african) : "",
        price_for_foreigners: (data as any).price_for_foreigners != null ? String((data as any).price_for_foreigners) : "",
      });

      setCoverImage((data as any).cover_image || "");
      setGalleryImages(((data as any).gallery_images as string[] | null) || []);
      setPdfUrl((data as any).itinerary_pdf_url || "");
      setLicenseUrl((data as any).tour_guide_license_url || (data as any).tour_license_url || "existing");

      const dbGroupDiscounts = ((data as any).group_discounts as Array<{min_people: number, max_people: number | null, discount_percentage: number}> | null) || [];
      setGroupDiscounts(dbGroupDiscounts);

      const rawPricingTiers = (data as any).pricing_tiers;
      const parsedPricingTiers = Array.isArray(rawPricingTiers)
        ? rawPricingTiers
        : (rawPricingTiers && typeof rawPricingTiers === "object" && Array.isArray((rawPricingTiers as any).tiers)
            ? (rawPricingTiers as any).tiers
            : []);
      const dbPricingTiers = (parsedPricingTiers as any[]).map((tier) => ({
        group_size: Math.max(1, Number(tier?.group_size || 1)),
        room_type: tier?.room_type === "single" ? "single" : "double_twin",
        price_per_person: Number(tier?.price_per_person || 0),
      }));
      setPricingTiers(dbPricingTiers);
      setIncludeRoomType(dbPricingTiers.some((tier) => tier.room_type === "single"));

      setSelectedNonRefundable((((data as any).non_refundable_items as string[] | null) || []));

      const policyType = typeof (data as any).cancellation_policy_type === "string"
        ? (data as any).cancellation_policy_type
        : "";
      setSelectedPolicies(policyType ? policyType.split(",").map((v: string) => v.trim()).filter(Boolean) : []);

      setDraftLoaded(true);
      setIsEditLoading(false);
    };

    void fetchPackageForEdit();

    return () => {
      isMounted = false;
    };
  }, [defaultCancellationPolicy, editId, isEditMode, navigate, toast, user?.id]);

  // Load draft on mount (only once)
  useEffect(() => {
    if (isEditMode) {
      setDraftLoaded(true);
      return;
    }
    if (draftLoaded) return; // Already loaded
    
    const draftKey = getStorageKey();
    const savedDraft = localStorage.getItem(draftKey);
    
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.formData) {
          const loadedPricingModels = getTourPricingModels({
            pricing_model: draft.formData.pricing_model,
            pricing_models: draft.formData.pricing_models,
          });
          setFormData((prev) => ({
            ...prev,
            ...draft.formData,
            pricing_models: loadedPricingModels,
            pricing_model: loadedPricingModels[0] || "per_person",
            pricing_duration_value: Number(draft.formData.pricing_duration_value || 1),
            time_pricing_tiers: normalizeTimePricingTiers(draft.formData.time_pricing_tiers, loadedPricingModels[0] || "per_person"),
            group_pricing_tiers: normalizeGroupPricingTiers(draft.formData.group_pricing_tiers),
          }));
        }
        if (draft.groupDiscounts) setGroupDiscounts(draft.groupDiscounts);
        // Migrate old pricing tiers to include room_type
        if (draft.pricingTiers) {
          const migratedTiers = draft.pricingTiers.map((tier: any) => ({
            group_size: tier.group_size || 1,
            room_type: tier.room_type || "double_twin",
            price_per_person: tier.price_per_person || 0,
          }));
          setPricingTiers(migratedTiers);
        }
        if (draft.selectedNonRefundable) setSelectedNonRefundable(draft.selectedNonRefundable);
        if (draft.customNonRefundable1) setCustomNonRefundable1(draft.customNonRefundable1);
        if (draft.customNonRefundable2) setCustomNonRefundable2(draft.customNonRefundable2);
        if (draft.coverImage) setCoverImage(draft.coverImage);
        if (draft.galleryImages) setGalleryImages(draft.galleryImages);
        if (draft.selectedPolicies) setSelectedPolicies(draft.selectedPolicies);
        if (draft.customPolicyText) setCustomPolicyText(draft.customPolicyText);
        if (draft.includeRoomType !== undefined) setIncludeRoomType(draft.includeRoomType);
        setLastSaved(new Date(draft.timestamp));
        toast({ title: "Draft restored", description: "Your previous work has been restored" });
        console.log('[CreateTourPackage] Draft restored from', draftKey);
      } catch (err) {
        console.error('Failed to load draft:', err);
      }
    }
    setDraftLoaded(true);
  }, [user?.id, draftLoaded, isEditMode]);

  // Auto-save on form changes (debounced) - only after initial load
  useEffect(() => {
    if (isEditMode) return;
    if (!draftLoaded) return; // Don't save until we've tried to load
    
    const draftKey = getStorageKey();
    
    // Only save if there's meaningful content
    if (!formData.title && !formData.description) return;
    
    const timer = setTimeout(() => {
      const draft = {
        formData,
        groupDiscounts,
        pricingTiers,
        includeRoomType,
        selectedNonRefundable,
        customNonRefundable1,
        customNonRefundable2,
        coverImage,
        galleryImages,
        selectedPolicies,
        customPolicyText,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
      setLastSaved(new Date());
      console.log('[CreateTourPackage] Auto-saved draft to', draftKey);
    }, 1000); // Debounce 1 second (faster)

    return () => clearTimeout(timer);
  }, [formData, groupDiscounts, pricingTiers, selectedNonRefundable, customNonRefundable1, customNonRefundable2, coverImage, galleryImages, selectedPolicies, customPolicyText, user?.id, draftLoaded, isEditMode]);

  // Also save immediately when leaving the page
  useEffect(() => {
    if (isEditMode) return;
    const handleBeforeUnload = () => {
      if (!formData.title && !formData.description) return;
      
      const draftKey = getStorageKey();
      const draft = {
        formData,
        groupDiscounts,
        pricingTiers,
        includeRoomType,
        selectedNonRefundable,
        customNonRefundable1,
        customNonRefundable2,
        coverImage,
        galleryImages,
        selectedPolicies,
        customPolicyText,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
      console.log('[CreateTourPackage] Saved on page unload');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, groupDiscounts, pricingTiers, selectedNonRefundable, customNonRefundable1, customNonRefundable2, coverImage, galleryImages, selectedPolicies, customPolicyText, user?.id, isEditMode]);

  const saveDraft = () => {
    const draftKey = getStorageKey();
    const draft = {
      formData,
      groupDiscounts,
      pricingTiers,
      includeRoomType,
      selectedNonRefundable,
      customNonRefundable1,
      customNonRefundable2,
      coverImage,
      galleryImages,
      selectedPolicies,
      customPolicyText,
      timestamp: new Date().toISOString(),
    };
    
    localStorage.setItem(draftKey, JSON.stringify(draft));
    setLastSaved(new Date());
    console.log('[CreateTourPackage] Manually saved draft');
  };

  const handleSaveDraft = () => {
    setIsSaving(true);
    saveDraft();
    toast({ title: "Draft saved", description: "Your progress has been saved locally" });
    setTimeout(() => setIsSaving(false), 500);
  };

  const clearDraft = () => {
    const draftKey = getStorageKey();
    localStorage.removeItem(draftKey);
  };

  const isFormValid = () => {
    const hasValidTimeTier = normalizeTimePricingTiers(formData.time_pricing_tiers, formData.pricing_model).length > 0;
    const hasValidGroupTier = normalizeGroupPricingTiers(formData.group_pricing_tiers).length > 0;
    const needsTimeTier = formData.pricing_models.includes("per_hour") || formData.pricing_models.includes("per_minute");
    const needsGroupTier = formData.pricing_models.includes("per_group");

    // Cancellation policy is now optional - can use default or add later
    const policyValid = selectedPolicies.length === 0 || 
      (!selectedPolicies.includes('custom') || (customPolicyText.trim().length >= 20 || customPolicyFile !== null));
    
    return formData.title.trim() && formData.categories.length > 0 && formData.tour_types.length > 0 &&
      formData.description.trim().length >= 50 && formData.city.trim() &&
      formData.duration.trim() && formData.daily_itinerary.trim().length >= 100 &&
      formData.meeting_point.trim() && policyValid &&
      (parseFloat(formData.price_per_adult) > 0 || hasValidTimeTier || hasValidGroupTier) &&
      (!needsTimeTier || hasValidTimeTier) &&
      (!needsGroupTier || hasValidGroupTier) &&
      (canPublishWithoutCertificate || licenseUrl.trim());
      // Note: coverImage, pdfFile, and cancellation_policy are now optional - can be uploaded later
  };

  const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf" || file.size > 10 * 1024 * 1024) {
        toast({ title: "Invalid PDF", description: "Must be PDF under 10MB", variant: "destructive" });
        return;
      }
      setPdfFile(file);
      
      // Upload immediately
      setUploadingPdf(true);
      try {
        const { url } = await uploadFile(file, { folder: "tour-itineraries" });
        setPdfUrl(url);
        toast({ title: "PDF uploaded successfully" });
      } catch (error) {
        toast({ title: "PDF upload failed", description: String(error), variant: "destructive" });
        setPdfFile(null);
      } finally {
        setUploadingPdf(false);
      }
    }
  };

  const handleCustomPolicyFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf" || file.size > 5 * 1024 * 1024) {
        toast({ title: "Invalid PDF", description: "Must be PDF under 5MB", variant: "destructive" });
        return;
      }
      setCustomPolicyFile(file);
      
      // Upload immediately
      setUploadingCustomPolicy(true);
      try {
        const { url } = await uploadFile(file, { folder: "cancellation-policies" });
        setCustomPolicyUrl(url);
        toast({ title: "Policy PDF uploaded successfully" });
      } catch (error) {
        toast({ title: "Policy PDF upload failed", description: String(error), variant: "destructive" });
        setCustomPolicyFile(null);
      } finally {
        setUploadingCustomPolicy(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isFormValid()) return;
    setUploading(true);

    try {
      // Use already uploaded PDF URLs (uploaded immediately when files were selected)

      // Build combined cancellation policy
      let combinedPolicy = '';
      if (selectedPolicies.includes('standard')) {
        combinedPolicy += 'STANDARD EXPERIENCES (Day Tours & Activities)\n';
        combinedPolicy += '• More than 72 hours before start time: Full refund (excluding platform service fees and payment processing fees)\n';
        combinedPolicy += '• 48–72 hours before start time: 50% refund (excluding platform service fees)\n';
        combinedPolicy += '• Less than 48 hours before start time: No refund\n';
        combinedPolicy += '• No-shows or late arrivals: No refund\n\n';
      }
      if (selectedPolicies.includes('multiday_private')) {
        combinedPolicy += 'MULTI-DAY, PRIVATE & CUSTOM EXPERIENCES\n';
        combinedPolicy += '• More than 14 days before start date: Full refund minus non-refundable deposits and third-party costs\n';
        combinedPolicy += '• 7–14 days before start date: 50% refund\n';
        combinedPolicy += '• Less than 7 days before start date: No refund\n';
        combinedPolicy += '• Custom or tailor-made itineraries may require non-refundable deposits, clearly disclosed at booking\n\n';
      }
      if (selectedPolicies.includes('custom') && customPolicyText.trim()) {
        combinedPolicy += 'CUSTOM POLICY\n' + customPolicyText.trim() + '\n\n';
      }

      // Build non-refundable items list (custom items already added via Add buttons)
      const nonRefundableItems = [...selectedNonRefundable];

      const packageData: Database['public']['Tables']['tour_packages']['Insert'] = {
        host_id: user.id,
        title: formData.title.trim(),
        category: formData.categories[0] || 'Cultural',
        tour_type: formData.tour_types[0] || 'Private', // Use first selected type for DB constraint
        description: formData.description.trim(),
        country: "Rwanda",
        city: formData.city.trim(),
        duration: formData.duration.trim(),
        daily_itinerary: formData.daily_itinerary.trim(),
        included_services: formData.included_services.trim() || null,
        excluded_services: formData.excluded_services.trim() || null,
        meeting_point: formData.meeting_point.trim(),
        what_to_bring: formData.what_to_bring.trim() || null,
        cancellation_policy: combinedPolicy.trim() || null,
        cancellation_policy_type: selectedPolicies.length > 0 ? selectedPolicies.join(',') : null,
        price_per_adult: parseFloat(formData.price_per_adult),
        currency: formData.currency,
        min_guests: formData.min_guests,
        max_guests: formData.max_guests,
        cover_image: coverImage || null,
        gallery_images: galleryImages.length > 0 ? galleryImages : null,
        itinerary_pdf_url: pdfUrl,
        status: (isHost ? "approved" : "draft"),
        has_differential_pricing: formData.has_differential_pricing,
        price_for_citizens: formData.has_differential_pricing && formData.price_for_citizens ? parseFloat(formData.price_for_citizens) : null,
        price_for_east_african: formData.has_differential_pricing && formData.price_for_east_african ? parseFloat(formData.price_for_east_african) : null,
        price_for_foreigners: formData.has_differential_pricing && formData.price_for_foreigners ? parseFloat(formData.price_for_foreigners) : null,
      };

      const normalizedPricingTiers = Array.from(
        new Map(
          (pricingTiers ?? [])
            .map((t) => ({
              group_size: Math.max(1, Math.floor(Number((t as any).group_size) || 0)),
              price_per_person: Number((t as any).price_per_person) || 0,
            }))
            .filter((t) => t.group_size >= 1 && t.price_per_person > 0)
            .map((t) => [t.group_size, t] as const)
        ).values()
      ).sort((a, b) => b.group_size - a.group_size);

      // Add fields not in type definition yet
      (packageData as any).group_discounts = groupDiscounts.length > 0 ? groupDiscounts : null;
      (packageData as any).non_refundable_items = nonRefundableItems.length > 0 ? nonRefundableItems : null;
      const selectedPricingModels = (formData.pricing_models?.length > 0
        ? formData.pricing_models
        : [formData.pricing_model || "per_person"]) as TourPricingModel[];
      const primaryPricingModel = selectedPricingModels[0] || "per_person";

      (packageData as any).pricing_tiers = {
        tiers: normalizedPricingTiers,
        pricing_model: primaryPricingModel,
        pricing_models: selectedPricingModels,
        ...(selectedPricingModels.includes("per_hour") || selectedPricingModels.includes("per_minute")
          ? { pricing_duration_value: Math.max(0.25, Number(formData.pricing_duration_value || 1)) }
          : {}),
        ...(selectedPricingModels.includes("per_hour") || selectedPricingModels.includes("per_minute")
          ? { time_pricing_tiers: normalizeTimePricingTiers(formData.time_pricing_tiers, primaryPricingModel) }
          : {}),
        ...(selectedPricingModels.includes("per_group")
          ? { group_pricing_tiers: normalizeGroupPricingTiers(formData.group_pricing_tiers) }
          : {}),
      };

      // Keep backwards compatibility: if the host provided a "single person" tier,
      // use it as the base price shown across the app.
      const singleTier = normalizedPricingTiers.find((t) => t.group_size === 1);
      if (singleTier) {
        (packageData as any).price_per_adult = singleTier.price_per_person;
      }

      if (isEditMode && editId) {
        const { error } = await supabase
          .from("tour_packages")
          .update({
            ...(packageData as any),
            categories: formData.categories,
            tour_types: formData.tour_types,
          })
          .eq("id", editId)
          .eq("host_id", user.id);
        if (error) throw error;
      } else {
        const { data: newPackage, error } = await supabase.from("tour_packages").insert(packageData as any).select("id").single();
        if (error) throw error;

        if (newPackage && formData.categories.length > 0) {
          await supabase.from("tour_packages").update({ 
            categories: formData.categories,
            tour_types: formData.tour_types,
          } as any).eq("id", (newPackage as any).id);
        }
      }

      toast({
        title: "Success!",
        description: isEditMode ? "Tour package updated successfully" : "Tour package created successfully",
      });
      clearDraft(); // Clear the draft after successful submission
      navigate(redirectTo);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || (isEditMode ? "Failed to update tour package" : "Failed to create tour package"),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (!isLoading && isEditMode && isEditLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading tour package for editing...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isLoading && !user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-medium mb-2">Sign In Required</h1>
          <p className="text-sm text-muted-foreground mb-6">Please sign in to create tour packages</p>
          <Button onClick={() => navigate("/auth")}>Sign In</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-12">
          <h1 className="text-2xl font-medium mb-2">{isEditMode ? "Edit Tour Package" : "Create Tour Package"}</h1>
          <p className="text-sm text-muted-foreground">
            {isEditMode ? "Update your tour package details" : "Fill in the details to create your tour package"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Basic */}
          <div className="space-y-5">
            <h2 className="text-base font-medium pb-2 border-b">Basic Information</h2>
            
            <div>
              <Label className="text-sm font-normal mb-1.5 block">Package Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="3-Day Gorilla Trekking Safari"
                className="h-10"
              />
            </div>

            <div>
              <Label className="text-sm font-normal mb-1.5 block">Categories * <span className="text-xs text-muted-foreground">(select at least one)</span></Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {categories.map((cat) => (
                  <label key={cat} className="flex items-center gap-2 text-sm bg-muted px-3 py-2 rounded cursor-pointer hover:bg-muted/80">
                    <Checkbox
                      checked={formData.categories.includes(cat)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({ ...formData, categories: [...formData.categories, cat] });
                        } else {
                          setFormData({ ...formData, categories: formData.categories.filter(c => c !== cat) });
                        }
                      }}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-normal mb-1.5 block">Tour Type * <span className="text-xs text-muted-foreground">(select all that apply)</span></Label>
              <div className="flex flex-wrap gap-3 mt-2">
                {tourTypes.map((t) => (
                  <label
                    key={t}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                      formData.tour_types.includes(t)
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-card border-border hover:border-primary/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.tour_types.includes(t)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, tour_types: [...formData.tour_types, t] });
                        } else {
                          setFormData({ ...formData, tour_types: formData.tour_types.filter((x) => x !== t) });
                        }
                      }}
                      className="sr-only"
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-normal mb-1.5 block">
                Description * 
                <span className={`text-xs ml-1 ${formData.description.length > 0 && formData.description.length < 50 ? 'text-red-500' : 'text-muted-foreground'}`}>
                  ({formData.description.length}/50 chars min)
                </span>
              </Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide a compelling description..."
                rows={4}
                className={formData.description.length > 0 && formData.description.length < 50 ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-normal mb-1.5 block">City *</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Kigali"
                  className="h-10"
                />
              </div>

              <div>
                <Label className="text-sm font-normal mb-1.5 block">Duration *</Label>
                <Input
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="3 Days, 2 Nights"
                  className="h-10"
                />
              </div>
            </div>
          </div>

          {/* Itinerary */}
          <div className="space-y-5">
            <h2 className="text-base font-medium pb-2 border-b">Itinerary</h2>

            <div>
              <Label className="text-sm font-normal mb-1.5 block">
                Daily Itinerary * 
                <span className={`text-xs ml-1 ${formData.daily_itinerary.length > 0 && formData.daily_itinerary.length < 100 ? 'text-red-500' : 'text-muted-foreground'}`}>
                  ({formData.daily_itinerary.length}/100 chars min)
                </span>
              </Label>
              <Textarea
                value={formData.daily_itinerary}
                onChange={(e) => setFormData({ ...formData, daily_itinerary: e.target.value })}
                placeholder="Day 1: ..., Day 2: ..."
                rows={6}
                className={formData.daily_itinerary.length > 0 && formData.daily_itinerary.length < 100 ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
            </div>

            <div>
              <Label className="text-sm font-normal mb-1.5 block">Included Services</Label>
              <Textarea
                value={formData.included_services}
                onChange={(e) => setFormData({ ...formData, included_services: e.target.value })}
                placeholder="Accommodation, meals, guide..."
                rows={3}
              />
            </div>

            <div>
              <Label className="text-sm font-normal mb-1.5 block">Excluded Services</Label>
              <Textarea
                value={formData.excluded_services}
                onChange={(e) => setFormData({ ...formData, excluded_services: e.target.value })}
                placeholder="Personal expenses, tips..."
                rows={3}
              />
            </div>

            <div>
              <Label className="text-sm font-normal mb-1.5 block">Meeting Point *</Label>
              <Input
                value={formData.meeting_point}
                onChange={(e) => setFormData({ ...formData, meeting_point: e.target.value })}
                placeholder="Where guests meet the guide"
                className="h-10"
              />
            </div>

            <div>
              <Label className="text-sm font-normal mb-1.5 block">What to Bring</Label>
              <Textarea
                value={formData.what_to_bring}
                onChange={(e) => setFormData({ ...formData, what_to_bring: e.target.value })}
                placeholder="Comfortable shoes, hat..."
                rows={2}
              />
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-3 block">Cancellation Policies *</Label>
                <p className="text-xs text-muted-foreground mb-3">Select one or more policies that apply to your tour package</p>
                
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <Checkbox
                      checked={selectedPolicies.includes('standard')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPolicies([...selectedPolicies, 'standard']);
                        } else {
                          setSelectedPolicies(selectedPolicies.filter(p => p !== 'standard'));
                        }
                      }}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-1">Standard Experiences (Day Tours & Activities)</p>
                      <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                        <li>72+ hours: Full refund (minus fees)</li>
                        <li>48-72 hours: 50% refund</li>
                        <li>&lt;48 hours: No refund</li>
                      </ul>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <Checkbox
                      checked={selectedPolicies.includes('multiday_private')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPolicies([...selectedPolicies, 'multiday_private']);
                        } else {
                          setSelectedPolicies(selectedPolicies.filter(p => p !== 'multiday_private'));
                        }
                      }}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-1">Multi-Day, Private & Custom Experiences</p>
                      <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                        <li>14+ days: Full refund minus deposits</li>
                        <li>7-14 days: 50% refund</li>
                        <li>&lt;7 days: No refund</li>
                      </ul>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <Checkbox
                      checked={selectedPolicies.includes('custom')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPolicies([...selectedPolicies, 'custom']);
                        } else {
                          setSelectedPolicies(selectedPolicies.filter(p => p !== 'custom'));
                          setCustomPolicyText('');
                          setCustomPolicyFile(null);
                        }
                      }}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm mb-1">Custom Policy</p>
                      <p className="text-xs text-muted-foreground">Write your own cancellation terms or upload a PDF</p>
                    </div>
                  </label>

                  {selectedPolicies.includes('custom') && (
                    <div className="ml-9 space-y-3 pt-2">
                      <Textarea
                        value={customPolicyText}
                        onChange={(e) => setCustomPolicyText(e.target.value)}
                        placeholder="Write your custom cancellation policy (minimum 20 characters)..."
                        rows={4}
                        className={`text-sm ${customPolicyText.length > 0 && customPolicyText.length < 20 ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      />
                      <p className={`text-xs ${customPolicyText.length > 0 && customPolicyText.length < 20 ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                        ({customPolicyText.length}/20 chars min)
                      </p>
                      
                      <div className="border-t pt-3">
                        <Label className="text-xs font-normal mb-2 block">Or Upload Policy PDF (Optional)</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept="application/pdf"
                            onChange={handleCustomPolicyFileChange}
                            className="text-xs"
                          />
                          {customPolicyFile && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setCustomPolicyFile(null)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        {customPolicyFile && (
                          <p className="text-xs text-green-600 mt-2">✓ {customPolicyFile.name}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">PDF under 5MB</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Non-Refundable Items Section */}
              <div className="pt-4 border-t">
                <Label className="text-sm font-medium mb-3 block">Non-Refundable Items (Optional)</Label>
                <p className="text-xs text-muted-foreground mb-3">Select items that cannot be refunded once booked</p>
                
                <div className="space-y-2 mb-4">
                  {nonRefundableOptions.map((item) => (
                    <label key={item} className="flex items-start gap-2 text-sm cursor-pointer hover:bg-muted/30 p-2 rounded transition-colors">
                      <Checkbox
                        checked={selectedNonRefundable.includes(item)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedNonRefundable([...selectedNonRefundable, item]);
                          } else {
                            setSelectedNonRefundable(selectedNonRefundable.filter(i => i !== item));
                          }
                        }}
                        className="mt-0.5"
                      />
                      <span className="text-sm">{item}</span>
                    </label>
                  ))}
                </div>
                
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-xs font-medium">Add Custom Non-Refundable Items</Label>
                  <div className="flex gap-2">
                    <Input
                      value={customNonRefundable1}
                      onChange={(e) => setCustomNonRefundable1(e.target.value)}
                      placeholder="e.g., Special event tickets"
                      className="h-9 text-sm flex-1"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && customNonRefundable1.trim()) {
                          e.preventDefault();
                          setSelectedNonRefundable([...selectedNonRefundable, customNonRefundable1.trim()]);
                          setCustomNonRefundable1('');
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (customNonRefundable1.trim()) {
                          setSelectedNonRefundable([...selectedNonRefundable, customNonRefundable1.trim()]);
                          setCustomNonRefundable1('');
                          toast({ title: "Item added", description: "Custom non-refundable item added successfully" });
                        }
                      }}
                      disabled={!customNonRefundable1.trim()}
                      className="h-9"
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={customNonRefundable2}
                      onChange={(e) => setCustomNonRefundable2(e.target.value)}
                      placeholder="e.g., Private guide booking fee"
                      className="h-9 text-sm flex-1"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && customNonRefundable2.trim()) {
                          e.preventDefault();
                          setSelectedNonRefundable([...selectedNonRefundable, customNonRefundable2.trim()]);
                          setCustomNonRefundable2('');
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (customNonRefundable2.trim()) {
                          setSelectedNonRefundable([...selectedNonRefundable, customNonRefundable2.trim()]);
                          setCustomNonRefundable2('');
                          toast({ title: "Item added", description: "Custom non-refundable item added successfully" });
                        }
                      }}
                      disabled={!customNonRefundable2.trim()}
                      className="h-9"
                    >
                      Add
                    </Button>
                  </div>
                  
                  {/* Show added custom items */}
                  {selectedNonRefundable.filter(item => !nonRefundableOptions.includes(item)).length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <Label className="text-xs font-medium mb-2 block">Custom Items Added:</Label>
                      <div className="space-y-1">
                        {selectedNonRefundable.filter(item => !nonRefundableOptions.includes(item)).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm bg-muted/50 px-2 py-1.5 rounded">
                            <span>{item}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedNonRefundable(selectedNonRefundable.filter(i => i !== item))}
                              className="h-6 w-6 p-0"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">Selected policies and non-refundable items will be shown to guests at booking.</p>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-5">
            <h2 className="text-base font-medium pb-2 border-b">Pricing & Group Size</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-normal mb-1.5 block">Pricing Models *</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {tourPricingModels.map((item) => (
                    <label key={item.value} className="flex items-center space-x-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={formData.pricing_models.includes(item.value)}
                        onCheckedChange={(checked) => {
                          const current = new Set(formData.pricing_models);
                          if (checked) {
                            current.add(item.value);
                          } else {
                            if (current.size <= 1) return;
                            current.delete(item.value);
                          }

                          const ordered = tourPricingModels
                            .map((model) => model.value)
                            .filter((model) => current.has(model)) as TourPricingModel[];

                          setFormData({
                            ...formData,
                            pricing_models: ordered,
                            pricing_model: ordered[0] || "per_person",
                          });
                        }}
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Primary pricing is set automatically from the first selected option.
                </p>
              </div>

              <div>
                <Label className="text-sm font-normal mb-1.5 block">
                  {(formData.pricing_model === "per_hour" || formData.pricing_model === "per_minute")
                    ? `Duration (${formData.pricing_model === "per_hour" ? "hours" : "minutes"}) *`
                    : "Price Input"}
                </Label>
                {(formData.pricing_model === "per_hour" || formData.pricing_model === "per_minute") ? (
                  <Input
                    type="number"
                    value={formData.pricing_duration_value}
                    onChange={(e) => setFormData({ ...formData, pricing_duration_value: Math.max(0.25, parseFloat(e.target.value) || 1) })}
                    min={formData.pricing_model === "per_hour" ? "0.25" : "1"}
                    step={formData.pricing_model === "per_hour" ? "0.25" : "1"}
                    className="h-10"
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">Select per-hour or per-minute to define duration.</p>
                )}
              </div>

              {(formData.pricing_models.includes("per_hour") || formData.pricing_models.includes("per_minute")) ? (
                <div className="col-span-2 space-y-2 rounded-lg border p-3 bg-muted/20">
                  <Label className="text-sm font-medium">Time Pricing Tiers</Label>
                  <p className="text-xs text-muted-foreground">Add multiple durations and prices (example: 3 min = $40, 15 min = $150).</p>
                  <div className="space-y-2">
                    {formData.time_pricing_tiers.map((tier, index) => (
                      <div key={`pkg-time-tier-${index}`} className="grid grid-cols-[1fr_140px_1fr_auto] gap-2 items-end">
                        <div>
                          <Label className="text-xs">Duration</Label>
                          <Input
                            type="number"
                            min="1"
                            step="0.25"
                            value={tier.duration_value}
                            onChange={(e) => {
                              const next = [...formData.time_pricing_tiers];
                              next[index] = {
                                ...next[index],
                                duration_value: Math.max(0.25, Number(e.target.value) || 0.25),
                              };
                              setFormData({ ...formData, time_pricing_tiers: next });
                            }}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Unit</Label>
                          <Select
                            value={tier.duration_unit}
                            onValueChange={(unit: "minute" | "hour") => {
                              const next = [...formData.time_pricing_tiers];
                              next[index] = { ...next[index], duration_unit: unit };
                              setFormData({ ...formData, time_pricing_tiers: next });
                            }}
                          >
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {formData.pricing_models.includes("per_minute") && <SelectItem value="minute">Minute</SelectItem>}
                              {formData.pricing_models.includes("per_hour") && <SelectItem value="hour">Hour</SelectItem>}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Price ({formData.currency})</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={tier.price}
                            onChange={(e) => {
                              const next = [...formData.time_pricing_tiers];
                              next[index] = { ...next[index], price: Math.max(0, Number(e.target.value) || 0) };
                              setFormData({ ...formData, time_pricing_tiers: next });
                            }}
                            className="h-9"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9"
                          onClick={() => setFormData({ ...formData, time_pricing_tiers: formData.time_pricing_tiers.filter((_, i) => i !== index) })}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({
                      ...formData,
                      time_pricing_tiers: [
                        ...formData.time_pricing_tiers,
                        {
                          duration_value: formData.pricing_model === "per_hour" ? 1 : 3,
                          duration_unit: formData.pricing_model === "per_hour" ? "hour" : "minute",
                          price: 0,
                        },
                      ],
                    })}
                  >
                    + Add Time Tier
                  </Button>
                </div>
              ) : null}

              <div>
                <Label className="text-sm font-normal mb-1.5 block">
                  {formData.pricing_model === "per_group"
                    ? "Price per Group *"
                    : formData.pricing_model === "per_hour"
                      ? "Price per Hour *"
                      : formData.pricing_model === "per_minute"
                        ? "Price per Minute *"
                        : "Price per Adult *"}
                </Label>
                <Input
                  type="number"
                  value={formData.price_per_adult}
                  onChange={(e) => setFormData({ ...formData, price_per_adult: e.target.value })}
                  min="0"
                  step="0.01"
                  className="h-10"
                />
                {(formData.pricing_model === "per_hour" || formData.pricing_model === "per_minute") && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Total for selected duration: {formData.currency} {(Number(formData.pricing_duration_value || 1) * Number(formData.price_per_adult || 0)).toFixed(2)}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-sm font-normal mb-1.5 block">Currency</Label>
                <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DISPLAY_CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        ({c.symbol}) {c.code} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.pricing_models.includes("per_group") ? (
                <div className="col-span-2 space-y-2 rounded-lg border p-3 bg-muted/20">
                  <Label className="text-sm font-medium">Group Range Pricing Tiers</Label>
                  <p className="text-xs text-muted-foreground">Set group ranges and fixed group prices (example: 2–10 = $1000, 11–15 = $1500).</p>
                  <div className="space-y-2">
                    {formData.group_pricing_tiers.map((tier, index) => (
                      <div key={`pkg-group-tier-${index}`} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                        <div>
                          <Label className="text-xs">Min People</Label>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={tier.min_group_size}
                            onChange={(e) => {
                              const next = [...formData.group_pricing_tiers];
                              const min = Math.max(1, parseInt(e.target.value, 10) || 1);
                              next[index] = {
                                ...next[index],
                                min_group_size: min,
                                max_group_size: Math.max(min, next[index].max_group_size),
                              };
                              setFormData({ ...formData, group_pricing_tiers: next });
                            }}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Max People</Label>
                          <Input
                            type="number"
                            min={tier.min_group_size}
                            step="1"
                            value={tier.max_group_size}
                            onChange={(e) => {
                              const next = [...formData.group_pricing_tiers];
                              const max = Math.max(next[index].min_group_size, parseInt(e.target.value, 10) || next[index].min_group_size);
                              next[index] = { ...next[index], max_group_size: max };
                              setFormData({ ...formData, group_pricing_tiers: next });
                            }}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Group Price ({formData.currency})</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={tier.price}
                            onChange={(e) => {
                              const next = [...formData.group_pricing_tiers];
                              next[index] = { ...next[index], price: Math.max(0, Number(e.target.value) || 0) };
                              setFormData({ ...formData, group_pricing_tiers: next });
                            }}
                            className="h-9"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9"
                          onClick={() => setFormData({ ...formData, group_pricing_tiers: formData.group_pricing_tiers.filter((_, i) => i !== index) })}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({
                      ...formData,
                      group_pricing_tiers: [
                        ...formData.group_pricing_tiers,
                        {
                          min_group_size: formData.group_pricing_tiers.length > 0
                            ? formData.group_pricing_tiers[formData.group_pricing_tiers.length - 1].max_group_size + 1
                            : 2,
                          max_group_size: formData.group_pricing_tiers.length > 0
                            ? formData.group_pricing_tiers[formData.group_pricing_tiers.length - 1].max_group_size + 5
                            : 10,
                          price: 0,
                        },
                      ],
                    })}
                  >
                    + Add Group Range Tier
                  </Button>
                </div>
              ) : null}
            </div>

            {/* Differential Pricing Section */}
            <div className="p-4 rounded-xl border border-border bg-blue-50 dark:bg-blue-950/20">
              <div className="flex items-center gap-3 mb-3">
                <input
                  type="checkbox"
                  id="differential-pricing"
                  checked={formData.has_differential_pricing}
                  onChange={(e) => setFormData({ ...formData, has_differential_pricing: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="differential-pricing" className="text-sm font-medium cursor-pointer">
                  Tiered pricing by residency
                </Label>
              </div>
              
              {formData.has_differential_pricing && (
                <div className="ml-7 mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm">🇷🇼 National Citizens</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price_for_citizens}
                      onChange={(e) => setFormData({ ...formData, price_for_citizens: e.target.value })}
                      placeholder="e.g. 50,000"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">🌍 East African</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price_for_east_african}
                      onChange={(e) => setFormData({ ...formData, price_for_east_african: e.target.value })}
                      placeholder="e.g. 75,000"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">KE, UG, TZ, BI, SS, DRC</p>
                  </div>
                  <div>
                    <Label className="text-sm">✈️ Foreign Tourists</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price_for_foreigners}
                      onChange={(e) => setFormData({ ...formData, price_for_foreigners: e.target.value })}
                      placeholder="e.g. 150,000"
                      className="mt-1"
                    />
                  </div>
                  <p className="col-span-full text-xs text-muted-foreground">
                    Guests will select their residency status during booking to see the appropriate price
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-normal mb-1.5 block">Min Guests</Label>
                <Input
                  type="number"
                  value={formData.min_guests}
                  onChange={(e) => setFormData({ ...formData, min_guests: parseInt(e.target.value) || 1 })}
                  min="1"
                  className="h-10"
                />
              </div>

              <div>
                <Label className="text-sm font-normal mb-1.5 block">Max Guests</Label>
                <Input
                  type="number"
                  value={formData.max_guests}
                  onChange={(e) => setFormData({ ...formData, max_guests: parseInt(e.target.value) || 10 })}
                  min={formData.min_guests}
                  className="h-10"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Group Pricing (Optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Set per-person prices for different group sizes.
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={includeRoomType}
                  onCheckedChange={(checked) => setIncludeRoomType(!!checked)}
                />
                <span>Include room/accommodation type (for multi-day tours with lodging)</span>
              </label>

              <div className="space-y-3">
                {pricingTiers.map((tier, index) => (
                  <div key={index} className="p-3 border rounded-lg bg-muted/30 space-y-3">
                    <div className={`grid gap-3 ${includeRoomType ? 'grid-cols-[1fr_1fr]' : 'grid-cols-1'}`}>
                      <div>
                        <Label className="text-xs font-normal mb-1.5 block">Group Size (people)</Label>
                        <Input
                          type="number"
                          value={tier.group_size}
                          onChange={(e) => {
                            const next = [...pricingTiers];
                            next[index].group_size = Math.max(1, parseInt(e.target.value) || 1);
                            setPricingTiers(next);
                          }}
                          min="1"
                          step="1"
                          className="h-10"
                        />
                      </div>
                      {includeRoomType && (
                        <div>
                          <Label className="text-xs font-normal mb-1.5 block">Room Type</Label>
                          <Select
                            value={tier.room_type || "double_twin"}
                            onValueChange={(val: "double_twin" | "single") => {
                              const next = [...pricingTiers];
                              next[index].room_type = val;
                              setPricingTiers(next);
                            }}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="double_twin">Double/Twin (shared)</SelectItem>
                              <SelectItem value="single">Single (private)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <Label className="text-xs font-normal mb-1.5 block">Price per Person ({formData.currency})</Label>
                        <Input
                          type="number"
                          value={tier.price_per_person}
                          onChange={(e) => {
                            const next = [...pricingTiers];
                            next[index].price_per_person = Math.max(0, parseFloat(e.target.value) || 0);
                            setPricingTiers(next);
                          }}
                          min="0"
                          step="1"
                          className="h-10"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPricingTiers(pricingTiers.filter((_, i) => i !== index))}
                        className="h-10 text-destructive hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tier.group_size} {tier.group_size === 1 ? 'person' : 'people'}{includeRoomType ? ` • ${roomTypeLabels[tier.room_type] || 'Double/Twin Room (shared)'}` : ''} • {formData.currency} {tier.price_per_person.toLocaleString()} /person
                    </p>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPricingTiers([...pricingTiers, { group_size: 2, room_type: "double_twin", price_per_person: 0 }])}
                  className="w-full"
                >
                  + Add Pricing Tier
                </Button>

                {pricingTiers.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    Example: 6 people (double/twin) = $2,775/person, 4 people (single) = $3,265/person
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Group Discounts (Optional)</Label>
              <p className="text-xs text-muted-foreground">Offer discounts for larger groups to attract more bookings</p>
              
              <div className="space-y-3">
                {groupDiscounts.map((discount, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
                    <div>
                      <Label className="text-xs font-normal mb-1.5 block">Min People</Label>
                      <Input
                        type="number"
                        value={discount.min_people}
                        onChange={(e) => {
                          const newDiscounts = [...groupDiscounts];
                          newDiscounts[index].min_people = parseInt(e.target.value) || 0;
                          setGroupDiscounts(newDiscounts);
                        }}
                        min="2"
                        placeholder="e.g., 6"
                        className="h-10"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-normal mb-1.5 block">Max People (optional)</Label>
                      <Input
                        type="number"
                        value={discount.max_people || ''}
                        onChange={(e) => {
                          const newDiscounts = [...groupDiscounts];
                          newDiscounts[index].max_people = e.target.value ? parseInt(e.target.value) : null;
                          setGroupDiscounts(newDiscounts);
                        }}
                        min={discount.min_people}
                        placeholder="Leave empty for no limit"
                        className="h-10"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-normal mb-1.5 block">Discount (%)</Label>
                      <Input
                        type="number"
                        value={discount.discount_percentage}
                        onChange={(e) => {
                          const newDiscounts = [...groupDiscounts];
                          newDiscounts[index].discount_percentage = parseFloat(e.target.value) || 0;
                          setGroupDiscounts(newDiscounts);
                        }}
                        min="0"
                        max="50"
                        step="1"
                        placeholder="e.g., 10"
                        className="h-10"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setGroupDiscounts(groupDiscounts.filter((_, i) => i !== index))}
                      className="h-10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setGroupDiscounts([...groupDiscounts, { min_people: 6, max_people: null, discount_percentage: 10 }])}
                  className="w-full"
                >
                  + Add Discount Tier
                </Button>
              </div>
            </div>
          </div>

          {/* Media */}
          <div className="space-y-5">
            <h2 className="text-base font-medium pb-2 border-b">Images & Files</h2>

            <div>
              <Label className="text-sm font-normal mb-2 block">Cover Image *</Label>
              {coverImage ? (
                <div className="relative inline-block">
                  <img src={coverImage} alt="Cover" className="w-full max-w-sm h-40 object-cover rounded border" />
                  <button
                    type="button"
                    onClick={() => setCoverImage("")}
                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => setCoverDialogOpen(true)}>
                  <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Cover
                </Button>
              )}
              <CloudinaryUploadDialog
                title="Upload Cover"
                folder="tour-packages"
                accept="image/*"
                multiple={false}
                maxFiles={1}
                autoStart={true}
                value={coverImage ? [coverImage] : []}
                onChange={(urls) => setCoverImage(urls[0] || "")}
                open={coverDialogOpen}
                onOpenChange={setCoverDialogOpen}
              />
            </div>

            <div>
              <Label className="text-sm font-normal mb-2 block">Gallery Images</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {galleryImages.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={img} alt="" className="w-20 h-20 object-cover rounded border" />
                    <button
                      type="button"
                      onClick={() => setGalleryImages(galleryImages.filter((_, idx) => idx !== i))}
                      className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setGalleryDialogOpen(true)}>
                <Upload className="w-3.5 h-3.5 mr-1.5" /> Add Gallery Images
              </Button>
              <CloudinaryUploadDialog
                title="Upload Gallery"
                folder="tour-packages"
                accept="image/*"
                multiple={true}
                maxFiles={10}
                autoStart={true}
                value={galleryImages}
                onChange={setGalleryImages}
                open={galleryDialogOpen}
                onOpenChange={setGalleryDialogOpen}
              />
            </div>

            <div>
              <Label className="text-sm font-normal mb-2 block">Itinerary PDF *</Label>
              <Input type="file" accept=".pdf" onChange={handlePdfChange} className="h-10 cursor-pointer" />
              {pdfFile && <p className="text-xs text-muted-foreground mt-1">{pdfFile.name}</p>}
            </div>

            <div>
              <Label className="text-sm font-normal mb-2 block">
                Tour Guide License / Certificate {canPublishWithoutCertificate ? "(Optional)" : "*"}
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                {canPublishWithoutCertificate
                  ? "You can upload your official tour guide license or certification (PDF or image), but publishing is allowed without it for your account."
                  : "Upload your official tour guide license or certification (PDF or image) to publish this tour package."}
              </p>
              {licenseUrl ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <span className="text-sm flex-1 text-green-700 dark:text-green-300">✓ License uploaded</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setLicenseUrl("")}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" /> Remove
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => setLicenseDialogOpen(true)}>
                  <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload License
                </Button>
              )}
              <CloudinaryUploadDialog
                title="Upload Tour Guide License/Certificate"
                folder="tour_licenses"
                accept="image/*,application/pdf"
                multiple={false}
                maxFiles={1}
                autoStart={true}
                value={licenseUrl ? [licenseUrl] : []}
                onChange={(urls) => setLicenseUrl(urls[0] || "")}
                open={licenseDialogOpen}
                onOpenChange={setLicenseDialogOpen}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-6 border-t">
            {lastSaved && (
              <p className="text-xs text-muted-foreground text-center">
                Last saved: {lastSaved.toLocaleTimeString()}
              </p>
            )}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => navigate("/host-dashboard")} disabled={uploading} className="flex-1">
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleSaveDraft} 
                disabled={uploading || isSaving}
                className="flex-1"
              >
                {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Draft</>}
              </Button>
              <Button type="submit" disabled={uploading || !isFormValid()} className="flex-1">
                {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create Package"}
              </Button>
            </div>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}
