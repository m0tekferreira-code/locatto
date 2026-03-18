import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const useAccountId = () => {
  const { user } = useAuth();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryAttempted, setRetryAttempted] = useState(false);

  useEffect(() => {
    const fetchAccountId = async () => {
      if (!user) {
        setAccountId(null);
        setLoading(false);
        return;
      }

      try {
        // Priority: use account_id from profile (source of truth for multi-tenant)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, account_id')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile account_id:', profileError);
        }

        if (profile?.account_id) {
          setAccountId(profile.account_id);
          setLoading(false);
          return;
        }

        // Fallback: check if user owns an account
        const { data: ownedAccount, error: ownerError } = await supabase
          .from('accounts')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (ownerError && ownerError.code !== 'PGRST116') {
          console.error('Error fetching owned account:', ownerError);
        }

        if (ownedAccount?.id) {
          // Try to sync profile.account_id once (avoid infinite retry loop)
          if (!retryAttempted && !profile?.account_id) {
            try {
              const { error: upsertError } = await supabase.from("profiles").upsert({ 
                id: user.id, 
                account_id: ownedAccount.id 
              }, { onConflict: 'id' });
              
              if (upsertError) {
                console.warn('Profile sync failed (RLS policy may be missing):', upsertError.message);
              }
            } catch (err) {
              console.warn('Profile sync attempt failed:', err);
            } finally {
              setRetryAttempted(true);
            }
          }
          setAccountId(ownedAccount.id);
        } else {
          setAccountId(null);
        }
      } catch (error) {
        console.error('Unexpected error fetching account_id:', error);
        setAccountId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAccountId();
  }, [user, retryAttempted]);

  return { accountId, loading };
};
