import { useState } from "react";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccountId } from "@/hooks/useAccountId";
import { Copy, ExternalLink, Globe, CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const PORTALS = [
  { id: "grupozap", name: "ZAP Imóveis", description: "Maior portal imobiliário do Brasil", color: "bg-orange-500" },
  { id: "vivareal", name: "Viva Real", description: "Portal com grande alcance nacional", color: "bg-purple-600" },
  { id: "olx", name: "OLX", description: "Marketplace com seção imobiliária", color: "bg-blue-600" },
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const PortalSettings = () => {
  const { accountId, loading: accountLoading } = useAccountId();
  const queryClient = useQueryClient();
  const [copiedFeed, setCopiedFeed] = useState(false);

  const feedUrl = accountId
    ? `${SUPABASE_URL}/functions/v1/generate-portal-feed?account_id=${accountId}`
    : "";

  const { data: integrations, isLoading } = useQuery({
    queryKey: ["portal-integrations", accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_integrations")
        .select("*")
        .eq("account_id", accountId!);
      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ provider, isActive, adLimit }: { provider: string; isActive: boolean; adLimit?: number }) => {
      const existing = integrations?.find((i: any) => i.provider === provider);
      if (existing) {
        const { error } = await supabase
          .from("portal_integrations")
          .update({ is_active: isActive, ad_limit: adLimit ?? existing.ad_limit })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("portal_integrations")
          .insert({
            account_id: accountId!,
            provider,
            is_active: isActive,
            ad_limit: adLimit ?? 0,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-integrations"] });
      toast.success("Configuração salva!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const copyFeedUrl = () => {
    navigator.clipboard.writeText(feedUrl);
    setCopiedFeed(true);
    toast.success("URL copiada!");
    setTimeout(() => setCopiedFeed(false), 2000);
  };

  const getPortalIntegration = (providerId: string) =>
    integrations?.find((i: any) => i.provider === providerId);

  if (accountLoading || isLoading) {
    return (
      <AppLayout title="Portais Imobiliários">
        <div className="flex items-center justify-center h-64">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Portais Imobiliários">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link to="/" className="hover:text-foreground">Locatto</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Portais Imobiliários</span>
      </div>

      <div className="space-y-6">
        {/* Feed URL Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              URL do Feed XML
            </CardTitle>
            <CardDescription>
              Copie esta URL e cadastre nos portais imobiliários para publicar seus imóveis automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input value={feedUrl} readOnly className="font-mono text-xs" />
              <Button onClick={copyFeedUrl} variant="outline" size="icon">
                {copiedFeed ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Os portais acessam este link periodicamente para atualizar seus anúncios.
            </p>
          </CardContent>
        </Card>

        {/* Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PORTALS.map((portal) => {
            const integration = getPortalIntegration(portal.id);
            const isActive = integration?.is_active ?? false;

            return (
              <Card key={portal.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg ${portal.color} flex items-center justify-center`}>
                        <Globe className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{portal.name}</CardTitle>
                        <CardDescription className="text-xs">{portal.description}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Ativo</Label>
                    <Switch
                      checked={isActive}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ provider: portal.id, isActive: checked })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Limite de anúncios</Label>
                    <Input
                      type="number"
                      defaultValue={integration?.ad_limit ?? 0}
                      min={0}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        toggleMutation.mutate({ provider: portal.id, isActive, adLimit: val });
                      }}
                      className="h-8"
                    />
                  </div>
                  <Badge variant={isActive ? "default" : "secondary"}>
                    {isActive ? "Publicando" : "Desativado"}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Como cadastrar nos portais</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Copie a URL do Feed XML acima</li>
              <li>Acesse o painel do portal desejado (ZAP, Viva Real ou OLX)</li>
              <li>Vá em <strong>Integrações</strong> ou <strong>Feed XML</strong></li>
              <li>Cole a URL no campo de feed</li>
              <li>Aguarde a validação do portal (pode levar até 24h)</li>
              <li>Marque os imóveis que deseja publicar na página de <Link to="/imoveis" className="text-primary underline">Imóveis</Link></li>
            </ol>
            <div className="mt-4 flex gap-2">
              <a href="https://developers.grupozap.com/feeds/vrsync" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="mr-2 h-3 w-3" />
                  Documentação VrSync
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default PortalSettings;
