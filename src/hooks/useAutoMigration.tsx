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

        const { data, error } = await supabase.functions.invoke("auto-migrate", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) {
          console.warn("Auto-migration call failed:", error.message);
          return;
        }

        console.log("Auto-migration result:", data);
        localStorage.setItem(MIGRATION_CACHE_KEY, MIGRATION_VERSION);
      } catch (err) {
        console.warn("Auto-migration error (non-blocking):", err);
      }
    };

    runMigration();
  }, [user]);
}
