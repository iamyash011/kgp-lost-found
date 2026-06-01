import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../utils/analytics';

/**
 * RouteTracker — fires a page_view event on every React Router navigation.
 * 
 * GA4 only auto-tracks full page loads. In a Single Page App (SPA),
 * route changes don't trigger full loads, so we manually push page_view
 * events to the dataLayer for GTM/GA4 to pick up.
 *
 * This component renders nothing — it's purely a side-effect component.
 */
export default function RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location]);

  return null;
}
