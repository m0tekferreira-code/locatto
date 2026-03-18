import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface InvoiceCardProps {
  invoice: any;
  getStatusBadge: (status: string, dueDate: string) => JSX.Element;
}

export const InvoiceCard = ({ invoice, getStatusBadge }: InvoiceCardProps) => {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <p className="font-medium text-sm">
              {invoice.contracts?.tenant_name || "-"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {invoice.properties?.name || "-"}
            </p>
          </div>
          {getStatusBadge(invoice.status, invoice.due_date)}
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">Vencimento</p>
            <p className="font-medium">
              {format(new Date(invoice.due_date), "dd/MM/yyyy")}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Valor</p>
            <p className="font-medium text-primary">
              R$ {Number(invoice.total_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {invoice.properties?.owner_name && (
          <p className="text-xs text-muted-foreground">
            Proprietário: {invoice.properties.owner_name}
          </p>
        )}

        <Link to={`/faturas/${invoice.id}`} className="block">
          <Button variant="outline" size="sm" className="w-full">
            <Eye className="mr-2 h-3 w-3" />
            Ver Detalhes
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};
