import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface LicenseStatus {
  valid: boolean;
  expires_at: string | null;
  loading: boolean;
}

const CACHE_KEY = 'license_check';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export const useLicenseCheck = () => {
  const [status, setStatus] = useState<LicenseStatus>({
    valid: true,
    expires_at: null,
    loading: true,
  });
  const navigate = useNavigate();

  const checkLicense = async (skipCache = false) => {
    try {
      // Check cache first
      if (!skipCache) {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setStatus({ ...data, loading: false });
            if (!data.valid) {
              navigate('/checkout');
            }
            return;
          }
        }
      }

      // Get current session - use getUser to force token refresh
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus({ valid: false, expires_at: null, loading: false });
        return;
      }

      // Refresh session to ensure valid token
      const { data: { session: freshSession } } = await supabase.auth.refreshSession();
      const activeSession = freshSession || session;

      // Call license verification edge function
      const { data, error } = await supabase.functions.invoke('license-verify', {
        headers: {
          Authorization: `Bearer ${activeSession.access_token}`
        }
      });

      if (error) {
        console.error('License check error:', error);
        // Don't redirect on transient auth errors - default to valid
        setStatus({ valid: true, expires_at: null, loading: false });
        return;
      }

      const licenseData = { valid: data.valid, expires_at: data.expires_at };
      
      // Cache the result
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        data: licenseData,
        timestamp: Date.now()
      }));

      setStatus({ ...licenseData, loading: false });

      if (!data.valid) {
        navigate('/checkout');
      }
    } catch (error) {
      console.error('License check failed:', error);
      setStatus({ valid: false, expires_at: null, loading: false });
      navigate('/checkout');
    }
  };

  useEffect(() => {
    checkLicense();

    // Check every 10 minutes
    const interval = setInterval(() => checkLicense(true), CACHE_DURATION);

    return () => clearInterval(interval);
  }, []);

  return status;
};