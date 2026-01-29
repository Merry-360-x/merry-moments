import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X, AlertCircle, Loader2, Save } from "lucide-react";
import { CloudinaryUploadDialog } from "@/components/CloudinaryUploadDialog";
import { extractPDFMetadata, validatePDF } from "@/lib/pdf-extractor";
import { uploadFile } from "@/lib/uploads";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const categories = ["Nature", "Adventure", "Cultural", "Wildlife", "Historical", "City Tours", "Eco-Tourism", "Photography"];

interface FormErrors {
  title?: string;
  description?: string;
  location?: string;
  price_per_person?: string;
  duration_days?: string;
  max_participants?: string;
  images?: string;
  categories?: string;
}

export default function CreateTour() {
  const { user, isHost } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    categories: [] as string[],
    duration_days: 1,
    max_participants: 10,
    price_per_person: 0,
    currency: "RWF",
  });

  const [images, setImages] = useState<string[]>([]);
  const [cloudinaryDialogOpen, setCloudinaryDialogOpen] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfMetadata, setPdfMetadata] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Use a stable storage key
  const getStorageKey = () => user?.id ? `tour-draft-${user.id}` : 'tour-draft-anonymous';

  // Load draft on mount (only once)
  useEffect(() => {
    if (draftLoaded) return;
    
    const draftKey = getStorageKey();
    const savedDraft = localStorage.getItem(draftKey);
    
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.formData) setFormData(draft.formData);
        if (draft.images) setImages(draft.images);
        setLastSaved(new Date(draft.timestamp));
        toast({ title: "Draft restored", description: "Your previous work has been restored" });
        console.log('[CreateTour] Draft restored from', draftKey);
      } catch (err) {
        console.error('Failed to load draft:', err);
      }
    }
    setDraftLoaded(true);
  }, [user?.id, draftLoaded]);

  // Auto-save on form changes (only after load)
  useEffect(() => {
    if (!draftLoaded) return;
    
    const draftKey = getStorageKey();
    
    // Only save if there's meaningful content
    if (!formData.title && !formData.description) return;
    
    const timer = setTimeout(() => {
      const draft = {
        formData,
        images,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
      setLastSaved(new Date());
      console.log('[CreateTour] Auto-saved draft to', draftKey);
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timer);
  }, [formData, images, user?.id, draftLoaded]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!formData.title && !formData.description) return;
      
      const draftKey = getStorageKey();
      const draft = {
        formData,
        images,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
      console.log('[CreateTour] Saved on page unload');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, images, user?.id]);

  const saveDraft = () => {
    const draftKey = getStorageKey();
    const draft = {
      formData,
      images,
      timestamp: new Date().toISOString(),
    };
    
    localStorage.setItem(draftKey, JSON.stringify(draft));
    setLastSaved(new Date());
    console.log('[CreateTour] Manually saved draft');
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

  useEffect(() => {
    if (pdfFile) {
      extractPDFMetadata(pdfFile).then((metadata) => {
        setPdfMetadata(metadata);
        if (metadata.title && !formData.title) {
          setFormData(prev => ({ ...prev, title: metadata.title! }));
        }
        if (metadata.duration && formData.duration_days === 1) {
          const days = parseInt(metadata.duration) || 1;
          setFormData(prev => ({ ...prev, duration_days: days }));
        }
      });
    }
  }, [pdfFile, formData.title, formData.duration_days]);

  useEffect(() => {
    const newErrors: FormErrors = {};
    if (touched.has('title') && !formData.title.trim()) newErrors.title = "Required";
    if (touched.has('description') && formData.description.trim().length < 20) newErrors.description = "Minimum 20 characters";
    if (touched.has('location') && !formData.location.trim()) newErrors.location = "Required";
    if (touched.has('price_per_person') && formData.price_per_person <= 0) newErrors.price_per_person = "Must be greater than 0";
    if (touched.has('duration_days') && formData.duration_days < 1) newErrors.duration_days = "Must be at least 1";
    if (touched.has('max_participants') && formData.max_participants < 1) newErrors.max_participants = "Must be at least 1";
    if (touched.has('categories') && formData.categories.length === 0) newErrors.categories = "Select at least one";
    if (touched.has('images') && images.length === 0) newErrors.images = "Upload at least one image";
    setErrors(newErrors);
  }, [formData, images, touched]);

  const handleBlur = (field: string) => setTouched(prev => new Set([...prev, field]));

  const isFormValid = () => {
    return formData.title.trim() && formData.description.trim().length >= 20 &&
      formData.location.trim() && formData.price_per_person > 0 &&
      formData.duration_days >= 1 && formData.max_participants >= 1 &&
      formData.categories.length > 0 && images.length > 0;
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validatePDF(file);
      if (!validation.valid) {
        toast({ title: "Invalid PDF", description: validation.error, variant: "destructive" });
        return;
      }
      setPdfFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isFormValid()) return;
    setUploading(true);

    try {
      let pdfUrl = null;
      if (pdfFile) {
        try {
          const { url } = await uploadFile(pdfFile, { folder: "tour-itineraries" });
          pdfUrl = url;
        } catch {
          toast({ title: "PDF upload failed", description: "Continuing without PDF", variant: "default" });
        }
      }

      const tourData: Database['public']['Tables']['tours']['Insert'] = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        location: formData.location.trim(),
        category: formData.categories[0] || null,
        categories: formData.categories.length > 1 ? formData.categories.slice(1) : null,
        duration_days: formData.duration_days || null,
        max_group_size: formData.max_participants || null,
        price_per_person: formData.price_per_person,
        currency: formData.currency || null,
        images: images.length > 0 ? images : null,
        itinerary_pdf_url: pdfUrl || null,
        created_by: user.id || null,
        is_published: true,
      };

      const { error } = await supabase.from("tours").insert(tourData as any).select().single();
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["tours"] });
      await queryClient.invalidateQueries({ queryKey: ["featured-tours"] });

      toast({ title: "Success!", description: "Tour created successfully" });
      clearDraft();
      navigate("/host-dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create tour", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-medium mb-2">Sign In Required</h1>
          <p className="text-sm text-muted-foreground mb-6">Please sign in to create tours</p>
          <Button onClick={() => navigate("/auth")}>Sign In</Button>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isHost) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-medium mb-2">Host Access Required</h1>
          <p className="text-sm text-muted-foreground mb-6">You must be an approved host</p>
          <Button onClick={() => navigate("/host-application")}>Become a Host</Button>
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
          <h1 className="text-2xl font-medium mb-2">Create Tour</h1>
          <p className="text-sm text-muted-foreground">Fill in the details to create your tour</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Basic */}
          <div className="space-y-5">
            <h2 className="text-base font-medium pb-2 border-b">Basic Information</h2>
            
            <div>
              <Label className="text-sm font-normal mb-1.5 block">Tour Name *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                onBlur={() => handleBlur('title')}
                placeholder="Gorilla Trekking Adventure"
                className={cn("h-10", errors.title && "border-destructive")}
              />
              {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
            </div>

            <div>
              <Label className="text-sm font-normal mb-1.5 block">
                Description * 
                <span className={`text-xs ml-1 ${formData.description.length > 0 && formData.description.length < 20 ? 'text-red-500' : 'text-muted-foreground'}`}>
                  ({formData.description.length}/20 chars min)
                </span>
              </Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                onBlur={() => handleBlur('description')}
                placeholder="Describe your tour experience..."
                rows={4}
                className={cn(
                  (errors.description || (formData.description.length > 0 && formData.description.length < 20)) && "border-destructive"
                )}
              />
              {errors.description && <p className="text-xs text-destructive mt-1">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-normal mb-1.5 block">Location *</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  onBlur={() => handleBlur('location')}
                  placeholder="Kigali, Rwanda"
                  className={cn("h-10", errors.location && "border-destructive")}
                />
                {errors.location && <p className="text-xs text-destructive mt-1">{errors.location}</p>}
              </div>
            </div>
          </div>

          {/* Tour Details */}
          <div className="space-y-5">
            <h2 className="text-base font-medium pb-2 border-b">Tour Details</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-normal mb-1.5 block">Duration (days) *</Label>
                <Input
                  type="number"
                  value={formData.duration_days}
                  onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) || 1 })}
                  min="1"
                  className={cn("h-10", errors.duration_days && "border-destructive")}
                />
                {errors.duration_days && <p className="text-xs text-destructive mt-1">{errors.duration_days}</p>}
              </div>

              <div>
                <Label className="text-sm font-normal mb-1.5 block">Max Guests *</Label>
                <Input
                  type="number"
                  value={formData.max_participants}
                  onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) || 10 })}
                  min="1"
                  className={cn("h-10", errors.max_participants && "border-destructive")}
                />
                {errors.max_participants && <p className="text-xs text-destructive mt-1">{errors.max_participants}</p>}
              </div>
            </div>

            <div>
              <Label className="text-sm font-normal mb-1.5 block">Categories * <span className="text-xs text-muted-foreground">(select at least one)</span></Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {categories.map((cat) => (
                  <label key={cat} className="flex items-center space-x-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={formData.categories.includes(cat)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({ ...formData, categories: [...formData.categories, cat] });
                        } else {
                          setFormData({ ...formData, categories: formData.categories.filter(c => c !== cat) });
                        }
                        setTouched(prev => new Set([...prev, 'categories']));
                      }}
                    />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
              {errors.categories && <p className="text-xs text-destructive mt-1">{errors.categories}</p>}
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-5">
            <h2 className="text-base font-medium pb-2 border-b">Pricing</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-normal mb-1.5 block">Price *</Label>
                <Input
                  type="number"
                  value={formData.price_per_person}
                  onChange={(e) => setFormData({ ...formData, price_per_person: parseFloat(e.target.value) || 0 })}
                  onBlur={() => handleBlur('price_per_person')}
                  min="0"
                  step="0.01"
                  className={cn("h-10", errors.price_per_person && "border-destructive")}
                />
                {errors.price_per_person && <p className="text-xs text-destructive mt-1">{errors.price_per_person}</p>}
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
          </div>

          {/* Media */}
          <div className="space-y-5">
            <h2 className="text-base font-medium pb-2 border-b">Images & Files</h2>

            <div>
              <Label className="text-sm font-normal mb-2 block">Tour Images * <span className="text-xs text-muted-foreground">(at least 1)</span></Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {images.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={img} alt="" className="w-20 h-20 object-cover rounded border" />
                    <button
                      type="button"
                      onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                      className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setCloudinaryDialogOpen(true)}>
                <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Images
              </Button>
              {errors.images && <p className="text-xs text-destructive mt-1">{errors.images}</p>}
              <CloudinaryUploadDialog
                title="Upload Images"
                folder="tours"
                accept="image/*"
                multiple={true}
                maxFiles={10}
                value={images}
                onChange={(urls) => {
                  setImages(urls);
                  setTouched(prev => new Set([...prev, 'images']));
                }}
                open={cloudinaryDialogOpen}
                onOpenChange={setCloudinaryDialogOpen}
              />
            </div>

            <div>
              <Label className="text-sm font-normal mb-2 block">Itinerary PDF <span className="text-xs text-muted-foreground">(optional)</span></Label>
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
                {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create Tour"}
              </Button>
            </div>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}
