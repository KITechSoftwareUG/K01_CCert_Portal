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

        if (savedPos) {
            const targetPos = parseInt(savedPos, 10);
            let attempts = 0;
            const maxAttempts = 5;

            const attemptScroll = () => {
                if (!container) return;
                container.scrollTo({ top: targetPos, behavior: 'auto' });

                // If we haven't reached the target pos (and the container might still be growing)
                // we try again in a bit.
                if (Math.abs(container.scrollTop - targetPos) > 5 && attempts < maxAttempts) {
                    attempts++;
                    setTimeout(attemptScroll, 150); // Give it time between attempts
                }
            };

            // Initial delay to let the initial render finish
            const timeoutId = setTimeout(attemptScroll, 50);
            return () => clearTimeout(timeoutId);
        } else {
            // If NO saved position, we MUST reset to top.
            // Otherwise a shared container stays at the previous page's position.
            container.scrollTo({ top: 0, behavior: 'auto' });
        }
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
