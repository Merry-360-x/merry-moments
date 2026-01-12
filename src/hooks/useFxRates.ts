import { useEffect, useState } from "react";
import { getUsdRates, type FxRates } from "@/lib/fx";

export function useFxRates() {
  const [rates, setRates] = useState<FxRates | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const r = await getUsdRates();
      if (!alive) return;
      setRates(r);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { usdRates: rates, fxLoading: loading };
}

