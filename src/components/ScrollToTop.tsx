import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    // Preserve scroll for in-page query updates, but reset on actual route changes.
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return null;
}

