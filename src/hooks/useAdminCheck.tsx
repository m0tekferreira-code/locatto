import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const useAdminCheck = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // 1) Super admin via RPC (fonte canônica)
        const { data: isSuperAdminRpc } = await supabase.rpc('is_super_admin', {
          _user_id: user.id,
        });

        if (isSuperAdminRpc) {
          setIsAdmin(true);
          return;
        }

        // 2) Admin/super_admin via tabela user_roles
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .in('role', ['admin', 'super_admin'])
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking admin status:', error);
        }

        if (data) {
          setIsAdmin(true);
          return;
        }

        // 3) Fallback: dono da conta também é admin funcional
        const { data: ownedAccount, error: ownerError } = await supabase
          .from('accounts')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (ownerError && ownerError.code !== 'PGRST116') {
          console.error('Error checking account owner admin fallback:', ownerError);
        }

        setIsAdmin(!!ownedAccount);
      } catch (error) {
        console.error('Unexpected error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [user]);

  return { isAdmin, loading };
};
