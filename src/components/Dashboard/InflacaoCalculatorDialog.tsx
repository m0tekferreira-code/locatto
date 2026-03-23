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
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INDICES = [
  { label: "IGPM", value: "" },
  { label: "IPCA", value: "" },
  { label: "INPC", value: "" },
  { label: "IVAR", value: "" },
];

export const InflacaoCalculatorDialog = ({ open, onOpenChange }: Props) => {
  const [valorAtual, setValorAtual] = useState("");
  const [taxa, setTaxa] = useState("");
  const [resultado, setResultado] = useState<{
    novoValor: number;
    reajuste: number;
    variacao: number;
  } | null>(null);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const handleCalc = () => {
    const valor = parseFloat(valorAtual.replace(",", "."));
    const t = parseFloat(taxa.replace(",", "."));
    if (isNaN(valor) || isNaN(t) || valor <= 0) return;
    const novoValor = valor * (1 + t / 100);
    setResultado({
      novoValor,
      reajuste: novoValor - valor,
      variacao: t,
    });
  };

  const handleReset = () => {
    setValorAtual("");
    setTaxa("");
    setResultado(null);
  };

  const applyPreset = (preset: string) => setTaxa(preset);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Calculadora de Inflação / Reajuste
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="space-y-1.5">
            <Label>Valor atual (R$)</Label>
            <Input
              placeholder="Ex.: 1.500,00"
              value={valorAtual}
              onChange={(e) => { setValorAtual(e.target.value); setResultado(null); }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Índice de reajuste (%)</Label>
            <Input
              type="number"
              placeholder="Ex.: 8,55"
              value={taxa}
              onChange={(e) => { setTaxa(e.target.value); setResultado(null); }}
            />
            <div className="flex gap-2 flex-wrap pt-1">
              {INDICES.map((idx) => (
                <button
                  key={idx.label}
                  type="button"
                  className="text-xs border rounded-full px-2.5 py-0.5 text-muted-foreground hover:bg-muted transition-colors"
                  onClick={() => applyPreset(idx.value)}
                  title={`Preencher com ${idx.label} (informe o % manualmente)`}
                >
                  {idx.label}
                </button>
              ))}
              <span className="text-xs text-muted-foreground self-center">
                (preencha o % do índice desejado)
              </span>
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
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-md bg-white p-3 shadow-sm">
                  <p className="text-xs text-muted-foreground mb-1">Valor reajustado</p>
                  <p className="text-lg font-bold text-blue-700">
                    {formatCurrency(resultado.novoValor)}
                  </p>
                </div>
                <div className="rounded-md bg-white p-3 shadow-sm">
                  <p className="text-xs text-muted-foreground mb-1">Acréscimo</p>
                  <p className="text-lg font-bold text-green-600">
                    + {formatCurrency(resultado.reajuste)}
                  </p>
                </div>
                <div className="rounded-md bg-white p-3 shadow-sm">
                  <p className="text-xs text-muted-foreground mb-1">Variação</p>
                  <p className="text-lg font-bold">
                    <Badge className="bg-blue-100 text-blue-700 text-sm">
                      {resultado.variacao.toFixed(2)}%
                    </Badge>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
