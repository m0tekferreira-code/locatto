import { useRef, useState } from "react";
import { AppLayout } from "@/components/Layout/AppLayout";
import { useExtrato } from "@/hooks/useExtrato";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Loader2, AlertTriangle, FileSpreadsheet, DollarSign, AlertCircle, UserX, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { TenantAssignSelect } from "@/components/Extrato/TenantAssignSelect";
import type { StatusBaixa } from "@/lib/parseExtrato";

const statusConfig: Record<StatusBaixa, { label: string; className: string }> = {
  OK: { label: "OK", className: "bg-green-100 text-green-800 border-green-200" },
  ATRASADO: { label: "Atrasado", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  PARCIAL: { label: "Parcial", className: "bg-red-100 text-red-800 border-red-200" },
  DUPLICADO: { label: "Duplicado", className: "bg-red-100 text-red-800 border-red-200" },
  NAO_ALUGUEL: { label: "Não Aluguel", className: "bg-gray-100 text-gray-600 border-gray-200" },
  PENDENTE_IA: { label: "Pendente", className: "bg-blue-100 text-blue-800 border-blue-200" },
};

const ImportarExtrato = () => {
  const { linhas, carregando, erro, etapa, resumo, contratos, salvandoAlias, importarArquivo, atualizarLinha, salvarAlias } = useExtrato();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mostrarNaoIdentificados, setMostrarNaoIdentificados] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importarArquivo(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) importarArquivo(file);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const criticosSemBaixa = linhas.filter((l) => l.prioridade === "CRITICO" && !l.baixa_realizada).length;
  const naoIdentificados = linhas.filter((l) => !l.inquilino_matched && l.status !== "NAO_ALUGUEL");

  const exportarNaoIdentificados = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Pagamentos Não Identificados", 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);
    doc.text(`Total: ${naoIdentificados.length} registro(s)`, 14, 34);

    (doc as any).autoTable({
      startY: 42,
      head: [["Data", "Nome Extrato", "Valor", "Status", "Observação"]],
      body: naoIdentificados.map((l) => [
        l.data_pix || l.data_banco || "-",
        l.nome_limpo,
        l.credito != null ? formatCurrency(l.credito) : "-",
        statusConfig[l.status]?.label ?? l.status,
        l.observacao || "-",
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [234, 88, 12] },
      alternateRowStyles: { fillColor: [255, 247, 237] },
    });

    doc.save("nao-identificados.pdf");
  };

  return (
    <AppLayout title="Importar Extrato Bancário">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* IDLE */}
        {etapa === "idle" && !erro && (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-16 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
          >
            <Upload className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Arraste o extrato bancário ou clique para selecionar
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">.xlsx</p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFile}
              className="hidden"
            />
          </div>
        )}

        {/* LOADING */}
        {(etapa === "parse" || etapa === "ia") && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Analisando pagamentos com IA...</p>
          </div>
        )}

        {/* ERRO */}
        {erro && (
          <div className="text-center py-16 space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <p className="text-destructive font-medium">{erro}</p>
            <Button variant="outline" onClick={() => inputRef.current?.click()}>
              Tentar novamente
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFile}
              className="hidden"
            />
          </div>
        )}

        {/* REVISÃO */}
        {etapa === "revisao" && (
          <>
            {/* Cards resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="rounded-full p-3 bg-blue-500/10">
                    <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{resumo.total}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-red-200">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="rounded-full p-3 bg-red-500/10">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Críticos</p>
                    <p className="text-2xl font-bold text-red-600">{resumo.criticos}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-yellow-200">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="rounded-full p-3 bg-yellow-500/10">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Com multa</p>
                    <p className="text-2xl font-bold text-yellow-600">{resumo.comMulta}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="rounded-full p-3 bg-red-500/10">
                    <DollarSign className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total multas</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(resumo.totalMultas)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card
                className={`border-orange-200 cursor-pointer transition-colors ${mostrarNaoIdentificados ? "ring-2 ring-orange-400" : "hover:bg-muted/30"}`}
                onClick={() => setMostrarNaoIdentificados(!mostrarNaoIdentificados)}
              >
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="rounded-full p-3 bg-orange-500/10">
                    <UserX className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Não identificados</p>
                    <p className="text-2xl font-bold text-orange-600">{resumo.naoIdentificados}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alerta críticos */}
            {criticosSemBaixa > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {criticosSemBaixa} pagamento{criticosSemBaixa > 1 ? "s" : ""} crítico{criticosSemBaixa > 1 ? "s" : ""} precisa{criticosSemBaixa > 1 ? "m" : ""} de verificação
                </AlertDescription>
              </Alert>
            )}

            {/* Tabela */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Nome Extrato</TableHead>
                        <TableHead>Inquilino</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Multa</TableHead>
                        <TableHead className="text-center">Dias atraso</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Observação</TableHead>
                        <TableHead className="text-center">Baixa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linhas.map((l) => {
                        const cfg = statusConfig[l.status] ?? statusConfig.PENDENTE_IA;
                        const rowBg =
                          l.prioridade === "CRITICO"
                            ? "bg-red-50"
                            : l.prioridade === "ATENCAO"
                            ? "bg-yellow-50"
                            : "";
                        return (
                          <TableRow key={l.id} className={rowBg}>
                            <TableCell className="whitespace-nowrap text-sm">{l.data_pix || l.data_banco}</TableCell>
                            <TableCell className="text-sm max-w-[160px] truncate">{l.nome_limpo}</TableCell>
                            <TableCell>
                              <TenantAssignSelect
                                nomeExtrato={l.nome_limpo}
                                currentMatch={l.inquilino_matched}
                                contratos={contratos}
                                onAssign={(contractId, tenantName) => salvarAlias(l.nome_limpo, contractId, tenantName, l.id)}
                                saving={salvandoAlias === l.id}
                              />
                            </TableCell>
                            <TableCell className="text-right font-semibold whitespace-nowrap">
                              {l.credito != null ? formatCurrency(l.credito) : "-"}
                            </TableCell>
                            <TableCell className={`text-right whitespace-nowrap ${l.multa_devida > 0 ? "text-red-600 font-semibold" : ""}`}>
                              {l.multa_devida > 0 ? formatCurrency(l.multa_devida) : "-"}
                            </TableCell>
                            <TableCell className="text-center">{l.dias_atraso || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cfg.className}>
                                {cfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm max-w-[250px] truncate" title={l.observacao || ""}>{l.observacao || "-"}</TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={l.baixa_realizada}
                                onCheckedChange={(v) => atualizarLinha(l.id, { baixa_realizada: !!v })}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Relatório Não Identificados */}
            {mostrarNaoIdentificados && naoIdentificados.length > 0 && (
              <Card className="border-orange-200">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                      <UserX className="h-5 w-5 text-orange-600" />
                      <h3 className="font-semibold">Pagamentos Não Identificados ({naoIdentificados.length})</h3>
                    </div>
                    <Button variant="outline" size="sm" onClick={exportarNaoIdentificados}>
                      <FileDown className="h-4 w-4 mr-2" />
                      Exportar PDF
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Nome Extrato</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Vincular a</TableHead>
                          <TableHead>Observação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {naoIdentificados.map((l) => (
                          <TableRow key={l.id} className="bg-orange-50/50">
                            <TableCell className="whitespace-nowrap text-sm">{l.data_pix || l.data_banco}</TableCell>
                            <TableCell className="text-sm font-medium">{l.nome_limpo}</TableCell>
                            <TableCell className="text-right font-semibold whitespace-nowrap">
                              {l.credito != null ? formatCurrency(l.credito) : "-"}
                            </TableCell>
                            <TableCell>
                              <TenantAssignSelect
                                nomeExtrato={l.nome_limpo}
                                currentMatch={l.inquilino_matched}
                                contratos={contratos}
                                onAssign={(contractId, tenantName) => salvarAlias(l.nome_limpo, contractId, tenantName, l.id)}
                                saving={salvandoAlias === l.id}
                              />
                            </TableCell>
                            <TableCell className="text-sm max-w-[250px] truncate" title={l.observacao || ""}>{l.observacao || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default ImportarExtrato;
