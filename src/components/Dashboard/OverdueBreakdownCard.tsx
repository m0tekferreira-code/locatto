import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Eye, Gavel, Download, FileSpreadsheet, Send, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { OverdueBucket } from "@/hooks/dashboard/useOverdueBreakdown";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

interface OverdueBreakdownCardProps {
  buckets: OverdueBucket[];
  totalOverdue: number;
  totalCount: number;
  isLoading?: boolean;
}

const getSeverityColor = (minDays: number) => {
  if (minDays <= 3) return "bg-yellow-500/15 text-yellow-700 border-yellow-300";
  if (minDays <= 5) return "bg-orange-500/15 text-orange-700 border-orange-300";
  if (minDays <= 15) return "bg-orange-600/15 text-orange-800 border-orange-400";
  if (minDays <= 30) return "bg-red-500/15 text-red-700 border-red-300";
  if (minDays <= 45) return "bg-red-600/15 text-red-800 border-red-400";
  return "bg-red-700/15 text-red-900 border-red-500";
};

const getSeverityBadge = (minDays: number) => {
  if (minDays <= 5) return "secondary" as const;
  if (minDays <= 15) return "outline" as const;
  return "destructive" as const;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const invoicesToRows = (invoices: any[]) =>
  invoices.map((inv: any) => ({
    Cliente: inv.contract?.tenant_name || "N/A",
    Telefone: inv.contract?.tenant_phone || "-",
    Email: inv.contract?.tenant_email || "-",
    Imóvel: inv.property?.name || "-",
    Vencimento: new Date(inv.due_date).toLocaleDateString("pt-BR"),
    "Dias em Atraso": inv.daysOverdue,
    Valor: Number(inv.total_amount || 0),
  }));

const exportToXlsx = (buckets: OverdueBucket[], selectedLabel?: string) => {
  const wb = XLSX.utils.book_new();
  const bucketsToExport = selectedLabel
    ? buckets.filter((b) => b.label === selectedLabel && b.count > 0)
    : buckets.filter((b) => b.count > 0);

  if (bucketsToExport.length === 0) {
    toast.error("Nenhuma cobrança para exportar");
    return;
  }

  bucketsToExport.forEach((bucket) => {
    const rows = invoicesToRows(bucket.invoices);
    rows.push({
      Cliente: "",
      Telefone: "",
      Email: "",
      Imóvel: "",
      Vencimento: "TOTAL",
      "Dias em Atraso": bucket.count as any,
      Valor: bucket.total,
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    // Format currency column
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let r = range.s.r + 1; r <= range.e.r; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: 6 })];
      if (cell) cell.z = '#,##0.00';
    }
    ws["!cols"] = [{ wch: 30 }, { wch: 16 }, { wch: 28 }, { wch: 30 }, { wch: 14 }, { wch: 16 }, { wch: 14 }];
    const sheetName = bucket.label.replace(/[^\w\s-]/g, "").substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  // Summary sheet when exporting all
  if (!selectedLabel) {
    const summaryRows = bucketsToExport.map((b) => ({
      Período: b.label,
      Quantidade: b.count,
      "Valor Total": b.total,
    }));
    summaryRows.push({
      Período: "TOTAL GERAL",
      Quantidade: bucketsToExport.reduce((s, b) => s + b.count, 0),
      "Valor Total": bucketsToExport.reduce((s, b) => s + b.total, 0),
    });
    const ws = XLSX.utils.json_to_sheet(summaryRows);
    ws["!cols"] = [{ wch: 16 }, { wch: 12 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, "Resumo");
  }

  const fileName = selectedLabel
    ? `cobrancas-atraso-${selectedLabel.replace(/\s/g, "-")}.xlsx`
    : `cobrancas-atraso-completo.xlsx`;
  XLSX.writeFile(wb, fileName);
  toast.success("Relatório exportado com sucesso!");
};

export const OverdueBreakdownCard = ({
  buckets,
  totalOverdue,
  totalCount,
  isLoading,
}: OverdueBreakdownCardProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [openBucket, setOpenBucket] = useState<string | null>(null);
  const [sendingBucket, setSendingBucket] = useState<string | null>(null);

  const handleSendToCobranca = async (bucketLabel: string, invoices: any[]) => {
    if (invoices.length === 0) return;
    setSendingBucket(bucketLabel);
    try {
      const { data, error } = await supabase.functions.invoke("send-cobranca-webhook", {
        body: { bucketLabel, invoices },
      });
      if (error) throw error;
      toast.success(data?.message || "Cobranças enviadas com sucesso!");
    } catch (err: any) {
      console.error("Erro ao enviar para cobrança:", err);
      toast.error("Falha ao enviar para o sistema de cobrança");
    } finally {
      setSendingBucket(null);
    }
  };

  if (isLoading) return null;

  const activeBuckets = buckets.filter((b) => b.count > 0);

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cobranças em Atraso por Período
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{totalCount} cobranças</p>
              <p className="text-sm font-bold text-destructive">{formatCurrency(totalOverdue)}</p>
            </div>
            {activeBuckets.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => exportToXlsx(buckets)}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Exportar Tudo
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {activeBuckets.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Nenhuma cobrança em atraso 🎉
          </div>
        ) : (
          <>
            {/* Summary bars */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
              {buckets.map((bucket) => (
                <button
                  key={bucket.label}
                  onClick={() =>
                    bucket.count > 0 &&
                    setOpenBucket(openBucket === bucket.label ? null : bucket.label)
                  }
                  className={`rounded-lg border p-3 text-center transition-all ${
                    bucket.count > 0
                      ? `${getSeverityColor(bucket.minDays)} cursor-pointer hover:shadow-md`
                      : "bg-muted/30 text-muted-foreground opacity-50 cursor-default"
                  } ${openBucket === bucket.label ? "ring-2 ring-destructive/50" : ""}`}
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide">{bucket.label}</p>
                  <p className="text-xl font-bold mt-1">{bucket.count}</p>
                  {bucket.count > 0 && (
                    <p className="text-[10px] mt-0.5 font-medium">{formatCurrency(bucket.total)}</p>
                  )}
                </button>
              ))}
            </div>

            {/* Detail table for selected bucket */}
            {openBucket && (
              <div className="border rounded-lg overflow-hidden animate-in slide-in-from-top-2 duration-200">
                <div className="bg-muted/50 px-4 py-2 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-sm font-medium">
                    Detalhes: {openBucket}
                  </span>
                  <div className="flex items-center gap-2">
                    {buckets.find((b) => b.label === openBucket)?.minDays! >= 30 && (
                      <Badge variant="destructive" className="text-[10px] gap-1">
                        <Gavel className="h-3 w-3" />
                        Considerar cobrança jurídica
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs h-7"
                      onClick={() => exportToXlsx(buckets, openBucket)}
                    >
                      <Download className="h-3 w-3" />
                      Exportar grupo
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-1 text-xs h-7"
                      disabled={sendingBucket === openBucket}
                      onClick={() => {
                        const bucket = buckets.find((b) => b.label === openBucket);
                        if (bucket) handleSendToCobranca(bucket.label, bucket.invoices);
                      }}
                    >
                      {sendingBucket === openBucket ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      Enviar p/ cobrança
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOpenBucket(null)}
                      className="h-6 w-6 p-0"
                    >
                      ✕
                    </Button>
                  </div>
                </div>

                {isMobile ? (
                  <div className="p-3 space-y-2">
                    {buckets
                      .find((b) => b.label === openBucket)
                      ?.invoices.map((inv: any) => (
                        <div
                          key={inv.id}
                          className="border rounded-lg p-3 space-y-1 bg-background"
                        >
                          <div className="flex justify-between items-start">
                            <p className="font-medium text-sm">
                              {inv.contract?.tenant_name || "N/A"}
                            </p>
                            <Badge variant="destructive" className="text-[10px]">
                              {inv.daysOverdue}d
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {inv.property?.name || "-"}
                          </p>
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-sm">
                              {formatCurrency(Number(inv.total_amount))}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => navigate(`/faturas/${inv.id}`)}
                            >
                              <Eye className="h-3 w-3 mr-1" /> Ver
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Imóvel</TableHead>
                        <TableHead className="text-center">Dias em atraso</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {buckets
                        .find((b) => b.label === openBucket)
                        ?.invoices.map((inv: any) => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-medium">
                              {inv.contract?.tenant_name || "N/A"}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {inv.property?.name || "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={getSeverityBadge(inv.daysOverdue)}
                                className="text-xs"
                              >
                                {inv.daysOverdue} dias
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(inv.due_date).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(Number(inv.total_amount))}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/faturas/${inv.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
