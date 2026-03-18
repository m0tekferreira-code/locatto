/**
 * Auto-detect RLS issues e exibe notificação para admin aplicar fix
 * 
 * Hook que detecta automaticamente erros 403 relacionados a RLS
 * e sugere ao admin navegar para /admin/rls-fix para corrigir
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';

export function useRlsAutoDetect() {
  const [hasRlsIssue, setHasRlsIssue] = useState(false);
  const [hasShownNotification, setHasShownNotification] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user || hasShownNotification) return;

    let mounted = true;

    async function detectRlsIssues() {
      try {
        // Tentar inserir um profile de teste para detectar erro 403
        const testUserId = crypto.randomUUID();
        
        const { error } = await supabase
          .from('profiles')
          .insert({ 
            id: testUserId,
            account_id: testUserId,
          })
          .select()
          .limit(0);

        // Se retornar erro 42501 (RLS violation), temos problema
        if (error?.code === '42501' && mounted) {
          setHasRlsIssue(true);
          
          // Verificar se é admin (role não existe na tabela, verificar pela existência de conta)
          const { data: ownedAccount } = await supabase
            .from('accounts')
            .select('id')
            .eq('owner_id', user.id)
            .maybeSingle();

          if (ownedAccount && mounted) {
            // Mostrar toast para admin com ação
            setHasShownNotification(true);
            
            toast({
              title: "⚠️ Problema de configuração detectado",
              description: "Políticas RLS precisam ser corrigidas.",
              duration: 10000,
            });
            
            // Navegar automaticamente após 2 segundos
            setTimeout(() => {
              if (window.location.pathname !== '/admin/rls-fix') {
                navigate('/admin/rls-fix');
              }
            }, 2000);
          } else {
            // Para usuários normais, apenas log no console
            console.warn(
              '⚠️ RLS issue detected. Contact your administrator to run the RLS fix.'
            );
          }
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
  }, [user, hasShownNotification, toast, navigate]);

  return { hasRlsIssue };
}
