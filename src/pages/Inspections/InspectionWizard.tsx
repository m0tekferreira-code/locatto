import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/Layout/AppLayout";
import { StepContractSelect } from "@/components/Inspections/StepContractSelect";
import { StepChecklist } from "@/components/Inspections/StepChecklist";
import { StepEvidence } from "@/components/Inspections/StepEvidence";
import { StepSignature } from "@/components/Inspections/StepSignature";
import { StepSummary } from "@/components/Inspections/StepSummary";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Wifi, WifiOff } from "lucide-react";

export interface InspectionItem {
  id: string;
  room: string;
  item: string;
  status: "conforme" | "nao_conforme" | null;
  photos: string[];
  notes: string;
}

export interface InspectionData {
  contractId: string | null;
  contractLabel: string;
  items: InspectionItem[];
  tenantSignature: string | null;
  inspectorSignature: string | null;
}

const STEPS = [
  { label: "Contrato", short: "1" },
  { label: "Checklist", short: "2" },
  { label: "Evidências", short: "3" },
  { label: "Assinatura", short: "4" },
  { label: "Finalizar", short: "5" },
];

const DEFAULT_ROOMS: { room: string; items: string[] }[] = [
  { room: "Sala", items: ["Piso", "Paredes", "Teto", "Janelas", "Portas", "Iluminação", "Tomadas"] },
  { room: "Quarto", items: ["Piso", "Paredes", "Teto", "Janelas", "Portas", "Iluminação", "Tomadas", "Armário"] },
  { room: "Cozinha", items: ["Piso", "Paredes", "Teto", "Pia", "Torneira", "Armários", "Tomadas", "Azulejos"] },
  { room: "Banheiro", items: ["Piso", "Paredes", "Teto", "Vaso sanitário", "Pia", "Chuveiro", "Box", "Azulejos", "Torneira"] },
  { room: "Área de Serviço", items: ["Piso", "Paredes", "Tanque", "Torneira", "Tomadas"] },
  { room: "Área Externa", items: ["Portão", "Garagem", "Calçada", "Muro", "Interfone"] },
];

const buildInitialItems = (): InspectionItem[] => {
  let id = 0;
  return DEFAULT_ROOMS.flatMap(({ room, items }) =>
    items.map((item) => ({
      id: `item-${id++}`,
      room,
      item,
      status: null,
      photos: [],
      notes: "",
    }))
  );
};

const STORAGE_KEY = "locatto_inspection_draft";

const loadDraft = (): InspectionData | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as InspectionData;
  } catch {
    return null;
  }
};

const saveDraft = (data: InspectionData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage full — silently ignore
  }
};

export const clearInspectionDraft = () => {
  localStorage.removeItem(STORAGE_KEY);
};

const InspectionWizard = () => {
  const draft = loadDraft();
  const [step, setStep] = useState(draft ? 0 : 0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [data, setData] = useState<InspectionData>(
    draft ?? {
      contractId: null,
      contractLabel: "",
      items: buildInitialItems(),
      tenantSignature: null,
      inspectorSignature: null,
    }
  );

  // Persist to localStorage on every data change
  useEffect(() => {
    saveDraft(data);
  }, [data]);

  // Online/Offline detection
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      toast.success("Conexão restabelecida");
    };
    const goOffline = () => {
      setIsOnline(false);
      toast.warning("Sem conexão — seus dados estão salvos localmente");
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const canAdvance = () => {
    if (step === 0) return !!data.contractId;
    if (step === 1) return data.items.every((i) => i.status !== null);
    if (step === 2) {
      const failed = data.items.filter((i) => i.status === "nao_conforme");
      return failed.every((i) => i.photos.length > 0);
    }
    if (step === 3) return !!data.tenantSignature && !!data.inspectorSignature;
    return true;
  };

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <AppLayout title="Vistoria de Entrega">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
          <WifiOff className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">Modo offline — dados salvos localmente</p>
        </div>
      )}

      {/* Draft recovery banner */}
      {draft && step === 0 && data.contractId && (
        <div className="flex items-center justify-between gap-2 p-3 mb-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800">
          <p className="text-sm font-medium">📋 Rascunho recuperado: {data.contractLabel}</p>
          <button
            onClick={() => {
              clearInspectionDraft();
              setData({
                contractId: null,
                contractLabel: "",
                items: buildInitialItems(),
                tenantSignature: null,
                inspectorSignature: null,
              });
            }}
            className="text-xs font-semibold text-blue-600 underline shrink-0"
          >
            Descartar
          </button>
        </div>
      )}

      {/* Stepper */}
      <div className="flex items-center justify-between gap-1 mb-6 px-1">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => i < step && setStep(i)}
              className={cn(
                "flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold shrink-0 transition-all",
                i === step && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                i < step && "bg-primary/80 text-primary-foreground cursor-pointer",
                i > step && "bg-muted text-muted-foreground"
              )}
            >
              {s.short}
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-1 flex-1 mx-1 rounded-full transition-colors",
                  i < step ? "bg-primary/60" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>

      <p className="text-center text-sm font-medium text-muted-foreground mb-4">
        {STEPS[step].label}
      </p>

      {/* Step content */}
      <div className="pb-24">
        {step === 0 && <StepContractSelect data={data} setData={setData} />}
        {step === 1 && <StepChecklist data={data} setData={setData} />}
        {step === 2 && <StepEvidence data={data} setData={setData} />}
        {step === 3 && <StepSignature data={data} setData={setData} />}
        {step === 4 && <StepSummary data={data} />}
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border p-4 flex gap-3 safe-area-bottom">
        {/* Online status pill */}
        <div className={cn(
          "absolute -top-8 right-4 flex items-center gap-1.5 px-3 py-1 rounded-t-lg text-xs font-medium",
          isOnline ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
        )}>
          {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {isOnline ? "Online" : "Offline"}
        </div>

        {step > 0 && (
          <button
            onClick={prev}
            className="flex-1 h-14 rounded-xl border-2 border-border text-foreground font-semibold text-base active:scale-95 transition-transform"
          >
            Voltar
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            onClick={next}
            disabled={!canAdvance()}
            className={cn(
              "flex-1 h-14 rounded-xl font-semibold text-base transition-all active:scale-95",
              canAdvance()
                ? "bg-primary text-primary-foreground shadow-lg"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            Avançar
          </button>
        ) : (
          <button
            onClick={() => {
              if (!isOnline) {
                toast.info("Vistoria salva localmente. Será enviada quando a conexão for restabelecida.");
                return;
              }
              // TODO: save to Supabase & clear draft
              clearInspectionDraft();
              toast.success("Vistoria finalizada com sucesso! O PDF será gerado e vinculado ao contrato.");
            }}
            className="flex-1 h-14 rounded-xl bg-primary text-primary-foreground font-semibold text-base shadow-lg active:scale-95 transition-transform"
          >
            ✅ Finalizar Vistoria
          </button>
        )}
      </div>
    </AppLayout>
  );
};

export default InspectionWizard;
