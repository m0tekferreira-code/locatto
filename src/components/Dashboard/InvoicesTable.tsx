import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { InvoiceCard } from "@/components/Responsive/InvoiceCard";

interface Invoice {
  id: string;
  contract?: { tenant_name: string };
  property?: { name: string };
  due_date: string;
  total_amount: number;
  status: string;
}

interface InvoicesTableProps {
  invoices: Invoice[];
}

const getStatusBadge = (status: string) => {
  const variants = {
    pending: { variant: "secondary" as const, label: "Pendente" },
    paid: { variant: "default" as const, label: "Pago" },
    overdue: { variant: "destructive" as const, label: "Vencido" },
  };

  const config = variants[status as keyof typeof variants] || variants.pending;
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export const InvoicesTable = ({ invoices }: InvoicesTableProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  return (
    <Card>
      <CardHeader className="border-b">
        <Tabs defaultValue="cobrancas" className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-md text-xs md:text-sm">
            <TabsTrigger value="cobrancas">Cobranças</TabsTrigger>
            <TabsTrigger value="contratos">Contratos</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="propostas">Propostas</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="p-0">
        {isMobile ? (
          <div className="p-3 space-y-3">
            {invoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma fatura encontrada
              </div>
            ) : (
              invoices.map((invoice) => (
                <InvoiceCard 
                  key={invoice.id} 
                  invoice={{ ...invoice, contracts: invoice.contract, properties: invoice.property }} 
                  getStatusBadge={(status, dueDate) => getStatusBadge(status)} 
                />
              ))
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Imóvel</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma fatura encontrada
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.contract?.tenant_name || "N/A"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {invoice.property?.name || "N/A"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(invoice.due_date), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-semibold">
                      R$ {Number(invoice.total_amount || 0).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => navigate(`/faturas/${invoice.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        )}
        
        <div className="flex justify-center border-t p-4">
          <Button 
            variant="link" 
            className="text-info"
            onClick={() => navigate("/faturas")}
          >
            VISUALIZAR TODAS AS FATURAS
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
