// Visitor Analytics Tracking Script
// Include this on all pages to track visitors

(function() {
    'use strict';
    
    // Wrap everything in try-catch to prevent any errors from breaking the page
    try {
        const SUPABASE_URL = 'https://ujludleswiuqlvosbpyg.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqbHVkbGVzd2l1cWx2b3NicHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwMTY0ODgsImV4cCI6MjA2MDU5MjQ4OH0.A0NCJYJnKMwT_GRyXrZplb1q_shvMHnNeVNsh9hcPrQ';
        
        // Don't track admin pages or if DNT is enabled
        if (window.location.pathname.includes('admin') || navigator.doNotTrack === '1') {
            return;
        }
        
        let visitId = null;
        let startTime = Date.now();
        let maxScrollDepth = 0;
    
    // Generate or retrieve session ID
    function getSessionId() {
        let sessionId = sessionStorage.getItem('rws_session_id');
        if (!sessionId) {
            sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            sessionStorage.setItem('rws_session_id', sessionId);
        }
        return sessionId;
    }
    
    // Generate a simple browser fingerprint
    function getFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('fingerprint', 2, 2);
        
        const data = [
            navigator.userAgent,
            navigator.language,
            screen.colorDepth,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            !!window.sessionStorage,
            !!window.localStorage,
            canvas.toDataURL()
        ].join('|');
        
        // Simple hash
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'fp_' + Math.abs(hash).toString(36);
    }
    
    // Parse user agent for device/browser info
    function parseUserAgent() {
        const ua = navigator.userAgent;
        let device = 'desktop';
        let browser = 'Unknown';
        let browserVersion = '';
        let os = 'Unknown';
        let osVersion = '';
        
        // Device type
        if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
            device = /iPad|Tablet/i.test(ua) ? 'tablet' : 'mobile';
        }
        
        // Browser detection
        if (ua.includes('Firefox/')) {
            browser = 'Firefox';
            browserVersion = ua.match(/Firefox\/(\d+)/)?.[1] || '';
        } else if (ua.includes('Edg/')) {
            browser = 'Edge';
            browserVersion = ua.match(/Edg\/(\d+)/)?.[1] || '';
        } else if (ua.includes('Chrome/')) {
            browser = 'Chrome';
            browserVersion = ua.match(/Chrome\/(\d+)/)?.[1] || '';
        } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
            browser = 'Safari';
            browserVersion = ua.match(/Version\/(\d+)/)?.[1] || '';
        } else if (ua.includes('MSIE') || ua.includes('Trident/')) {
            browser = 'Internet Explorer';
            browserVersion = ua.match(/(?:MSIE |rv:)(\d+)/)?.[1] || '';
        }
        
        // OS detection
        if (ua.includes('Windows NT')) {
            os = 'Windows';
            const ntVersion = ua.match(/Windows NT (\d+\.\d+)/)?.[1];
            const versions = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' };
            osVersion = versions[ntVersion] || ntVersion || '';
        } else if (ua.includes('Mac OS X')) {
            os = 'macOS';
            osVersion = ua.match(/Mac OS X (\d+[._]\d+)/)?.[1]?.replace('_', '.') || '';
        } else if (ua.includes('Linux')) {
            os = 'Linux';
        } else if (ua.includes('Android')) {
            os = 'Android';
            osVersion = ua.match(/Android (\d+)/)?.[1] || '';
        } else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
            os = 'iOS';
            osVersion = ua.match(/OS (\d+)/)?.[1] || '';
        }
        
        return { device, browser, browserVersion, os, osVersion };
    }
    
    // Get UTM parameters
    function getUTMParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            utm_source: params.get('utm_source'),
            utm_medium: params.get('utm_medium'),
            utm_campaign: params.get('utm_campaign'),
            utm_term: params.get('utm_term'),
            utm_content: params.get('utm_content')
        };
    }
    
    // Track scroll depth
    function trackScrollDepth() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrollPercent = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0;
        maxScrollDepth = Math.max(maxScrollDepth, scrollPercent);
    }
    
    // Send visit data to Supabase
    async function recordVisit() {
        const sessionId = getSessionId();
        const fingerprint = getFingerprint();
        const deviceInfo = parseUserAgent();
        const utmParams = getUTMParams();
        
        const visitData = {
            p_session_id: sessionId,
            p_page_url: window.location.pathname + window.location.search,
            p_page_title: document.title,
            p_referrer: document.referrer || null,
            p_user_agent: navigator.userAgent,
            p_device_type: deviceInfo.device,
            p_browser: deviceInfo.browser,
            p_browser_version: deviceInfo.browserVersion,
            p_os: deviceInfo.os,
            p_os_version: deviceInfo.osVersion,
            p_screen_width: screen.width,
            p_screen_height: screen.height,
            p_viewport_width: window.innerWidth,
            p_viewport_height: window.innerHeight,
            p_utm_source: utmParams.utm_source,
            p_utm_medium: utmParams.utm_medium,
            p_utm_campaign: utmParams.utm_campaign,
            p_utm_term: utmParams.utm_term,
            p_utm_content: utmParams.utm_content,
            p_fingerprint: fingerprint,
            p_metadata: JSON.stringify({ fingerprint: fingerprint })
        };
        
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/record_page_visit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify(visitData)
            });
            
            if (response.ok) {
                visitId = await response.json();
                // Fetch geolocation data
                fetchGeolocation();
            }
        } catch (error) {
            console.debug('Analytics tracking error:', error);
        }
    }
    
    // Fetch geolocation from IP
    async function fetchGeolocation() {
        if (!visitId) return;
        
        try {
            // Using ipapi.co (HTTPS, 30k requests/month free)
            const response = await fetch('https://ipapi.co/json/');
            
            if (response.ok) {
                const data = await response.json();
                if (!data.error) {
                    await updateVisitLocation({
                        query: data.ip,
                        country: data.country_name,
                        countryCode: data.country_code,
                        regionName: data.region,
                        city: data.city,
                        zip: data.postal,
                        lat: data.latitude,
                        lon: data.longitude,
                        timezone: data.timezone,
                        isp: data.org
                    });
                }
            }
        } catch (error) {
            // Silently fail - geolocation is optional
            console.debug('Geolocation fetch failed:', error);
        }
    }
    
    // Update visit with location data
    async function updateVisitLocation(geoData) {
        if (!visitId) return;
        
        try {
            await fetch(`${SUPABASE_URL}/rest/v1/rpc/update_visit_location`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    p_visit_id: visitId,
                    p_ip_address: geoData.query || '',
                    p_country: geoData.country || '',
                    p_country_code: geoData.countryCode || '',
                    p_region: geoData.regionName || '',
                    p_city: geoData.city || '',
                    p_postal_code: geoData.zip || '',
                    p_latitude: geoData.lat || null,
                    p_longitude: geoData.lon || null,
                    p_timezone: geoData.timezone || '',
                    p_isp: geoData.isp || ''
                })
            });
        } catch (error) {
            console.debug('Location update error:', error);
        }
    }
    
    // Update time on page and scroll depth when leaving
    async function updateEngagement() {
        if (!visitId) return;
        
        const timeOnPage = Math.round((Date.now() - startTime) / 1000);
        
        try {
            await fetch(`${SUPABASE_URL}/rest/v1/page_visits?id=eq.${visitId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    time_on_page: timeOnPage,
                    scroll_depth: maxScrollDepth,
                    left_at: new Date().toISOString()
                })
            });
        } catch (error) {
            console.debug('Engagement update error:', error);
        }
    }
    
    // Track specific events
    window.rwsTrackEvent = function(eventType, eventCategory, eventLabel, eventValue, metadata = {}) {
        if (!visitId) return;
        
        const sessionId = getSessionId();
        
        fetch(`${SUPABASE_URL}/rest/v1/page_events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                session_id: sessionId,
                visit_id: visitId,
                event_type: eventType,
                event_category: eventCategory,
                event_label: eventLabel,
                event_value: eventValue,
                metadata: metadata
            })
        }).catch(() => {});
    };
    
    // Initialize tracking
    function init() {
        // Record the visit
        recordVisit();
        
        // Track scroll depth
        window.addEventListener('scroll', trackScrollDepth, { passive: true });
        
        // Update engagement on page unload
        window.addEventListener('beforeunload', updateEngagement);
        window.addEventListener('pagehide', updateEngagement);
        
        // Track visibility changes
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'hidden') {
                updateEngagement();
            }
        });
        
        // Track form interactions
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('focus', function(e) {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    window.rwsTrackEvent('form_interaction', 'form', form.id || 'unknown', e.target.name);
                }
            }, true);
            
            form.addEventListener('submit', function() {
                window.rwsTrackEvent('form_submit', 'form', form.id || 'unknown', 'submitted');
            });
        });
        
        // Track outbound links
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (link && link.hostname !== window.location.hostname) {
                window.rwsTrackEvent('outbound_click', 'link', link.href, link.textContent.trim().substring(0, 50));
            }
        });
        
        // Track CTA button clicks
        document.querySelectorAll('.hero-cta, .cta-button, [data-track]').forEach(el => {
            el.addEventListener('click', function() {
                window.rwsTrackEvent('cta_click', 'button', el.dataset.track || el.textContent.trim().substring(0, 50), window.location.pathname);
            });
        });
    }
    
    // Start tracking when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    } catch (e) {
        // Silently fail - analytics should never break the page
        console.debug('Analytics init error:', e);
    }
})();
