import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Sistema = "price" | "sac";

interface ResultadoPrice {
  sistema: "price";
  valorFinanciado: number;
  prestacao: number;
  totalPago: number;
  totalJuros: number;
}

interface ResultadoSAC {
  sistema: "sac";
  valorFinanciado: number;
  prestacaoInicial: number;
  prestacaoFinal: number;
  totalPago: number;
  totalJuros: number;
  amortizacao: number;
}

type Resultado = ResultadoPrice | ResultadoSAC;

export const FinanciamentoCalculatorDialog = ({ open, onOpenChange }: Props) => {
  const [valorImovel, setValorImovel] = useState("");
  const [entrada, setEntrada] = useState("");
  const [prazo, setPrazo] = useState("360");
  const [taxaMes, setTaxaMes] = useState("1");
  const [sistema, setSistema] = useState<Sistema>("price");
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const parseValue = (s: string) => parseFloat(s.replace(/\./g, "").replace(",", "."));

  const handleCalc = () => {
    const imovel = parseValue(valorImovel);
    const ent = parseValue(entrada) || 0;
    const n = parseInt(prazo, 10);
    const i = parseFloat(taxaMes.replace(",", ".")) / 100;

    if (isNaN(imovel) || isNaN(n) || isNaN(i) || imovel <= 0 || n <= 0 || i <= 0) return;
    if (ent >= imovel) return;

    const pv = imovel - ent;

    if (sistema === "price") {
      // PMT = PV * i * (1+i)^n / ((1+i)^n - 1)
      const fator = Math.pow(1 + i, n);
      const prestacao = (pv * i * fator) / (fator - 1);
      const totalPago = prestacao * n + ent;
      setResultado({
        sistema: "price",
        valorFinanciado: pv,
        prestacao,
        totalPago,
        totalJuros: prestacao * n - pv,
      });
    } else {
      // SAC: amortização fixa = PV/n
      const amort = pv / n;
      const prestacaoInicial = amort + pv * i;
      const prestacaoFinal = amort + amort * i; // última parcela: saldo = amort
      // Total = soma de all prestações = n*amort + i * soma do saldo residual
      // soma saldo = PV + (PV-amort) + ... = amort * (n + (n-1) + ... + 1) = amort * n*(n+1)/2
      const totalJuros = i * amort * ((n * (n + 1)) / 2);
      const totalPago = pv + totalJuros + ent;
      setResultado({
        sistema: "sac",
        valorFinanciado: pv,
        prestacaoInicial,
        prestacaoFinal,
        totalPago,
        totalJuros,
        amortizacao: amort,
      });
    }
  };

  const handleReset = () => {
    setValorImovel("");
    setEntrada("");
    setPrazo("360");
    setTaxaMes("1");
    setResultado(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            Calculadora de Financiamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Sistema */}
          <div className="space-y-1.5">
            <Label>Sistema de amortização</Label>
            <Tabs value={sistema} onValueChange={(v) => { setSistema(v as Sistema); setResultado(null); }}>
              <TabsList className="w-full">
                <TabsTrigger value="price" className="flex-1">Price (parcelas iguais)</TabsTrigger>
                <TabsTrigger value="sac" className="flex-1">SAC (decrescente)</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Valor do imóvel (R$)</Label>
              <Input
                placeholder="Ex.: 500.000"
                value={valorImovel}
                onChange={(e) => { setValorImovel(e.target.value); setResultado(null); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Entrada (R$)</Label>
              <Input
                placeholder="Ex.: 100.000"
                value={entrada}
                onChange={(e) => { setEntrada(e.target.value); setResultado(null); }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Prazo (meses)</Label>
              <Input
                type="number"
                placeholder="Ex.: 360"
                value={prazo}
                onChange={(e) => { setPrazo(e.target.value); setResultado(null); }}
              />
              {prazo && !isNaN(parseInt(prazo)) && (
                <p className="text-xs text-muted-foreground">
                  {(parseInt(prazo) / 12).toFixed(1)} anos
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Taxa de juros ao mês (%)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex.: 1,0"
                value={taxaMes}
                onChange={(e) => { setTaxaMes(e.target.value); setResultado(null); }}
              />
              {taxaMes && !isNaN(parseFloat(taxaMes)) && (
                <p className="text-xs text-muted-foreground">
                  ≈ {((Math.pow(1 + parseFloat(taxaMes) / 100, 12) - 1) * 100).toFixed(2)}% ao ano
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleCalc}>
              Calcular
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Limpar
            </Button>
          </div>

          {resultado && (
            <div className="rounded-lg border bg-blue-50/60 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase text-blue-700 tracking-wide">
                Resultado · Sistema {resultado.sistema.toUpperCase()}
              </p>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor financiado</span>
                  <span className="font-medium">{formatCurrency(resultado.valorFinanciado)}</span>
                </div>

                {resultado.sistema === "price" ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prestação mensal (fixa)</span>
                    <span className="font-bold text-blue-700 text-base">
                      {formatCurrency(resultado.prestacao)}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">1ª prestação</span>
                      <span className="font-bold text-blue-700 text-base">
                        {formatCurrency(resultado.prestacaoInicial)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Última prestação</span>
                      <span className="font-bold text-green-700 text-base">
                        {formatCurrency(resultado.prestacaoFinal)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amortização mensal</span>
                      <span className="font-medium">{formatCurrency(resultado.amortizacao)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total de juros pagos</span>
                  <span className="font-medium text-orange-600">
                    {formatCurrency(resultado.totalJuros)}
                  </span>
                </div>

                <div className="flex justify-between pt-2 border-t font-semibold text-base">
                  <span>Total pago (c/ entrada)</span>
                  <span className="text-blue-700">{formatCurrency(resultado.totalPago)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
