import { useEffect, useState } from "react";
import { getUsdRates, type FxRates } from "@/lib/fx";

export function useFxRates() {
  const [rates, setRates] = useState<FxRates | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get fixed rates synchronously
    getUsdRates().then(r => setRates(r));
  }, []);

  return { usdRates: rates, fxLoading: loading };
}

