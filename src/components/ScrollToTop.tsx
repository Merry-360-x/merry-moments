import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    // Always start at top when navigating.
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);

  return null;
}

