import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Manages global UI scaling based on route context.
 * User application is scaled down to 90% for tighter information density.
 * Admin panel remains at 100% native size.
 */
const ScaleManager: React.FC = () => {
    const location = useLocation();

    useEffect(() => {
        // Apply scaling based on route prefix
        if (location.pathname.startsWith('/admin')) {
            // Admin Panel: Default 100% scaling (16px root font size)
            document.documentElement.style.fontSize = '16px';
        } else {
            // User App & Login: Scaled to 90% (~14.4px root font size)
            // This reduces the oversized feel of UI elements
            document.documentElement.style.fontSize = '90%';
        }

        // Cleanup function not strictly needed as we always set a value,
        // but restoring default on unmount is safe practice if component is removed.
        return () => {
            // document.documentElement.style.fontSize = '100%';
        };
    }, [location.pathname]);

    return null;
};

export default ScaleManager;
