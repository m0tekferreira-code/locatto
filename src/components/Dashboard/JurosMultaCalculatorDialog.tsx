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
import { Percent } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const JurosMultaCalculatorDialog = ({ open, onOpenChange }: Props) => {
  const [valorDebito, setValorDebito] = useState("");
  const [diasAtraso, setDiasAtraso] = useState("");
  const [taxaMulta, setTaxaMulta] = useState("2");
  const [taxaJurosMes, setTaxaJurosMes] = useState("1");
  const [resultado, setResultado] = useState<{
    valorOriginal: number;
    multa: number;
    juros: number;
    total: number;
    jurosDiario: number;
  } | null>(null);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const handleCalc = () => {
    const valor = parseFloat(valorDebito.replace(",", "."));
    const dias = parseInt(diasAtraso, 10);
    const pctMulta = parseFloat(taxaMulta.replace(",", "."));
    const pctJurosMes = parseFloat(taxaJurosMes.replace(",", "."));

    if (isNaN(valor) || isNaN(dias) || isNaN(pctMulta) || isNaN(pctJurosMes) || valor <= 0 || dias < 0) return;

    // Multa fixa (código civil: máx 2% para residencial)
    const multa = valor * (pctMulta / 100);

    // Juros compostos diários: taxa_mensal convertida para diária
    const taxaDiaria = Math.pow(1 + pctJurosMes / 100, 1 / 30) - 1;
    const juros = valor * (Math.pow(1 + taxaDiaria, dias) - 1);

    setResultado({
      valorOriginal: valor,
      multa,
      juros,
      total: valor + multa + juros,
      jurosDiario: taxaDiaria * 100,
    });
  };

  const handleReset = () => {
    setValorDebito("");
    setDiasAtraso("");
    setTaxaMulta("2");
    setTaxaJurosMes("1");
    setResultado(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-blue-600" />
            Calculadora de Juros / Multa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Valor do débito (R$)</Label>
              <Input
                placeholder="Ex.: 1.500,00"
                value={valorDebito}
                onChange={(e) => { setValorDebito(e.target.value); setResultado(null); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Dias de atraso</Label>
              <Input
                type="number"
                placeholder="Ex.: 15"
                min={0}
                value={diasAtraso}
                onChange={(e) => { setDiasAtraso(e.target.value); setResultado(null); }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                Multa (%)
                <span className="text-xs text-muted-foreground ml-1">res. máx 2%</span>
              </Label>
              <Input
                type="number"
                step="0.1"
                value={taxaMulta}
                onChange={(e) => { setTaxaMulta(e.target.value); setResultado(null); }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                Juros ao mês (%)
                <span className="text-xs text-muted-foreground ml-1">padrão 1%</span>
              </Label>
              <Input
                type="number"
                step="0.1"
                value={taxaJurosMes}
                onChange={(e) => { setTaxaJurosMes(e.target.value); setResultado(null); }}
              />
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
              <p className="text-xs font-semibold uppercase text-blue-700 tracking-wide">Resultado</p>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor original</span>
                  <span className="font-medium">{formatCurrency(resultado.valorOriginal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Multa ({taxaMulta}%)</span>
                  <span className="font-medium text-orange-600">+ {formatCurrency(resultado.multa)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Juros ({diasAtraso} dias · {resultado.jurosDiario.toFixed(4)}%/dia)
                  </span>
                  <span className="font-medium text-orange-600">+ {formatCurrency(resultado.juros)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-semibold text-base">
                  <span>Total a pagar</span>
                  <span className="text-blue-700">{formatCurrency(resultado.total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
