import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const useAccountId = () => {
  const { user } = useAuth();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
          .select('account_id')
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

        setAccountId(ownedAccount?.id || null);
      } catch (error) {
        console.error('Unexpected error fetching account_id:', error);
        setAccountId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAccountId();
  }, [user]);

  return { accountId, loading };
};
