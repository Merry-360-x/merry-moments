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

const categories = ["Cultural", "Adventure", "Wildlife", "City Tours", "Hiking", "Photography", "Historical", "Eco-Tourism"];
const tourTypes = ["Private", "Group"];

export default function CreateTourPackage() {
  const { user, isHost, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const redirectTo = searchParams.get("redirect") || "/host-dashboard";

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
    currency: "RWF",
    min_guests: 1,
    max_guests: 10,
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

  // Use a stable storage key - always use user ID if available, otherwise anonymous
  const getStorageKey = () => user?.id ? `tour-package-draft-${user.id}` : 'tour-package-draft-anonymous';

  // Load draft on mount (only once)
  useEffect(() => {
    if (draftLoaded) return; // Already loaded
    
    const draftKey = getStorageKey();
    const savedDraft = localStorage.getItem(draftKey);
    
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.formData) setFormData(draft.formData);
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
  }, [user?.id, draftLoaded]);

  // Auto-save on form changes (debounced) - only after initial load
  useEffect(() => {
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
  }, [formData, groupDiscounts, pricingTiers, selectedNonRefundable, customNonRefundable1, customNonRefundable2, coverImage, galleryImages, selectedPolicies, customPolicyText, user?.id, draftLoaded]);

  // Also save immediately when leaving the page
  useEffect(() => {
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
  }, [formData, groupDiscounts, pricingTiers, selectedNonRefundable, customNonRefundable1, customNonRefundable2, coverImage, galleryImages, selectedPolicies, customPolicyText, user?.id]);

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
    // Cancellation policy is now optional - can use default or add later
    const policyValid = selectedPolicies.length === 0 || 
      (!selectedPolicies.includes('custom') || (customPolicyText.trim().length >= 20 || customPolicyFile !== null));
    
    return formData.title.trim() && formData.categories.length > 0 && formData.tour_types.length > 0 &&
      formData.description.trim().length >= 50 && formData.city.trim() &&
      formData.duration.trim() && formData.daily_itinerary.trim().length >= 100 &&
      formData.meeting_point.trim() && policyValid &&
      parseFloat(formData.price_per_adult) > 0;
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
      (packageData as any).pricing_tiers = normalizedPricingTiers.length > 0 ? normalizedPricingTiers : null;

      // Keep backwards compatibility: if the host provided a "single person" tier,
      // use it as the base price shown across the app.
      const singleTier = normalizedPricingTiers.find((t) => t.group_size === 1);
      if (singleTier) {
        (packageData as any).price_per_adult = singleTier.price_per_person;
      }

      const { data: newPackage, error } = await supabase.from("tour_packages").insert(packageData as any).select("id").single();
      if (error) throw error;

      // Update categories array separately (after migration is applied)
      if (newPackage && formData.categories.length > 0) {
        await supabase.from("tour_packages").update({ 
          categories: formData.categories,
          tour_types: formData.tour_types, // Store all selected tour types
        } as any).eq("id", (newPackage as any).id);
      }

      toast({ title: "Success!", description: "Tour package created successfully" });
      clearDraft(); // Clear the draft after successful submission
      navigate(redirectTo);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create tour package", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
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
          <h1 className="text-2xl font-medium mb-2">Create Tour Package</h1>
          <p className="text-sm text-muted-foreground">Fill in the details to create your tour package</p>
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
                <Label className="text-sm font-normal mb-1.5 block">Price per Adult *</Label>
                <Input
                  type="number"
                  value={formData.price_per_adult}
                  onChange={(e) => setFormData({ ...formData, price_per_adult: e.target.value })}
                  min="0"
                  step="0.01"
                  className="h-10"
                />
              </div>

              <div>
                <Label className="text-sm font-normal mb-1.5 block">Currency</Label>
                <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="RWF">(FRw) RWF - Rwandan Franc</SelectItem>
                    <SelectItem value="USD">($) USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">(€) EUR - Euro</SelectItem>
                    <SelectItem value="GBP">(£) GBP - British Pound</SelectItem>
                    <SelectItem value="CNY">(¥) CNY - Chinese Yuan</SelectItem>
                    <SelectItem value="JPY">(¥) JPY - Japanese Yen</SelectItem>
                    <SelectItem value="CAD">($) CAD - Canadian Dollar</SelectItem>
                    <SelectItem value="AUD">($) AUD - Australian Dollar</SelectItem>
                    <SelectItem value="CHF">(Fr) CHF - Swiss Franc</SelectItem>
                    <SelectItem value="INR">(₹) INR - Indian Rupee</SelectItem>
                    <SelectItem value="ZAR">(R) ZAR - South African Rand</SelectItem>
                    <SelectItem value="KES">(KSh) KES - Kenyan Shilling</SelectItem>
                    <SelectItem value="UGX">(USh) UGX - Ugandan Shilling</SelectItem>
                    <SelectItem value="TZS">(TSh) TZS - Tanzanian Shilling</SelectItem>
                    <SelectItem value="AED">(د.إ) AED - UAE Dirham</SelectItem>
                    <SelectItem value="SAR">(﷼) SAR - Saudi Riyal</SelectItem>
                    <SelectItem value="BRL">(R$) BRL - Brazilian Real</SelectItem>
                    <SelectItem value="MXN">($) MXN - Mexican Peso</SelectItem>
                    <SelectItem value="SGD">($) SGD - Singapore Dollar</SelectItem>
                    <SelectItem value="HKD">($) HKD - Hong Kong Dollar</SelectItem>
                    <SelectItem value="NZD">($) NZD - New Zealand Dollar</SelectItem>
                    <SelectItem value="SEK">(kr) SEK - Swedish Krona</SelectItem>
                    <SelectItem value="NOK">(kr) NOK - Norwegian Krone</SelectItem>
                    <SelectItem value="DKK">(kr) DKK - Danish Krone</SelectItem>
                    <SelectItem value="PLN">(zł) PLN - Polish Zloty</SelectItem>
                    <SelectItem value="THB">(฿) THB - Thai Baht</SelectItem>
                    <SelectItem value="MYR">(RM) MYR - Malaysian Ringgit</SelectItem>
                    <SelectItem value="IDR">(Rp) IDR - Indonesian Rupiah</SelectItem>
                    <SelectItem value="PHP">(₱) PHP - Philippine Peso</SelectItem>
                    <SelectItem value="KRW">(₩) KRW - South Korean Won</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
