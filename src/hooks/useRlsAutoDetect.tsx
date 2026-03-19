/**
 * Auto-detect RLS issues e exibe notificação para admin aplicar fix
 * 
 * Hook que detecta automaticamente erros 403 relacionados a RLS
 * e sugere ao admin navegar para /admin/rls-fix para corrigir
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';

export function useRlsAutoDetect() {
  const [hasRlsIssue, setHasRlsIssue] = useState(false);
  const [hasShownNotification, setHasShownNotification] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user || hasShownNotification) return;

    let mounted = true;

    async function detectRlsIssues() {
      try {
        // Diagnóstico robusto: conta dona existe mas função de derivação não retorna conta
        const { data: ownedAccount } = await supabase
          .from('accounts')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (!ownedAccount || !mounted) {
          return;
        }

        const { data: derivedAccountId, error: deriveError } = await supabase.rpc(
          'get_user_account_id',
          { _user_id: user.id }
        );

        if ((!derivedAccountId || deriveError) && mounted) {
          setHasRlsIssue(true);

          // Mostrar apenas aviso; não redirecionar automaticamente
          setHasShownNotification(true);
          toast({
            title: "⚠️ Problema de configuração detectado",
            description: "Conta não vinculada corretamente. Acesse /admin/rls-fix.",
            duration: 8000,
          });
        }
      } catch (err) {
        console.error('Error detecting RLS issues:', err);
      }
    }

    // Executar verificação após 2 segundos (dar tempo do app carregar)
    const timer = setTimeout(() => {
      detectRlsIssues();
    }, 2000);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [user, hasShownNotification, toast]);

  return { hasRlsIssue };
}
