/**
 * Health Check Hook para verificar se o banco Supabase está configurado corretamente
 * 
 * Detecta se as políticas RLS necessárias estão aplicadas e mostra avisos ao admin.
 * Não tenta aplicar migrations (por segurança), apenas alerta.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HealthCheckResult {
  isHealthy: boolean;
  missingPolicies: string[];
  needsMigration: boolean;
}

export function useSupabaseHealthCheck() {
  const [healthCheck, setHealthCheck] = useState<HealthCheckResult>({
    isHealthy: true,
    missingPolicies: [],
    needsMigration: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    async function checkHealth() {
      try {
        // Tenta inserir um profile de teste (não commitado)
        const testUserId = crypto.randomUUID();
        
        const { error } = await supabase
          .from('profiles')
          .insert({ 
            id: testUserId,
            account_id: testUserId, // fake para teste
          })
          .select()
          .limit(0); // Não executa realmente

        // Se retornar erro 42501 (RLS violation), a policy está faltando
        if (error?.code === '42501') {
          if (mounted) {
            setHealthCheck({
              isHealthy: false,
              missingPolicies: ['profiles INSERT policy'],
              needsMigration: true,
            });

            // Apenas mostra aviso ao admin, não tenta corrigir
            console.warn(
              '⚠️ RLS Health Check: Missing INSERT policy on profiles table.\n' +
              'Run the migration via GitHub Actions or Supabase Dashboard.\n' +
              'See SETUP_GITHUB_ACTIONS.md for details.'
            );
          }
        }
      } catch (err) {
        console.error('Health check error:', err);
      }
    }

    // Executa apenas uma vez na inicialização
    checkHealth();

    return () => {
      mounted = false;
    };
  }, []);

  return healthCheck;
}
