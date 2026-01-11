import { Calendar as CalendarIcon, MapPin, Minus, Plus, Search, Users, X, Home, Map, ConciergeBell } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { DateRange } from "react-day-picker";

type DestinationSuggestion = {
  location: string;
};

const fetchDestinationSuggestions = async (search: string) => {
  let query = supabase
    .from("properties")
    .select("location")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(50);

  const trimmed = search.trim();
  if (trimmed) {
    query = query.ilike("location", `%${trimmed}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const unique = Array.from(
    new Set((data as DestinationSuggestion[] | null)?.map((d) => d.location).filter(Boolean) ?? [])
  );

  return unique.slice(0, 8);
};

const HeroSearch = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

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
  const [mobileTab, setMobileTab] = useState<"homes" | "experiences" | "services">("homes");
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
    queryKey: ["destinations", where],
    queryFn: () => fetchDestinationSuggestions(where),
    enabled: suggestionsEnabled,
  });

  const goSearch = () => {
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
                    <TabsTrigger value="homes" className="gap-2">
                      <Home className="w-4 h-4" /> Homes
                    </TabsTrigger>
                    <TabsTrigger value="experiences" className="gap-2">
                      <Map className="w-4 h-4" /> Experiences
                    </TabsTrigger>
                    <TabsTrigger value="services" className="gap-2">
                      <ConciergeBell className="w-4 h-4" /> Services
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
                          onClick={() => setWhere(loc)}
                          className="w-full flex items-center gap-3 rounded-2xl hover:bg-muted/40 p-2 text-left"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate">{loc}</div>
                            <div className="text-xs text-muted-foreground truncate">From published listings</div>
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
                    goSearch();
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
              sideOffset={10}
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
                              <div className="text-xs text-muted-foreground">{t("heroSearch.destinationHint")}</div>
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
              sideOffset={10}
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
                    <div className="text-sm font-semibold text-foreground mb-2">{t("heroSearch.monthsTitle")}</div>
                    <Calendar
                      mode="single"
                      numberOfMonths={2}
                      selected={dateRange?.from}
                      onSelect={(d) => {
                        if (!d) return;
                        setDateRange(monthRange(d));
                      }}
                      initialFocus
                    />
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
              sideOffset={10}
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
