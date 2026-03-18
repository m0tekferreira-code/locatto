import { useState } from "react";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header, SidebarAvailableContext } from "@/components/Layout/Header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertCircle, Calendar, DollarSign, Building2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BaixaPagamentos = () => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [selectedLancamento, setSelectedLancamento] = useState<any>(null);
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: lancamentos, isLoading } = useQuery({
    queryKey: ['lancamentos-pendentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos_financeiros')
        .select(`
          *,
          properties(name, address),
          contracts(tenant_name)
        `)
        .in('status', ['pendente', 'atrasado'])
        .order('data_vencimento', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const handleBaixarPagamento = async () => {
    if (!selectedLancamento) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('lancamentos_financeiros')
        .update({
          status: 'pago',
          data_pagamento: dataPagamento,
        })
        .eq('id', selectedLancamento.id);

      if (error) throw error;

      toast.success('Pagamento baixado com sucesso!');
      setSelectedLancamento(null);
      queryClient.invalidateQueries({ queryKey: ['lancamentos-pendentes'] });
    } catch (error: any) {
      console.error('Erro ao baixar pagamento:', error);
      toast.error('Erro ao baixar pagamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (status: string, dataVencimento: string) => {
    const isOverdue = new Date(dataVencimento) < new Date();
    
    if (status === 'atrasado' || (status === 'pendente' && isOverdue)) {
      return <Badge variant="destructive">Atrasado</Badge>;
    }
    
    return <Badge variant="secondary">Pendente</Badge>;
  };

  const pendentes = lancamentos?.filter(l => l.status === 'pendente' && new Date(l.data_vencimento) >= new Date()) || [];
  const atrasados = lancamentos?.filter(l => l.status === 'atrasado' || (l.status === 'pendente' && new Date(l.data_vencimento) < new Date())) || [];

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <SidebarAvailableContext.Provider value={true}>
        <div className="flex h-screen w-full bg-background">
          <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Baixa de Pagamentos" />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full p-3 bg-yellow-500/10">
                      <Calendar className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pendentes</p>
                      <p className="text-2xl font-bold">{pendentes.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full p-3 bg-red-500/10">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Atrasados</p>
                      <p className="text-2xl font-bold">{atrasados.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full p-3 bg-red-500/10">
                      <DollarSign className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Atrasado</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(atrasados.reduce((acc, l) => acc + Number(l.valor), 0))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabela de Atrasados */}
            {atrasados.length > 0 && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    Lançamentos Atrasados
                  </CardTitle>
                  <CardDescription>
                    Pagamentos vencidos que precisam de atenção urgente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Imóvel</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {atrasados.map((lanc: any) => (
                        <TableRow key={lanc.id}>
                          <TableCell>
                            <Badge variant={lanc.tipo === 'receita' ? 'default' : 'secondary'}>
                              {lanc.tipo === 'receita' ? 'Receita' : 'Despesa'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            <div>
                              <p className="font-medium">{lanc.categoria}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                {lanc.descricao}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {lanc.properties?.name || '-'}
                          </TableCell>
                          <TableCell>
                            {new Date(lanc.data_vencimento).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(lanc.valor)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(lanc.status, lanc.data_vencimento)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => setSelectedLancamento(lanc)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Baixar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Tabela de Pendentes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Lançamentos Pendentes
                </CardTitle>
                <CardDescription>
                  Pagamentos futuros e dentro do prazo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Carregando...</div>
                ) : pendentes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum lançamento pendente
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Imóvel</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendentes.map((lanc: any) => (
                        <TableRow key={lanc.id}>
                          <TableCell>
                            <Badge variant={lanc.tipo === 'receita' ? 'default' : 'secondary'}>
                              {lanc.tipo === 'receita' ? 'Receita' : 'Despesa'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            <div>
                              <p className="font-medium">{lanc.categoria}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                {lanc.descricao}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {lanc.properties?.name || '-'}
                          </TableCell>
                          <TableCell>
                            {new Date(lanc.data_vencimento).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(lanc.valor)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(lanc.status, lanc.data_vencimento)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => setSelectedLancamento(lanc)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Baixar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Dialog de Baixa */}
      <Dialog open={!!selectedLancamento} onOpenChange={() => setSelectedLancamento(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
            <DialogDescription>
              Registre a data de pagamento para baixar este lançamento
            </DialogDescription>
          </DialogHeader>

          {selectedLancamento && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tipo:</span>
                  <Badge variant={selectedLancamento.tipo === 'receita' ? 'default' : 'secondary'}>
                    {selectedLancamento.tipo === 'receita' ? 'Receita' : 'Despesa'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Categoria:</span>
                  <span className="font-medium">{selectedLancamento.categoria}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Valor:</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(selectedLancamento.valor)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Vencimento:</span>
                  <span>{new Date(selectedLancamento.data_vencimento).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_pagamento">Data do Pagamento</Label>
                <Input
                  id="data_pagamento"
                  type="date"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedLancamento(null)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleBaixarPagamento}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Baixando...' : 'Confirmar Baixa'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
        </div>
      </SidebarAvailableContext.Provider>
    </SidebarProvider>
  );
};

export default BaixaPagamentos;