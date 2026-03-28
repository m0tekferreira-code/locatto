import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LicenseContextType {
  isValid: boolean;
  expiresAt: string | null;
  loading: boolean;
  canEdit: boolean;
  daysRemaining: number | null;
  isTrial: boolean;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

const CACHE_KEY = 'license_check';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export const LicenseProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<LicenseContextType>({
    isValid: true,
    expiresAt: null,
    loading: true,
    canEdit: true,
    daysRemaining: null,
    isTrial: false,
  });
  const isChecking = useRef(false);

  const checkLicense = async (skipCache = false, tokenOverride?: string) => {
    // Prevent concurrent calls that cause refresh loops
    if (isChecking.current) return;
    isChecking.current = true;

    try {
      // Check cache first
      if (!skipCache) {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setState({ ...data, loading: false });
            return;
          }
        }
      }

      // Resolve the access token to use.
      // When called from onAuthStateChange the fresh token is passed directly
      // (tokenOverride) so we avoid reading a stale value from the internal
      // session store while _recoverAndRefresh is still in progress.
      let accessToken = tokenOverride;

      if (!accessToken) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setState({
            isValid: false,
            expiresAt: null,
            loading: false,
            canEdit: false,
            daysRemaining: null,
            isTrial: false,
          });
          return;
        }

        // Skip function call if local token is already expired.
        const expiresAtMs = session.expires_at ? session.expires_at * 1000 : null;
        if (expiresAtMs && expiresAtMs <= Date.now()) {
          setState({
            isValid: true,
            expiresAt: null,
            loading: false,
            canEdit: true,
            daysRemaining: null,
            isTrial: false,
          });
          return;
        }

        accessToken = session.access_token;
      }

      // In local development we skip remote license verification to avoid
      // blocking login when Edge Functions are not deployed/configured yet.
      if (import.meta.env.DEV) {
        setState({
          isValid: true,
          expiresAt: null,
          loading: false,
          canEdit: true,
          daysRemaining: null,
          isTrial: false,
        });
        return;
      }

      // Always pass the token explicitly so we never depend on the client's
      // internal auth store, which may be stale during _recoverAndRefresh.
      const { data, error } = await supabase.functions.invoke('license-verify', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) {
        const status =
          typeof error === 'object' &&
          error !== null &&
          'context' in error &&
          typeof (error as { context?: unknown }).context === 'object' &&
          (error as { context?: { status?: number } }).context?.status;

        // Avoid noisy logs/loops when auth is briefly unavailable during refresh.
        if (status !== 401) {
          console.error('License check error:', error);
        }

        // Fail-safe: default to valid on transient errors
        setState({
          isValid: true,
          expiresAt: null,
          loading: false,
          canEdit: true,
          daysRemaining: null,
          isTrial: false,
        });
        return;
      }

      // Calculate days remaining
      let daysRemaining: number | null = null;
      let isTrial = false;
      
      if (data.expires_at) {
        const expiryDate = new Date(data.expires_at);
        const now = new Date();
        const diffTime = expiryDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (daysRemaining <= 14 && daysRemaining > 0) {
          isTrial = true;
        }
      }

      const licenseData = {
        isValid: data.valid,
        expiresAt: data.expires_at,
        canEdit: data.valid,
        daysRemaining,
        isTrial,
      };

      // Cache the result
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        data: licenseData,
        timestamp: Date.now()
      }));

      setState({ ...licenseData, loading: false });
    } catch (error) {
      console.error('License check failed:', error);
      // Fail-safe: default to valid on unexpected errors
      setState({
        isValid: true,
        expiresAt: null,
        loading: false,
        canEdit: true,
        daysRemaining: null,
        isTrial: false,
      });
    } finally {
      isChecking.current = false;
    }
  };

  useEffect(() => {
    // Listen for auth state changes.
    // The callback receives the fresh session directly from the auth machinery,
    // so we forward its access_token to avoid using a stale internal reference.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        sessionStorage.removeItem(CACHE_KEY);
        checkLicense(true, session.access_token);
      }
    });

    // Delay the initial check slightly so the Supabase client has time to
    // finish _recoverAndRefresh before we attempt to read the session.
    const initTimeout = setTimeout(() => checkLicense(), 1500);

    // Check every 10 minutes
    const interval = setInterval(() => checkLicense(true), CACHE_DURATION);

    return () => {
      clearTimeout(initTimeout);
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <LicenseContext.Provider value={state}>
      {children}
    </LicenseContext.Provider>
  );
};

export const useLicense = () => {
  const context = useContext(LicenseContext);
  if (context === undefined) {
    throw new Error("useLicense must be used within a LicenseProvider");
  }
  return context;
};
