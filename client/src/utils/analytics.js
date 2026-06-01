/**
 * Analytics utility — pushes custom events to GTM dataLayer.
 * GTM then routes them to GA4, Clarity, or any other configured tag.
 *
 * Usage:
 *   import { trackEvent, trackLogin } from '../utils/analytics';
 *   trackLogin('google', user.email);
 */

// Ensure dataLayer exists (GTM initializes it, but this is a safety net)
window.dataLayer = window.dataLayer || [];

/**
 * Push a custom event to GTM dataLayer.
 * @param {string} eventName - The event name (e.g. 'user_login')
 * @param {Object} params - Additional event parameters
 */
export function trackEvent(eventName, params = {}) {
  window.dataLayer.push({
    event: eventName,
    ...params,
  });
}

/**
 * Track virtual page views (for SPA route changes).
 * GA4 doesn't auto-track SPA navigations — we push them manually.
 */
export function trackPageView(pagePath, pageTitle) {
  trackEvent('page_view', {
    page_path: pagePath,
    page_title: pageTitle,
  });
}

// ── Specific Event Helpers ──────────────────────────────────────────

export function trackLogin(method, userId) {
  trackEvent('user_login', {
    method,
    user_id: userId,
  });
}

export function trackLogout() {
  trackEvent('user_logout');
}

export function trackItemReport(itemType, category) {
  trackEvent('item_reported', {
    item_type: itemType,   // 'lost' or 'found'
    category,              // e.g. 'electronics', 'documents'
  });
}

export function trackSearch(query, resultCount) {
  trackEvent('search', {
    search_term: query,
    result_count: resultCount,
  });
}

export function trackFilterChange(filterName, filterValue) {
  trackEvent('filter_change', {
    filter_name: filterName,
    filter_value: filterValue,
  });
}

export function trackItemView(itemId, itemType) {
  trackEvent('item_view', {
    item_id: itemId,
    item_type: itemType,
  });
}

export function trackClaimItem(itemId) {
  trackEvent('claim_item', {
    item_id: itemId,
  });
}
