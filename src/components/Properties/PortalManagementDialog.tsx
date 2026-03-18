import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Loader2 } from "lucide-react";

interface PortalManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: {
    id: string;
    name: string;
    publish_to_portals?: boolean;
    portal_status?: string;
    transaction_type?: string;
  };
}

export const PortalManagementDialog = ({ open, onOpenChange, property }: PortalManagementDialogProps) => {
  const queryClient = useQueryClient();
  const [publishEnabled, setPublishEnabled] = useState(property.publish_to_portals ?? false);
  const [transactionType, setTransactionType] = useState(property.transaction_type ?? "rent");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("properties")
        .update({
          publish_to_portals: publishEnabled,
          transaction_type: transactionType,
          portal_status: publishEnabled ? "published" : "draft",
        })
        .eq("id", property.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast.success(publishEnabled ? "Imóvel marcado para publicação nos portais!" : "Imóvel removido dos portais.");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Anúncios - {property.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Publish Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Publicar nos Portais</Label>
              <p className="text-xs text-muted-foreground">ZAP Imóveis, Viva Real, OLX</p>
            </div>
            <Switch checked={publishEnabled} onCheckedChange={setPublishEnabled} />
          </div>

          {/* Transaction Type */}
          <div className="space-y-2">
            <Label className="text-sm">Tipo de Transação</Label>
            <Select value={transactionType} onValueChange={setTransactionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rent">Aluguel</SelectItem>
                <SelectItem value="sale">Venda</SelectItem>
                <SelectItem value="both">Venda e Aluguel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge variant={publishEnabled ? "default" : "secondary"}>
              {publishEnabled ? "Publicado" : "Rascunho"}
            </Badge>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
