import { useEffect } from 'react';

export const useIOSFixes = () => {
  useEffect(() => {
    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // Fix viewport height issues - moved outside to fix scoping
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    if (isIOS) {
      // Prevent zoom on double tap
      let lastTouchEnd = 0;
      document.addEventListener('touchend', (event) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      }, false);

      setViewportHeight();
      window.addEventListener('resize', setViewportHeight);
      window.addEventListener('orientationchange', setViewportHeight);

      // Prevent elastic scroll
      document.body.addEventListener('touchmove', (event) => {
        if (event.target === document.body) {
          event.preventDefault();
        }
      }, { passive: false });

      // Fix input focus issues
      const inputs = document.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        input.addEventListener('focus', () => {
          // Add a small delay to allow keyboard to appear
          setTimeout(() => {
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        });
      });

      // Add iOS class to body for CSS targeting
      document.body.classList.add('ios');
    }

    // Cleanup
    return () => {
      if (isIOS) {
        window.removeEventListener('resize', setViewportHeight);
        window.removeEventListener('orientationchange', setViewportHeight);
      }
    };
  }, []);
};

export const isIOSDevice = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const isIPad = () => {
  return /iPad/.test(navigator.userAgent);
};

export const isIPhone = () => {
  return /iPhone/.test(navigator.userAgent);
};
