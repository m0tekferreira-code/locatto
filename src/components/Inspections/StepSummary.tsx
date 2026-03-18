import { Check, X, Camera, FileDown } from "lucide-react";
import type { InspectionData } from "@/pages/Inspections/InspectionWizard";

interface Props {
  data: InspectionData;
}

export const StepSummary = ({ data }: Props) => {
  const conformeCount = data.items.filter((i) => i.status === "conforme").length;
  const ncCount = data.items.filter((i) => i.status === "nao_conforme").length;
  const photosCount = data.items.reduce((acc, i) => acc + i.photos.length, 0);

  return (
    <div className="space-y-6">
      {/* Contract info */}
      <div className="rounded-xl border-2 border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Contrato selecionado</p>
        <p className="font-semibold text-foreground mt-1">{data.contractLabel}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
          <Check className="h-6 w-6 text-green-600 mx-auto" />
          <p className="text-2xl font-bold text-green-700 mt-1">{conformeCount}</p>
          <p className="text-xs text-green-600 font-medium">Conforme</p>
        </div>
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
          <X className="h-6 w-6 text-red-600 mx-auto" />
          <p className="text-2xl font-bold text-red-700 mt-1">{ncCount}</p>
          <p className="text-xs text-red-600 font-medium">Não Conforme</p>
        </div>
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-center">
          <Camera className="h-6 w-6 text-blue-600 mx-auto" />
          <p className="text-2xl font-bold text-blue-700 mt-1">{photosCount}</p>
          <p className="text-xs text-blue-600 font-medium">Fotos</p>
        </div>
      </div>

      {/* Signatures preview */}
      <div className="grid grid-cols-2 gap-3">
        {data.tenantSignature && (
          <div className="rounded-xl border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground mb-2">Locatário</p>
            <img src={data.tenantSignature} alt="Assinatura do locatário" className="h-16 w-full object-contain" />
          </div>
        )}
        {data.inspectorSignature && (
          <div className="rounded-xl border border-border p-3 bg-card">
            <p className="text-xs text-muted-foreground mb-2">Vistoriador</p>
            <img src={data.inspectorSignature} alt="Assinatura do vistoriador" className="h-16 w-full object-contain" />
          </div>
        )}
      </div>

      {/* PDF info */}
      <div className="rounded-xl bg-primary/5 border-2 border-primary/20 p-4 flex items-start gap-3">
        <FileDown className="h-6 w-6 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-foreground">Relatório PDF</p>
          <p className="text-sm text-muted-foreground mt-1">
            Ao finalizar, um PDF da vistoria será gerado automaticamente e vinculado ao contrato selecionado.
          </p>
        </div>
      </div>
    </div>
  );
};
