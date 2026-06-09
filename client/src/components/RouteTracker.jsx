import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../utils/analytics';

/**
 * RouteTracker — fires a page_view event on every React Router navigation.
 * Also scrolls the window to the top on route change.
 */
export default function RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    trackPageView(location.pathname, document.title);
  }, [location]);

  return null;
}
