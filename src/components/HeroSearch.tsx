import { Calendar as CalendarIcon, MapPin, Minus, Plus, Search, Users, X, Building2, Map, Car } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { DateRange } from "react-day-picker";

type DestinationSuggestion = {
  location: string;
};

import { extractNeighborhood } from "@/lib/location";

const NEARBY_LABEL = "Find what's nearby";

// Comprehensive list of places in Rwanda - organized by region
const KIGALI_NEIGHBORHOODS = [
  "Kigali City Center",
  "Nyarutarama",
  "Kimihurura",
  "Kacyiru",
  "Remera",
  "Gikondo",
  "Nyamirambo",
  "Kiyovu",
  "Kibagabaga",
  "Gisozi",
  "Kagugu",
  "Rebero",
  "Gacuriro",
  "Kimironko",
  "Kicukiro",
  "Nyarugenge",
  "Gasabo",
  "Kanombe",
  "Masaka",
  "Kabeza",
  "Kagarama",
  "Niboye",
  "Nyagatare",
  "Kimisagara",
  "Biryogo",
  "Rugando",
  "Muhima",
  "Nyakabanda",
  "Kinyinya",
  "Rusororo",
  "Batsinda",
  "Gatenga",
  "Kabuga",
  "Norvege", // Local neighborhood in Kigali
];

const RWANDA_CITIES = [
  "Kigali",
  "Musanze (Ruhengeri)",
  "Rubavu (Gisenyi)",
  "Huye (Butare)",
  "Nyanza",
  "Rwamagana",
  "Muhanga",
  "Karongi (Kibuye)",
  "Rusizi (Cyangugu)",
  "Nyagatare",
  "Kayonza",
  "Bugesera",
  "Burera",
];

const RWANDA_ATTRACTIONS = [
  "Volcanoes National Park",
  "Akagera National Park",
  "Nyungwe National Park",
  "Lake Kivu",
  "Kigali Genocide Memorial",
  "King's Palace Museum, Nyanza",
  "Ethnographic Museum, Huye",
  "Inema Arts Center",
  "Kandt House Museum",
  "Nyamata Genocide Memorial",
  "Mount Bisoke",
  "Mount Karisimbi",
  "Gisakura Tea Estate",
  "Ruhondo Lake",
  "Burera Lake",
];

// Combine all locations for search suggestions
const STATIC_DESTINATIONS = [
  ...KIGALI_NEIGHBORHOODS,
  ...RWANDA_CITIES,
  ...RWANDA_ATTRACTIONS,
];

const fetchAllAccommodationLocations = async () => {
  const { data, error } = await supabase
    .from("properties")
    .select("location")
    .eq("is_published", true)
    .order("location", { ascending: true });

  if (error) throw error;

  // Get all unique locations from database
  const dbLocations = (data as DestinationSuggestion[] | null)
    ?.map((d) => d.location)
    .filter(Boolean) ?? [];
  
  const uniqueDbLocations = Array.from(new Set(dbLocations));
  
  // Combine static destinations with database locations
  // Prioritize Kigali neighborhoods, then cities, then attractions, then DB locations
  const allLocations = [
    NEARBY_LABEL,
    ...KIGALI_NEIGHBORHOODS.slice(0, 15), // Top Kigali neighborhoods
    ...RWANDA_CITIES.slice(0, 10), // Major cities
    ...RWANDA_ATTRACTIONS.slice(0, 10), // Popular attractions
    ...uniqueDbLocations.slice(0, 20), // Database locations
  ];
  
  // Remove duplicates and limit to reasonable number
  return Array.from(new Set(allLocations)).slice(0, 50);
};

const fetchDestinationSuggestions = async (search: string) => {
  let query = supabase
    .from("properties")
    .select("location")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(100);

  const trimmed = search.trim().toLowerCase();
  
  // If there's a search term, filter database locations
  if (trimmed) {
    query = query.ilike("location", `%${trimmed}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Get all unique full locations from accommodations
  const fullLocations = (data as DestinationSuggestion[] | null)
    ?.map((d) => d.location)
    .filter(Boolean) ?? [];
  
  // Extract neighborhoods from full locations for additional suggestions
  const neighborhoods = fullLocations
    .map((location) => extractNeighborhood(location))
    .filter(Boolean);
  
  // Smart search algorithm:
  // 1. Filter static destinations that match the search
  const matchedStatic = trimmed
    ? STATIC_DESTINATIONS.filter((x) => String(x).toLowerCase().includes(trimmed))
    : STATIC_DESTINATIONS;
  
  // 2. Prioritize exact matches and starts-with matches
  const exactMatches = matchedStatic.filter((x) => 
    String(x).toLowerCase() === trimmed
  );
  const startsWithMatches = matchedStatic.filter((x) => 
    String(x).toLowerCase().startsWith(trimmed) && !exactMatches.includes(x)
  );
  const containsMatches = matchedStatic.filter((x) => 
    !exactMatches.includes(x) && !startsWithMatches.includes(x)
  );
  
  // 3. Combine in priority order
  const prioritizedStatic = [
    ...exactMatches,
    ...startsWithMatches,
    ...containsMatches,
  ];
  
  // 4. Combine all suggestions with database locations
  const allSuggestions = [...fullLocations, ...neighborhoods];
  const unique = Array.from(new Set(allSuggestions));
  
  // 5. Filter database locations if searching
  const filteredDbLocations = trimmed
    ? unique.filter((x) => String(x).toLowerCase().includes(trimmed))
    : unique;
  
  // 6. Merge with "Find what's nearby" always at top when no search
  const finalResults = trimmed
    ? [...prioritizedStatic, ...filteredDbLocations]
    : [NEARBY_LABEL, ...prioritizedStatic, ...filteredDbLocations];
  
  // 7. Remove duplicates and limit results
  return Array.from(new Set(finalResults)).slice(0, 20);
};

const HeroSearch = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [openWhere, setOpenWhere] = useState(false);
  const [openWhen, setOpenWhen] = useState(false);
  const [openWho, setOpenWho] = useState(false);

  const [where, setWhere] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [whenTab, setWhenTab] = useState<"dates" | "months" | "flexible">("dates");
  const [dateFlexDays, setDateFlexDays] = useState(0);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [pets, setPets] = useState(0);

  // Mobile Airbnb-style search modal
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"accommodations" | "tours" | "transport">("accommodations");
  const [mobileDateOpen, setMobileDateOpen] = useState(false);
  const [mobileGuestsOpen, setMobileGuestsOpen] = useState(false);

  const guestsLabel = useMemo(() => {
    const total = adults + children + infants;
    return total <= 1 ? t("heroSearch.oneGuest") : t("heroSearch.guests", { count: total });
  }, [adults, children, infants, t]);

  const dateLabel = useMemo(() => {
    if (!dateRange?.from) return t("heroSearch.addDates");

    const fmt = new Intl.DateTimeFormat(i18n.language, { month: "short", day: "numeric" });
    const from = fmt.format(dateRange.from);
    if (!dateRange.to) return from;
    const to = fmt.format(dateRange.to);
    return `${from} - ${to}`;
  }, [dateRange?.from, dateRange?.to, i18n.language, t]);

  const suggestionsEnabled = openWhere || mobileOpen;
  const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: ["destinations", where.trim()],
    queryFn: () => {
      const trimmed = where.trim();
      // Show all locations when no search term, filtered results when searching
      return trimmed ? fetchDestinationSuggestions(where) : fetchAllAccommodationLocations();
    },
    enabled: suggestionsEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const geoToParams = async () => {
    if (!("geolocation" in navigator)) {
      toast({ variant: "destructive", title: "Location not available", description: "Geolocation is not supported." });
      return null;
    }
    return await new Promise<{ lat: number; lng: number } | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {
          toast({
            variant: "destructive",
            title: "Location permission denied",
            description: "Enable location to search nearby listings.",
          });
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 8000 }
      );
    });
  };

  const goSearch = () => {
    if (where.trim() === NEARBY_LABEL) {
      void (async () => {
        const coords = await geoToParams();
        if (!coords) return;
        const params = new URLSearchParams();
        params.set("nearby", "1");
        params.set("lat", String(coords.lat));
        params.set("lng", String(coords.lng));
        navigate(`/accommodations?${params.toString()}`);
      })();
      return;
    }
    const params = new URLSearchParams();
    if (where.trim()) params.set("q", where.trim());
    if (dateRange?.from) params.set("start", dateRange.from.toISOString().slice(0, 10));
    if (dateRange?.to) params.set("end", dateRange.to.toISOString().slice(0, 10));
    if (dateFlexDays > 0) params.set("flex", String(dateFlexDays));
    params.set("adults", String(adults));
    if (children) params.set("children", String(children));
    if (infants) params.set("infants", String(infants));
    if (pets) params.set("pets", String(pets));

    const qs = params.toString();
    navigate(qs ? `/accommodations?${qs}` : "/accommodations");
  };

  const goMobileSearch = () => {
    if (where.trim() === NEARBY_LABEL) {
      void (async () => {
        const coords = await geoToParams();
        if (!coords) return;
        const params = new URLSearchParams();
        params.set("nearby", "1");
        params.set("lat", String(coords.lat));
        params.set("lng", String(coords.lng));
        const qs = params.toString();
        if (mobileTab === "tours") {
          navigate(`/tours?${qs}`);
        } else if (mobileTab === "transport") {
          navigate(`/transport?${qs}`);
        } else {
          navigate(`/accommodations?${qs}`);
        }
        setMobileOpen(false);
      })();
      return;
    }
    const params = new URLSearchParams();
    if (where.trim()) params.set("q", where.trim());
    if (dateRange?.from) params.set("start", dateRange.from.toISOString().slice(0, 10));
    if (dateRange?.to) params.set("end", dateRange.to.toISOString().slice(0, 10));
    if (dateFlexDays > 0) params.set("flex", String(dateFlexDays));
    params.set("adults", String(adults));
    if (children) params.set("children", String(children));
    if (infants) params.set("infants", String(infants));
    if (pets) params.set("pets", String(pets));

    const qs = params.toString();
    if (mobileTab === "tours") {
      navigate(qs ? `/tours?${qs}` : "/tours");
      return;
    }
    if (mobileTab === "transport") {
      navigate(qs ? `/transport?${qs}` : "/transport");
      return;
    }
    navigate(qs ? `/accommodations?${qs}` : "/accommodations");
  };

  const closeAll = () => {
    setOpenWhere(false);
    setOpenWhen(false);
    setOpenWho(false);
  };

  const monthRange = (d: Date) => {
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { from: start, to: end } satisfies DateRange;
  };

  const setFlexibleDays = (days: number) => {
    const base = dateRange?.from ? new Date(dateRange.from) : new Date();
    const end = new Date(base);
    end.setDate(end.getDate() + Math.max(0, days));
    setDateRange({ from: base, to: end });
  };

  const clamp = (n: number) => Math.max(0, n);

  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      {/* Mobile search trigger (Airbnb-style) */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="w-full bg-background/95 backdrop-blur rounded-full shadow-search border border-border px-4 py-3 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <Search className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-semibold text-foreground truncate">
              {where.trim() ? where : t("heroSearch.wherePlaceholder")}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {dateLabel} · {guestsLabel}
            </div>
          </div>
        </button>

        <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogContent className="p-0 w-[100vw] max-w-[100vw] h-[100vh] max-h-[100vh] rounded-none">
            <div className="h-full bg-background flex flex-col">
              {/* Top tabs + close */}
              <div className="px-4 pt-4 pb-3 border-b border-border relative">
                <button
                  type="button"
                  className="absolute right-4 top-4 h-10 w-10 rounded-full border border-border bg-background shadow-sm flex items-center justify-center"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>

                <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as typeof mobileTab)}>
                  <TabsList className="w-full justify-center">
                    <TabsTrigger value="accommodations" className="gap-2">
                      <Building2 className="w-4 h-4" /> {t("nav.accommodations")}
                    </TabsTrigger>
                    <TabsTrigger value="tours" className="gap-2">
                      <Map className="w-4 h-4" /> {t("nav.tours")}
                    </TabsTrigger>
                    <TabsTrigger value="transport" className="gap-2">
                      <Car className="w-4 h-4" /> {t("nav.transport")}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="rounded-3xl border border-border bg-card shadow-card p-4">
                  <div className="text-3xl font-bold text-foreground mb-3">Where?</div>

                  <div className="rounded-2xl border border-border bg-background px-4 py-3 flex items-center gap-3">
                    <Search className="w-5 h-5 text-muted-foreground" />
                    <input
                      value={where}
                      onChange={(e) => setWhere(e.target.value)}
                      placeholder="Search destinations"
                      className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div className="mt-4 text-sm font-semibold text-foreground">Suggested destinations</div>
                  <div className="mt-2 space-y-2">
                    {suggestionsLoading ? (
                      <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
                    ) : suggestions.length === 0 ? (
                      <div className="text-sm text-muted-foreground">{t("heroSearch.noDestinations")}</div>
                    ) : (
                      suggestions.map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => {
                            setWhere(loc);
                            if (loc === NEARBY_LABEL) {
                              goMobileSearch();
                              return;
                            }
                          }}
                          className="w-full flex items-center gap-3 rounded-2xl hover:bg-muted/40 p-2 text-left"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate">{loc}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {loc === NEARBY_LABEL ? "Use your current location" : "Suggested destination"}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-border bg-card p-4 flex items-center justify-between"
                    onClick={() => setMobileDateOpen(true)}
                  >
                    <div className="text-muted-foreground">When</div>
                    <div className="font-semibold text-foreground">{dateLabel}</div>
                  </button>

                  <button
                    type="button"
                    className="w-full rounded-2xl border border-border bg-card p-4 flex items-center justify-between"
                    onClick={() => setMobileGuestsOpen(true)}
                  >
                    <div className="text-muted-foreground">Who</div>
                    <div className="font-semibold text-foreground">{guestsLabel}</div>
                  </button>
                </div>
              </div>

              {/* Bottom actions */}
              <div className="border-t border-border p-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  className="text-sm text-muted-foreground underline"
                  onClick={() => {
                    setWhere("");
                    setDateRange(undefined);
                    setDateFlexDays(0);
                    setAdults(1);
                    setChildren(0);
                    setInfants(0);
                    setPets(0);
                  }}
                >
                  Clear all
                </button>
                <Button
                  type="button"
                  className="rounded-full px-6"
                  onClick={() => {
                    setMobileOpen(false);
                    goMobileSearch();
                  }}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>

              {/* Mobile date picker */}
              <Dialog open={mobileDateOpen} onOpenChange={setMobileDateOpen}>
                <DialogContent className="p-0 w-[100vw] max-w-[100vw] h-[100vh] max-h-[100vh] rounded-none">
                  <div className="h-full bg-background flex flex-col">
                    <div className="px-4 pt-4 pb-3 border-b border-border flex items-center justify-between">
                      <div className="font-semibold text-foreground">When</div>
                      <button
                        type="button"
                        className="h-10 w-10 rounded-full border border-border bg-background shadow-sm flex items-center justify-center"
                        onClick={() => setMobileDateOpen(false)}
                        aria-label="Close"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      <Calendar
                        mode="range"
                        numberOfMonths={1}
                        selected={dateRange}
                        onSelect={setDateRange}
                        disabled={{ before: new Date() }}
                        initialFocus
                      />
                    </div>
                    <div className="border-t border-border p-4 flex items-center justify-between">
                      <button
                        type="button"
                        className="text-sm text-muted-foreground underline"
                        onClick={() => {
                          setDateRange(undefined);
                          setDateFlexDays(0);
                        }}
                      >
                        Clear dates
                      </button>
                      <Button type="button" className="rounded-full" onClick={() => setMobileDateOpen(false)}>
                        Done
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Mobile guests picker */}
              <Dialog open={mobileGuestsOpen} onOpenChange={setMobileGuestsOpen}>
                <DialogContent className="p-0 w-[100vw] max-w-[100vw] h-[100vh] max-h-[100vh] rounded-none">
                  <div className="h-full bg-background flex flex-col">
                    <div className="px-4 pt-4 pb-3 border-b border-border flex items-center justify-between">
                      <div className="font-semibold text-foreground">Who</div>
                      <button
                        type="button"
                        className="h-10 w-10 rounded-full border border-border bg-background shadow-sm flex items-center justify-center"
                        onClick={() => setMobileGuestsOpen(false)}
                        aria-label="Close"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      {[
                        {
                          key: "adults",
                          label: t("heroSearch.adults"),
                          hint: t("heroSearch.ages13Plus"),
                          value: adults,
                          set: (v: number) => setAdults(Math.max(1, v)),
                          min: 1,
                        },
                        {
                          key: "children",
                          label: t("heroSearch.children"),
                          hint: t("heroSearch.ages2to12"),
                          value: children,
                          set: (v: number) => setChildren(clamp(v)),
                          min: 0,
                        },
                        {
                          key: "infants",
                          label: t("heroSearch.infants"),
                          hint: t("heroSearch.under2"),
                          value: infants,
                          set: (v: number) => setInfants(clamp(v)),
                          min: 0,
                        },
                        {
                          key: "pets",
                          label: t("heroSearch.pets"),
                          hint: t("heroSearch.bringingServiceAnimal"),
                          value: pets,
                          set: (v: number) => setPets(clamp(v)),
                          min: 0,
                        },
                      ].map((row) => (
                        <div key={row.key} className="flex items-center justify-between py-4 border-b border-border last:border-b-0">
                          <div>
                            <div className="font-semibold text-foreground">{row.label}</div>
                            <div className="text-xs text-muted-foreground">{row.hint}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="w-10 h-10 rounded-full border border-border flex items-center justify-center disabled:opacity-40"
                              onClick={() => row.set(row.value - 1)}
                              disabled={row.value <= row.min}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <div className="w-8 text-center font-medium">{row.value}</div>
                            <button
                              type="button"
                              className="w-10 h-10 rounded-full border border-border flex items-center justify-center"
                              onClick={() => row.set(row.value + 1)}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-border p-4 flex items-center justify-between">
                      <button
                        type="button"
                        className="text-sm text-muted-foreground underline"
                        onClick={() => {
                          setAdults(1);
                          setChildren(0);
                          setInfants(0);
                          setPets(0);
                        }}
                      >
                        Clear guests
                      </button>
                      <Button type="button" className="rounded-full" onClick={() => setMobileGuestsOpen(false)}>
                        Done
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Desktop search bar (existing popovers) */}
      <div className="hidden md:block">
      <div className="bg-background/95 backdrop-blur rounded-full shadow-search border border-border overflow-hidden">
        <div className="flex flex-col md:flex-row items-stretch">
          {/* Where */}
          <Popover open={openWhere} onOpenChange={(v) => {
            setOpenWhere(v);
            if (v) {
              setOpenWhen(false);
              setOpenWho(false);
            }
          }}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex-1 px-6 py-4 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="text-xs font-semibold text-foreground">{t("heroSearch.where")}</div>
                <div className="text-sm text-muted-foreground truncate">
                  {where.trim() ? where : t("heroSearch.wherePlaceholder")}
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              side="bottom"
              sideOffset={10}
              avoidCollisions={false}
              sticky="always"
              className="w-[360px] p-0 rounded-2xl overflow-hidden"
            >
              <div className="p-4">
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  {t("heroSearch.suggestedDestinations")}
                </div>
                <Command>
                  <CommandInput
                    placeholder={t("heroSearch.wherePlaceholder")}
                    value={where}
                    onValueChange={(v) => setWhere(v)}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {suggestionsLoading ? t("common.loading") : t("heroSearch.noDestinations")}
                    </CommandEmpty>
                    <CommandGroup>
                      {suggestions.map((loc) => (
                        <CommandItem
                          key={loc}
                          value={loc}
                          onSelect={() => {
                            setWhere(loc);
                            setOpenWhere(false);
                            if (loc === NEARBY_LABEL) {
                              goSearch();
                              return;
                            }
                            setOpenWhen(true);
                          }}
                          className="py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                              <MapPin className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="leading-tight">
                              <div className="font-medium text-foreground">{loc}</div>
                              <div className="text-xs text-muted-foreground">
                                {loc === NEARBY_LABEL ? "Use your current location" : t("heroSearch.destinationHint")}
                              </div>
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            </PopoverContent>
          </Popover>

          <div className="hidden md:block w-px bg-border" />

          {/* When */}
          <Popover open={openWhen} onOpenChange={(v) => {
            setOpenWhen(v);
            if (v) {
              setOpenWhere(false);
              setOpenWho(false);
            }
          }}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex-1 px-6 py-4 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="text-xs font-semibold text-foreground">{t("heroSearch.when")}</div>
                <div className="text-sm text-muted-foreground truncate flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  {dateLabel}
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="center"
              side="bottom"
              sideOffset={20}
              avoidCollisions={false}
              sticky="always"
              collisionPadding={20}
              className="w-[95vw] max-w-[760px] p-0 rounded-2xl overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <Tabs value={whenTab} onValueChange={(v) => setWhenTab(v as typeof whenTab)}>
                    <TabsList className="rounded-full">
                      <TabsTrigger value="dates" className="rounded-full">
                        {t("heroSearch.tabs.dates")}
                      </TabsTrigger>
                      <TabsTrigger value="months" className="rounded-full">
                        {t("heroSearch.tabs.months")}
                      </TabsTrigger>
                      <TabsTrigger value="flexible" className="rounded-full">
                        {t("heroSearch.tabs.flexible")}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-foreground underline shrink-0"
                    onClick={() => {
                      setDateRange(undefined);
                      setDateFlexDays(0);
                    }}
                  >
                    {t("heroSearch.clearDates")}
                  </button>
                </div>

                {/* Content */}
                {whenTab === "dates" ? (
                  <div>
                    <Calendar
                      mode="range"
                      numberOfMonths={2}
                      selected={dateRange}
                      onSelect={setDateRange}
                      disabled={{ before: new Date() }}
                      initialFocus
                    />

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setDateFlexDays(0)}
                          className={
                            "px-3 py-1.5 rounded-full border border-border text-sm " +
                            (dateFlexDays === 0 ? "bg-muted" : "hover:bg-muted")
                          }
                        >
                          {t("heroSearch.quick.exactDates")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDateFlexDays(1)}
                          className={
                            "px-3 py-1.5 rounded-full border border-border text-sm " +
                            (dateFlexDays === 1 ? "bg-muted" : "hover:bg-muted")
                          }
                        >
                          {t("heroSearch.quick.flexDays", { count: 1 })}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDateFlexDays(2)}
                          className={
                            "px-3 py-1.5 rounded-full border border-border text-sm " +
                            (dateFlexDays === 2 ? "bg-muted" : "hover:bg-muted")
                          }
                        >
                          {t("heroSearch.quick.flexDays", { count: 2 })}
                        </button>
                      </div>

                      <Button
                        type="button"
                        onClick={() => {
                          setOpenWhen(false);
                          setOpenWho(true);
                        }}
                      >
                        {t("heroSearch.next")}
                      </Button>
                    </div>
                  </div>
                ) : whenTab === "months" ? (
                  <div>
                    <div className="text-sm font-semibold text-foreground mb-2">Book monthly (28+ days)</div>
                    <p className="text-xs text-muted-foreground mb-4">Select a month for your extended stay</p>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {(() => {
                        const months = [];
                        const now = new Date();
                        for (let i = 0; i < 6; i++) {
                          const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
                          months.push(d);
                        }
                        return months.map((m) => {
                          const isSelected = dateRange?.from?.getMonth() === m.getMonth() && dateRange?.from?.getFullYear() === m.getFullYear();
                          return (
                            <button
                              key={m.toISOString()}
                              type="button"
                              onClick={() => setDateRange(monthRange(m))}
                              className={`px-3 py-3 rounded-xl border text-sm font-medium transition ${
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "border-border hover:bg-muted"
                              }`}
                            >
                              {m.toLocaleDateString(i18n.language, { month: "short", year: "numeric" })}
                            </button>
                          );
                        });
                      })()}
                    </div>
                    {dateRange?.from && dateRange?.to && (
                      <div className="text-sm text-muted-foreground mb-3">
                        Selected: {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
                      </div>
                    )}
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        onClick={() => {
                          setOpenWhen(false);
                          setOpenWho(true);
                        }}
                      >
                        {t("heroSearch.next")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm font-semibold text-foreground mb-3">{t("heroSearch.flexibleTitle")}</div>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setFlexibleDays(n)}
                          className="px-4 py-2 rounded-full border border-border text-sm hover:bg-muted"
                        >
                          {t("heroSearch.flexibleDays", { count: n })}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button
                        type="button"
                        onClick={() => {
                          setOpenWhen(false);
                          setOpenWho(true);
                        }}
                      >
                        {t("heroSearch.next")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <div className="hidden md:block w-px bg-border" />

          {/* Who */}
          <Popover open={openWho} onOpenChange={(v) => {
            setOpenWho(v);
            if (v) {
              setOpenWhere(false);
              setOpenWhen(false);
            }
          }}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex-1 px-6 py-4 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="text-xs font-semibold text-foreground">{t("heroSearch.who")}</div>
                <div className="text-sm text-muted-foreground truncate flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {guestsLabel}
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              side="bottom"
              sideOffset={10}
              avoidCollisions={false}
              sticky="always"
              className="w-[420px] p-0 rounded-2xl overflow-hidden"
            >
              <div className="p-4">
                <div className="space-y-4">
                  {[{
                    key: "adults",
                    label: t("heroSearch.adults"),
                    hint: t("heroSearch.ages13Plus"),
                    value: adults,
                    set: (v: number) => setAdults(Math.max(1, v)),
                    min: 1,
                  }, {
                    key: "children",
                    label: t("heroSearch.children"),
                    hint: t("heroSearch.ages2to12"),
                    value: children,
                    set: (v: number) => setChildren(clamp(v)),
                    min: 0,
                  }, {
                    key: "infants",
                    label: t("heroSearch.infants"),
                    hint: t("heroSearch.under2"),
                    value: infants,
                    set: (v: number) => setInfants(clamp(v)),
                    min: 0,
                  }, {
                    key: "pets",
                    label: t("heroSearch.pets"),
                    hint: t("heroSearch.bringingServiceAnimal"),
                    value: pets,
                    set: (v: number) => setPets(clamp(v)),
                    min: 0,
                  }].map((row) => (
                    <div key={row.key} className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-foreground">{row.label}</div>
                        <div className="text-xs text-muted-foreground">{row.hint}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="w-9 h-9 rounded-full border border-border flex items-center justify-center disabled:opacity-40"
                          onClick={() => row.set(row.value - 1)}
                          disabled={row.value <= row.min}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <div className="w-6 text-center font-medium">{row.value}</div>
                        <button
                          type="button"
                          className="w-9 h-9 rounded-full border border-border flex items-center justify-center"
                          onClick={() => row.set(row.value + 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-foreground underline"
                    onClick={() => {
                      setAdults(1);
                      setChildren(0);
                      setInfants(0);
                      setPets(0);
                    }}
                  >
                    {t("heroSearch.clear")}
                  </button>
                  <Button
                    type="button"
                    className="rounded-full px-6"
                    onClick={() => {
                      closeAll();
                      goSearch();
                    }}
                  >
                    {t("common.search")}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Search icon button (desktop) */}
          <div className="hidden md:flex items-center justify-center px-3">
            <Button
              variant="search"
              size="icon-lg"
              className="shrink-0"
              type="button"
              onClick={() => {
                closeAll();
                goSearch();
              }}
              aria-label={t("common.search")}
            >
              <Search className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
      </div>

      {/* Mobile search button removed (replaced by modal) */}
    </div>
  );
};

export default HeroSearch;
