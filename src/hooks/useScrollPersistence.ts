import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export const useScrollPersistence = (key?: string) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const location = useLocation();
    const persistenceKey = key || `scroll-pos-${location.pathname}`;
    const keyRef = useRef(persistenceKey);

    // Keep keyRef updated so scroll events always use the current path
    useEffect(() => {
        keyRef.current = persistenceKey;
    }, [persistenceKey]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Restore scroll position
        const savedPos = sessionStorage.getItem(persistenceKey);

        // Small timeout to ensure content has rendered
        const timeoutId = setTimeout(() => {
            if (savedPos) {
                container.scrollTo({ top: parseInt(savedPos, 10), behavior: 'auto' });
            } else {
                // If NO saved position, we MUST reset to top.
                // Otherwise a shared container stays at the previous page's position.
                container.scrollTo({ top: 0, behavior: 'auto' });
            }
        }, 10); // Shorter timeout for snappier feel

        return () => clearTimeout(timeoutId);
    }, [persistenceKey]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            // Always save to the latest keyRef value
            sessionStorage.setItem(keyRef.current, container.scrollTop.toString());
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, []); // Only register once per component mount

    return containerRef;
};
