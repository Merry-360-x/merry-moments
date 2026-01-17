import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CloudinaryUploadDialog } from "@/components/CloudinaryUploadDialog";
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  DollarSign,
  Users,
  MapPin,
  Edit,
  Save,
  Eye,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

type TourType = "Private" | "Group";
type TourCategory = "Cultural" | "Adventure" | "Wildlife" | "City Tours" | "Hiking" | "Photography" | "Historical" | "Eco-Tourism";

interface ExtractedData {
  duration?: string;
  dailyItinerary?: string[];
  includedServices?: string[];
  excludedServices?: string[];
  meetingPoint?: string;
  whatToBring?: string[];
  cancellationPolicy?: string;
  price?: number;
  confidence?: {
    [key: string]: 'high' | 'medium' | 'low';
  };
}

const currencies = [
  { value: "RWF", label: "(FRw) RWF", symbol: "FRw" },
  { value: "USD", label: "($) USD", symbol: "$" },
  { value: "EUR", label: "(€) EUR", symbol: "€" },
  { value: "GBP", label: "(£) GBP", symbol: "£" },
];

export default function CreateTourPackage() {
  const { user, isHost } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfUploading, setPdfUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    category: "Cultural" as TourCategory,
    tourType: "Group" as TourType,
    description: "",
    country: "Rwanda",
    city: "",
    
    // Auto-extracted (editable)
    duration: "",
    dailyItinerary: "" as string,
    includedServices: "",
    excludedServices: "",
    meetingPoint: "",
    whatToBring: "",
    cancellationPolicy: "",
    
    // Manual inputs
    pricePerAdult: "",
    currency: "RWF",
    minGuests: "1",
    maxGuests: "10",
    availableDates: [] as string[],
    
    // Images
    coverImage: "",
    galleryImages: [] as string[],
  });

  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [imageUploadOpen, setImageUploadOpen] = useState(false);
  const [galleryUploadOpen, setGalleryUploadOpen] = useState(false);
  const [pdfUploadOpen, setPdfUploadOpen] = useState(false);

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePdfUpload = async (urls: string[]) => {
    if (urls[0]) {
      setPdfUrl(urls[0]);
      setPdfUploadOpen(false);
      // Trigger extraction
      await extractDataFromPdf(urls[0]);
    }
  };

  const extractDataFromPdf = async (url: string) => {
    setExtracting(true);
    try {
      // Call API endpoint to extract data from PDF
      const response = await fetch('/api/extract-tour-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfUrl: url }),
      });

      if (!response.ok) throw new Error('Extraction failed');

      const data = await response.json();
      setExtractedData(data);

      // Populate form with extracted data
      if (data.duration) updateField("duration", data.duration);
      if (data.dailyItinerary) updateField("dailyItinerary", data.dailyItinerary.join('\n\n'));
      if (data.includedServices) updateField("includedServices", data.includedServices.join('\n'));
      if (data.excludedServices) updateField("excludedServices", data.excludedServices.join('\n'));
      if (data.meetingPoint) updateField("meetingPoint", data.meetingPoint);
      if (data.whatToBring) updateField("whatToBring", data.whatToBring.join('\n'));
      if (data.cancellationPolicy) updateField("cancellationPolicy", data.cancellationPolicy);
      if (data.price) updateField("pricePerAdult", data.price.toString());

      toast({
        title: "Extraction complete!",
        description: "Review the extracted information and edit as needed.",
      });
    } catch (error) {
      console.error('[CreateTourPackage] Extraction error:', error);
      toast({
        variant: "destructive",
        title: "Extraction failed",
        description: "Please fill in the information manually.",
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      const payload = {
        host_id: user.id,
        title: formData.title,
        category: formData.category,
        tour_type: formData.tourType,
        description: formData.description,
        country: formData.country,
        city: formData.city,
        duration: formData.duration,
        daily_itinerary: formData.dailyItinerary,
        included_services: formData.includedServices,
        excluded_services: formData.excludedServices,
        meeting_point: formData.meetingPoint,
        what_to_bring: formData.whatToBring,
        cancellation_policy: formData.cancellationPolicy,
        price_per_adult: parseFloat(formData.pricePerAdult) || 0,
        currency: formData.currency,
        min_guests: parseInt(formData.minGuests) || 1,
        max_guests: parseInt(formData.maxGuests) || 10,
        available_dates: formData.availableDates,
        cover_image: formData.coverImage,
        gallery_images: formData.galleryImages,
        itinerary_pdf_url: pdfUrl,
        status: 'draft',
      };

      const { error } = await supabase.from("tour_packages").insert(payload);

      if (error) throw error;

      toast({
        title: "Draft saved!",
        description: "Your tour package has been saved as a draft.",
      });

      navigate("/host-dashboard");
    } catch (error) {
      console.error('[CreateTourPackage] Save draft error:', error);
      toast({
        variant: "destructive",
        title: "Failed to save draft",
        description: "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!user || !disclaimerAccepted) return;
    setSubmitting(true);

    try {
      const payload = {
        host_id: user.id,
        title: formData.title,
        category: formData.category,
        tour_type: formData.tourType,
        description: formData.description,
        country: formData.country,
        city: formData.city,
        duration: formData.duration,
        daily_itinerary: formData.dailyItinerary,
        included_services: formData.includedServices,
        excluded_services: formData.excludedServices,
        meeting_point: formData.meetingPoint,
        what_to_bring: formData.whatToBring,
        cancellation_policy: formData.cancellationPolicy,
        price_per_adult: parseFloat(formData.pricePerAdult) || 0,
        currency: formData.currency,
        min_guests: parseInt(formData.minGuests) || 1,
        max_guests: parseInt(formData.maxGuests) || 10,
        available_dates: formData.availableDates,
        cover_image: formData.coverImage,
        gallery_images: formData.galleryImages,
        itinerary_pdf_url: pdfUrl,
        status: 'pending_approval',
      };

      const { error } = await supabase.from("tour_packages").insert(payload);

      if (error) throw error;

      toast({
        title: "Submitted for review!",
        description: "Your tour package will be reviewed by our team. We'll notify you once it's approved.",
      });

      navigate("/host-dashboard");
    } catch (error) {
      console.error('[CreateTourPackage] Submit error:', error);
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || !isHost) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
        <Navbar />
        <main className="flex-1 container max-w-4xl mx-auto px-4 py-16">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You must be approved as a tour guide host to create tour packages.
            </AlertDescription>
          </Alert>
        </main>
        <Footer />
      </div>
    );
  }

  const isFormValid = 
    formData.title &&
    formData.description &&
    formData.city &&
    pdfUrl &&
    formData.duration &&
    formData.dailyItinerary &&
    formData.pricePerAdult &&
    formData.coverImage;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      <Navbar />

      <main className="flex-1 container max-w-5xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Create Tour Package</CardTitle>
            <CardDescription>
              Upload your tour itinerary PDF and we'll automatically extract the key information
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Manual Inputs Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Basic Information</h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="title">Tour Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Gorilla Trekking Adventure in Volcanoes National Park"
                    value={formData.title}
                    onChange={(e) => updateField("title", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Tour Category *</Label>
                  <Select value={formData.category} onValueChange={(val) => updateField("category", val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cultural">Cultural</SelectItem>
                      <SelectItem value="Adventure">Adventure</SelectItem>
                      <SelectItem value="Wildlife">Wildlife</SelectItem>
                      <SelectItem value="City Tours">City Tours</SelectItem>
                      <SelectItem value="Hiking">Hiking</SelectItem>
                      <SelectItem value="Photography">Photography</SelectItem>
                      <SelectItem value="Historical">Historical</SelectItem>
                      <SelectItem value="Eco-Tourism">Eco-Tourism</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tourType">Tour Type *</Label>
                  <Select value={formData.tourType} onValueChange={(val) => updateField("tourType", val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Private">Private Tour</SelectItem>
                      <SelectItem value="Group">Group Tour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="description">Short Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief overview of your tour..."
                    rows={3}
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => updateField("country", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City / Region *</Label>
                  <Input
                    id="city"
                    placeholder="e.g., Musanze"
                    value={formData.city}
                    onChange={(e) => updateField("city", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* PDF Upload Section */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Tour Itinerary PDF *
              </h3>
              <p className="text-sm text-muted-foreground">
                Upload your detailed tour itinerary PDF. We'll automatically extract duration, daily schedule, included/excluded services, and more.
              </p>

              {pdfUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">PDF uploaded successfully</p>
                      <p className="text-xs text-muted-foreground truncate">{pdfUrl}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPdfUrl("")}
                    >
                      Remove
                    </Button>
                  </div>

                  {/* PDF Preview */}
                  <div className="border rounded-lg overflow-hidden">
                    <iframe
                      src={pdfUrl}
                      className="w-full h-96"
                      title="PDF Preview"
                    />
                  </div>

                  {extracting && (
                    <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      <div>
                        <p className="text-sm font-medium">Extracting information from PDF...</p>
                        <p className="text-xs text-muted-foreground">This may take a few moments</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-24"
                  onClick={() => setPdfUploadOpen(true)}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8" />
                    <span>Upload Itinerary PDF</span>
                    <span className="text-xs text-muted-foreground">PDF files only</span>
                  </div>
                </Button>
              )}
            </div>

            {/* Auto-Extracted Data Section */}
            {extractedData && (
              <div className="space-y-6 border-t pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Extracted Information</h3>
                  <Badge variant="secondary">
                    <Edit className="w-3 h-3 mr-1" />
                    Editable
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Review and edit the information extracted from your PDF
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="duration" className="flex items-center gap-2">
                      Duration (days/nights) *
                      {extractedData.confidence?.duration === 'low' && (
                        <Badge variant="destructive" className="text-xs">Low confidence</Badge>
                      )}
                    </Label>
                    <Input
                      id="duration"
                      placeholder="e.g., 3 days / 2 nights"
                      value={formData.duration}
                      onChange={(e) => updateField("duration", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="meetingPoint">Meeting Point *</Label>
                    <Input
                      id="meetingPoint"
                      placeholder="Where the tour starts"
                      value={formData.meetingPoint}
                      onChange={(e) => updateField("meetingPoint", e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="dailyItinerary">Daily Itinerary Summary *</Label>
                    <Textarea
                      id="dailyItinerary"
                      placeholder="Day 1: ...\nDay 2: ..."
                      rows={6}
                      value={formData.dailyItinerary}
                      onChange={(e) => updateField("dailyItinerary", e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="includedServices">Included Services *</Label>
                    <Textarea
                      id="includedServices"
                      placeholder="One per line"
                      rows={4}
                      value={formData.includedServices}
                      onChange={(e) => updateField("includedServices", e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="excludedServices">Excluded Services</Label>
                    <Textarea
                      id="excludedServices"
                      placeholder="One per line"
                      rows={3}
                      value={formData.excludedServices}
                      onChange={(e) => updateField("excludedServices", e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="whatToBring">What to Bring</Label>
                    <Textarea
                      id="whatToBring"
                      placeholder="One per line"
                      rows={3}
                      value={formData.whatToBring}
                      onChange={(e) => updateField("whatToBring", e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="cancellationPolicy">Cancellation Policy *</Label>
                    <Textarea
                      id="cancellationPolicy"
                      placeholder="Describe your cancellation policy..."
                      rows={3}
                      value={formData.cancellationPolicy}
                      onChange={(e) => updateField("cancellationPolicy", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Pricing & Availability */}
            <div className="space-y-6 border-t pt-6">
              <h3 className="text-lg font-semibold">Pricing & Availability</h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="pricePerAdult">Price per Adult *</Label>
                  <div className="flex gap-2">
                    <Select value={formData.currency} onValueChange={(val) => updateField("currency", val)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="pricePerAdult"
                      type="number"
                      placeholder="0"
                      value={formData.pricePerAdult}
                      onChange={(e) => updateField("pricePerAdult", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minGuests">Min Guests</Label>
                  <Input
                    id="minGuests"
                    type="number"
                    min="1"
                    value={formData.minGuests}
                    onChange={(e) => updateField("minGuests", e.target.value)}
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="maxGuests">Max Group Size</Label>
                  <Input
                    id="maxGuests"
                    type="number"
                    min="1"
                    value={formData.maxGuests}
                    onChange={(e) => updateField("maxGuests", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="space-y-6 border-t pt-6">
              <h3 className="text-lg font-semibold">Tour Images</h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Cover Image *</Label>
                  {formData.coverImage ? (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                      <img src={formData.coverImage} alt="Cover" className="w-full h-full object-cover" />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => updateField("coverImage", "")}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full h-32"
                      onClick={() => setImageUploadOpen(true)}
                    >
                      <Upload className="w-6 h-6 mr-2" />
                      Upload Cover Image
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Gallery Images (optional)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {formData.galleryImages.map((img, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => updateField("galleryImages", formData.galleryImages.filter((_, j) => j !== i))}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full text-white flex items-center justify-center hover:bg-black/80"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      className="aspect-square"
                      onClick={() => setGalleryUploadOpen(true)}
                    >
                      <Upload className="w-6 h-6" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="border-t pt-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={disclaimerAccepted}
                      onCheckedChange={(checked) => setDisclaimerAccepted(checked as boolean)}
                      className="mt-0.5"
                    />
                    <label className="text-sm cursor-pointer" onClick={() => setDisclaimerAccepted(!disclaimerAccepted)}>
                      I understand that this tour will not be published or bookable until reviewed and approved by the Merry360x team.
                    </label>
                  </div>
                </AlertDescription>
              </Alert>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={!formData.title || submitting}
              >
                <Save className="w-4 h-4 mr-2" />
                Save as Draft
              </Button>
              <Button
                onClick={handleSubmitForReview}
                disabled={!isFormValid || !disclaimerAccepted || submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Submit for Review
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />

      {/* Upload Dialogs */}
      <CloudinaryUploadDialog
        open={pdfUploadOpen}
        onOpenChange={setPdfUploadOpen}
        title="Upload Tour Itinerary PDF"
        folder="tour_packages/itineraries"
        accept="application/pdf"
        multiple={false}
        value={pdfUrl ? [pdfUrl] : []}
        onChange={handlePdfUpload}
      />

      <CloudinaryUploadDialog
        open={imageUploadOpen}
        onOpenChange={setImageUploadOpen}
        title="Upload Cover Image"
        folder="tour_packages/covers"
        accept="image/*"
        multiple={false}
        value={formData.coverImage ? [formData.coverImage] : []}
        onChange={(urls) => updateField("coverImage", urls[0] || "")}
      />

      <CloudinaryUploadDialog
        open={galleryUploadOpen}
        onOpenChange={setGalleryUploadOpen}
        title="Upload Gallery Images"
        folder="tour_packages/gallery"
        accept="image/*"
        multiple
        value={formData.galleryImages}
        onChange={(urls) => updateField("galleryImages", urls)}
      />
    </div>
  );
}
