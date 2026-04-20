import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const MIGRATION_CACHE_KEY = "auto_migration_applied";
const MIGRATION_VERSION = "20260409_webhook_configs";

/**
 * Hook que executa migrations pendentes automaticamente ao acessar o sistema.
 * Roda apenas uma vez por sessão/versão (controlado via localStorage).
 */
export function useAutoMigration() {
  const { user } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (!user || ran.current) return;

    const cachedVersion = localStorage.getItem(MIGRATION_CACHE_KEY);
    if (cachedVersion === MIGRATION_VERSION) return;

    ran.current = true;

    const runMigration = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const response = await supabase.functions.invoke("auto-migrate", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.error) {
          // Silently ignore CORS / network / deployment errors — non-blocking
          return;
        }

        console.log("Auto-migration result:", response.data);
        localStorage.setItem(MIGRATION_CACHE_KEY, MIGRATION_VERSION);
      } catch {
        // Silently ignore — auto-migration is best-effort
      }
    };

    runMigration();
  }, [user]);
}
