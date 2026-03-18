import { Card, CardContent } from "@/components/ui/card";
import { FileText, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface FinancialSummaryCardProps {
  openInvoices: number;
  overdueInvoices: number;
  totalBilled: number;
}

export const FinancialSummaryCard = ({ 
  openInvoices, 
  overdueInvoices, 
  totalBilled 
}: FinancialSummaryCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className="flex flex-col justify-between">
      <CardContent className="p-5 flex flex-col justify-between h-full">
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-semibold text-foreground">Financeiro</h3>
          <div className="rounded-lg bg-muted p-2 text-info">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        <div className="space-y-3 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Cobranças em aberto</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground">{openInvoices}</p>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Cobranças em atraso</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold text-destructive">{overdueInvoices}</p>

          <div>
            <span className="text-sm text-muted-foreground">Valor faturado</span>
            <p className="text-xl font-bold text-info">
              R$ {totalBilled.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <Button 
          variant="link" 
          className="text-info p-0 h-auto mt-3 self-center text-xs"
          onClick={() => navigate("/faturas")}
        >
          Ver cobranças
          <ChevronRight className="ml-0.5 h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
};
