import { useState } from "react";
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
import { AlertCircle, Loader2, Upload, X } from "lucide-react";
import { CloudinaryUploadDialog } from "@/components/CloudinaryUploadDialog";
import { uploadFile } from "@/lib/uploads";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const categories = ["Cultural", "Adventure", "Wildlife", "City Tours", "Hiking", "Photography", "Historical", "Eco-Tourism"];
const tourTypes = ["Private", "Group"];

export default function CreateTourPackage() {
  const { user, isHost } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    tour_type: "",
    description: "",
    city: "",
    duration: "",
    daily_itinerary: "",
    included_services: "",
    excluded_services: "",
    meeting_point: "",
    what_to_bring: "",
    cancellation_policy: "",
    price_per_adult: "",
    currency: "RWF",
    min_guests: 1,
    max_guests: 10,
  });

  const [coverImage, setCoverImage] = useState<string>("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [galleryDialogOpen, setGalleryDialogOpen] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const isFormValid = () => {
    return formData.title.trim() && formData.category && formData.tour_type &&
      formData.description.trim().length >= 50 && formData.city.trim() &&
      formData.duration.trim() && formData.daily_itinerary.trim().length >= 100 &&
      formData.meeting_point.trim() && formData.cancellation_policy.trim().length >= 20 &&
      parseFloat(formData.price_per_adult) > 0 && coverImage && pdfFile;
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf" || file.size > 10 * 1024 * 1024) {
        toast({ title: "Invalid PDF", description: "Must be PDF under 10MB", variant: "destructive" });
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
      let pdfUrl = "";
      if (pdfFile) {
        const { url } = await uploadFile(pdfFile, { folder: "tour-itineraries" });
        pdfUrl = url;
      }

      const packageData: Database['public']['Tables']['tour_packages']['Insert'] = {
        host_id: user.id,
        title: formData.title.trim(),
        category: formData.category,
        tour_type: formData.tour_type,
        description: formData.description.trim(),
        country: "Rwanda",
        city: formData.city.trim(),
        duration: formData.duration.trim(),
        daily_itinerary: formData.daily_itinerary.trim(),
        included_services: formData.included_services.trim() || null,
        excluded_services: formData.excluded_services.trim() || null,
        meeting_point: formData.meeting_point.trim(),
        what_to_bring: formData.what_to_bring.trim() || null,
        cancellation_policy: formData.cancellation_policy.trim(),
        price_per_adult: parseFloat(formData.price_per_adult),
        currency: formData.currency,
        min_guests: formData.min_guests,
        max_guests: formData.max_guests,
        cover_image: coverImage,
        gallery_images: galleryImages.length > 0 ? galleryImages : null,
        itinerary_pdf_url: pdfUrl,
        status: "draft",
      };

      const { error } = await supabase.from("tour_packages").insert(packageData as any).select().single();
      if (error) throw error;

      toast({ title: "Success!", description: "Tour package created successfully" });
      navigate("/host-dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create tour package", variant: "destructive" });
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
          <p className="text-sm text-muted-foreground mb-6">Please sign in to create tour packages</p>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-normal mb-1.5 block">Category *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-normal mb-1.5 block">Tour Type *</Label>
                <Select value={formData.tour_type} onValueChange={(v) => setFormData({ ...formData, tour_type: v })}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {tourTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm font-normal mb-1.5 block">Description * <span className="text-xs text-muted-foreground">(min 50 chars)</span></Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide a compelling description..."
                rows={4}
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
              <Label className="text-sm font-normal mb-1.5 block">Daily Itinerary * <span className="text-xs text-muted-foreground">(min 100 chars)</span></Label>
              <Textarea
                value={formData.daily_itinerary}
                onChange={(e) => setFormData({ ...formData, daily_itinerary: e.target.value })}
                placeholder="Day 1: ..., Day 2: ..."
                rows={6}
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

            <div>
              <Label className="text-sm font-normal mb-1.5 block">Cancellation Policy * <span className="text-xs text-muted-foreground">(min 20 chars)</span></Label>
              <Textarea
                value={formData.cancellation_policy}
                onChange={(e) => setFormData({ ...formData, cancellation_policy: e.target.value })}
                placeholder="Full refund if cancelled 7+ days before..."
                rows={3}
              />
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
                  <SelectContent>
                    <SelectItem value="RWF">RWF</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
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
          <div className="flex gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => navigate("/host-dashboard")} disabled={uploading} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={uploading || !isFormValid()} className="flex-1">
              {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create Package"}
            </Button>
          </div>
        </form>
      </div>
      <Footer />
    </div>
  );
}
