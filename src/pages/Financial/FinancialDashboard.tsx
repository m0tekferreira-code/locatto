import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/Layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, TrendingDown, DollarSign, AlertCircle, 
  Calendar, RefreshCw, Download, Plus, Receipt, PieChart, BarChart3
} from "lucide-react";
import { useResumoFinanceiro } from "@/hooks/useResumoFinanceiro";
import { useFluxoCaixa, useComposicaoDespesas, useInadimplenciaPorImovel } from "@/hooks/useFinancialDashboard";
import { LancamentoForm } from "@/components/Financial/LancamentoForm";
import { BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

const FinancialDashboardComplete = () => {
  const navigate = useNavigate();
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [dataInicio, setDataInicio] = useState(firstDayOfMonth.toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(lastDayOfMonth.toISOString().split('T')[0]);
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);

  const { data: resumo, isLoading: loadingResumo, refetch: refetchResumo } = useResumoFinanceiro(dataInicio, dataFim);
  const { data: fluxoCaixa, isLoading: loadingFluxo } = useFluxoCaixa({ meses: 6, id_imovel: selectedProperty === 'all' ? undefined : selectedProperty });
  const { data: composicao, isLoading: loadingComposicao } = useComposicaoDespesas({ 
    data_inicio: dataInicio, 
    data_fim: dataFim,
    id_imovel: selectedProperty === 'all' ? undefined : selectedProperty 
  });
  const { data: inadimplencia, isLoading: loadingInadimplencia } = useInadimplenciaPorImovel();

  // Buscar imóveis
  const { data: properties } = useQuery({
    queryKey: ['properties-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handlePeriodChange = (type: 'current' | 'previous' | 'year') => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (type) {
      case 'current':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'previous':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
    }

    setDataInicio(start.toISOString().split('T')[0]);
    setDataFim(end.toISOString().split('T')[0]);
  };

  const formatMes = (mesStr: string) => {
    const [ano, mes] = mesStr.split('-');
    return new Date(parseInt(ano), parseInt(mes) - 1).toLocaleDateString('pt-BR', { 
      month: 'short', 
      year: '2-digit' 
    });
  };

  return (
    <AppLayout title="Dashboard Financeiro">
      <div className="max-w-7xl mx-auto space-y-6">
            {/* Filtros */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Filtros e Período
                    </CardTitle>
                    <CardDescription>
                      Configure os filtros para análise financeira
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => navigate('/financeiro/baixa')}>
                      <Receipt className="mr-2 h-4 w-4" />
                      Baixar Pagamentos
                    </Button>
                    <Button onClick={() => setFormOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Novo Lançamento
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  <Button variant="outline" onClick={() => handlePeriodChange('current')}>
                    Mês Atual
                  </Button>
                  <Button variant="outline" onClick={() => handlePeriodChange('previous')}>
                    Mês Anterior
                  </Button>
                  <Button variant="outline" onClick={() => handlePeriodChange('year')}>
                    Ano Atual
                  </Button>
                  <div className="md:col-span-2">
                    <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os Imóveis" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Imóveis</SelectItem>
                        {properties?.map((prop) => (
                          <SelectItem key={prop.id} value={prop.id}>
                            {prop.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="data-inicio">Data Início</Label>
                    <Input
                      id="data-inicio"
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="data-fim">Data Fim</Label>
                    <Input
                      id="data-fim"
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPIs */}
            {loadingResumo ? (
              <div className="grid grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-muted rounded w-24" />
                        <div className="h-8 bg-muted rounded w-32" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : resumo ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-green-200 bg-green-50/50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted-foreground">Total Receitas</p>
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-3xl font-bold text-green-600">
                      {formatCurrency(resumo.total_receitas)}
                    </p>
                    <Badge variant="outline" className="mt-2 border-green-600 text-green-600">
                      Pagamentos recebidos
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="border-red-200 bg-red-50/50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted-foreground">Total Despesas</p>
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    </div>
                    <p className="text-3xl font-bold text-red-600">
                      {formatCurrency(resumo.total_despesas)}
                    </p>
                    <Badge variant="outline" className="mt-2 border-red-600 text-red-600">
                      Pagamentos realizados
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50/50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted-foreground">Saldo</p>
                      <DollarSign className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className={`text-3xl font-bold ${resumo.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {formatCurrency(resumo.saldo)}
                    </p>
                    <Badge 
                      variant="outline" 
                      className={`mt-2 ${resumo.saldo >= 0 ? 'border-blue-600 text-blue-600' : 'border-orange-600 text-orange-600'}`}
                    >
                      {resumo.saldo >= 0 ? 'Positivo' : 'Negativo'}
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="border-yellow-200 bg-yellow-50/50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted-foreground">Inadimplência</p>
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    </div>
                    <p className="text-3xl font-bold text-yellow-600">
                      {formatCurrency(resumo.total_inadimplencia)}
                    </p>
                    <Badge variant="outline" className="mt-2 border-yellow-600 text-yellow-600">
                      Valores atrasados
                    </Badge>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Fluxo de Caixa */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Fluxo de Caixa (Últimos 6 Meses)
                  </CardTitle>
                  <CardDescription>
                    Receitas vs Despesas mensais
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingFluxo ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : fluxoCaixa && fluxoCaixa.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={fluxoCaixa}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mes" tickFormatter={formatMes} />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={formatMes}
                        />
                        <Legend />
                        <Bar dataKey="receitas" fill="#10b981" name="Receitas" />
                        <Bar dataKey="despesas" fill="#ef4444" name="Despesas" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Sem dados para o período selecionado
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Composição das Despesas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Composição das Despesas
                  </CardTitle>
                  <CardDescription>
                    Distribuição por categoria
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingComposicao ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : composicao && composicao.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPie>
                        <Pie
                          data={composicao}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ categoria, percent }) => `${categoria} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="valor"
                        >
                          {composicao.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Sem despesas no período selecionado
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Inadimplência por Imóvel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Inadimplência por Imóvel
                </CardTitle>
                <CardDescription>
                  Valores atrasados agrupados por propriedade
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingInadimplencia ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : inadimplencia && inadimplencia.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={inadimplencia} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="nome_imovel" type="category" width={150} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="total_inadimplencia" fill="#f59e0b" name="Inadimplência" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Nenhuma inadimplência registrada
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

      <LancamentoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={() => {
          refetchResumo();
          toast.success('Lançamento criado com sucesso!');
        }}
      />
    </AppLayout>
  );
};

export default FinancialDashboardComplete;