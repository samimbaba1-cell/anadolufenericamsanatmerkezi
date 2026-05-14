"use client";
import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;

function GoogleAnalyticsContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_TRACKING_ID) return;

    // Load Google Analytics
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(...args) {
      window.dataLayer.push(args);
    }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', GA_TRACKING_ID, {
      page_title: document.title,
      page_location: window.location.href,
    });

    return () => {
      // Cleanup
      const scripts = document.querySelectorAll(`script[src*="googletagmanager.com"]`);
      scripts.forEach(script => script.remove());
    };
  }, []);

  useEffect(() => {
    if (!GA_TRACKING_ID || !window.gtag) return;

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    
    window.gtag('config', GA_TRACKING_ID, {
      page_path: url,
      page_title: document.title,
      page_location: window.location.href,
    });
  }, [pathname, searchParams]);

  // Track custom events
  const trackEvent = (action, category, label, value) => {
    if (!window.gtag) return;
    
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  };

  // Track e-commerce events
  const trackPurchase = (transactionId, value, currency = 'TRY', items = []) => {
    if (!window.gtag) return;
    
    window.gtag('event', 'purchase', {
      transaction_id: transactionId,
      value: value,
      currency: currency,
      items: items,
    });
  };

  const trackAddToCart = (itemId, itemName, category, quantity, price) => {
    if (!window.gtag) return;
    
    window.gtag('event', 'add_to_cart', {
      currency: 'TRY',
      value: price * quantity,
      items: [{
        item_id: itemId,
        item_name: itemName,
        category: category,
        quantity: quantity,
        price: price,
      }],
    });
  };

  const trackViewItem = (itemId, itemName, category, price) => {
    if (!window.gtag) return;
    
    window.gtag('event', 'view_item', {
      currency: 'TRY',
      value: price,
      items: [{
        item_id: itemId,
        item_name: itemName,
        category: category,
        price: price,
      }],
    });
  };

  const trackSearch = (searchTerm) => {
    if (!window.gtag) return;
    
    window.gtag('event', 'search', {
      search_term: searchTerm,
    });
  };

  // Expose tracking functions globally
  useEffect(() => {
    window.trackEvent = trackEvent;
    window.trackPurchase = trackPurchase;
    window.trackAddToCart = trackAddToCart;
    window.trackViewItem = trackViewItem;
    window.trackSearch = trackSearch;
  }, []);

  return null;
}

export default function GoogleAnalytics() {
  return (
    <Suspense fallback={null}>
      <GoogleAnalyticsContent />
    </Suspense>
  );
}

// Hook for easy tracking
export function useAnalytics() {
  const trackEvent = (action, category, label, value) => {
    if (typeof window !== 'undefined' && window.trackEvent) {
      window.trackEvent(action, category, label, value);
    }
  };

  const trackPurchase = (transactionId, value, currency = 'TRY', items = []) => {
    if (typeof window !== 'undefined' && window.trackPurchase) {
      window.trackPurchase(transactionId, value, currency, items);
    }
  };

  const trackAddToCart = (itemId, itemName, category, quantity, price) => {
    if (typeof window !== 'undefined' && window.trackAddToCart) {
      window.trackAddToCart(itemId, itemName, category, quantity, price);
    }
  };

  const trackViewItem = (itemId, itemName, category, price) => {
    if (typeof window !== 'undefined' && window.trackViewItem) {
      window.trackViewItem(itemId, itemName, category, price);
    }
  };

  const trackSearch = (searchTerm) => {
    if (typeof window !== 'undefined' && window.trackSearch) {
      window.trackSearch(searchTerm);
    }
  };

  return {
    trackEvent,
    trackPurchase,
    trackAddToCart,
    trackViewItem,
    trackSearch
  };
}

// Export individual tracking functions for direct import
export const trackAddToCart = (itemId, itemName, category, quantity, price) => {
  if (typeof window !== 'undefined' && window.trackAddToCart) {
    window.trackAddToCart(itemId, itemName, category, quantity, price);
  }
};

export const trackRemoveFromCart = (itemId, itemName, category, quantity, price) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'remove_from_cart', {
      currency: 'TRY',
      value: price * quantity,
      items: [{
        item_id: itemId,
        item_name: itemName,
        category: category,
        quantity: quantity,
        price: price,
      }],
    });
  }
};

export const trackSearch = (searchTerm) => {
  if (typeof window !== 'undefined' && window.trackSearch) {
    window.trackSearch(searchTerm);
  }
};

export const trackPurchase = (transactionId, value, currency = 'TRY', items = []) => {
  if (typeof window !== 'undefined' && window.trackPurchase) {
    window.trackPurchase(transactionId, value, currency, items);
  }
};