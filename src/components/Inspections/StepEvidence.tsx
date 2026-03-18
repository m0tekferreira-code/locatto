import { useRef } from "react";
import { Camera, Trash2, AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { InspectionData } from "@/pages/Inspections/InspectionWizard";
import imageCompression from "browser-image-compression";

interface Props {
  data: InspectionData;
  setData: React.Dispatch<React.SetStateAction<InspectionData>>;
}

export const StepEvidence = ({ data, setData }: Props) => {
  const failedItems = data.items.filter((i) => i.status === "nao_conforme");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeItemRef = useRef<string | null>(null);

  const handleCapture = (itemId: string) => {
    activeItemRef.current = itemId;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeItemRef.current) return;

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const id = activeItemRef.current!;
        setData((prev) => ({
          ...prev,
          items: prev.items.map((i) =>
            i.id === id ? { ...i, photos: [...i.photos, base64] } : i
          ),
        }));
      };
      reader.readAsDataURL(compressed);
    } catch {
      // fallback without compression
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const id = activeItemRef.current!;
        setData((prev) => ({
          ...prev,
          items: prev.items.map((i) =>
            i.id === id ? { ...i, photos: [...i.photos, base64] } : i
          ),
        }));
      };
      reader.readAsDataURL(file);
    }

    e.target.value = "";
  };

  const removePhoto = (itemId: string, photoIndex: number) => {
    setData((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.id === itemId ? { ...i, photos: i.photos.filter((_, idx) => idx !== photoIndex) } : i
      ),
    }));
  };

  const setNotes = (itemId: string, notes: string) => {
    setData((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === itemId ? { ...i, notes } : i)),
    }));
  };

  if (failedItems.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🎉</span>
        </div>
        <p className="font-semibold text-foreground text-lg">Tudo conforme!</p>
        <p className="text-muted-foreground mt-1">Nenhum item foi marcado como "Não Conforme".</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">
          Anexe ao menos 1 foto para cada item reprovado.
        </p>
      </div>

      {failedItems.map((item) => (
        <div key={item.id} className="rounded-xl border-2 border-destructive/30 bg-card overflow-hidden">
          <div className="p-4 bg-destructive/5 border-b border-destructive/20">
            <p className="font-semibold text-foreground">
              {item.room} — {item.item}
            </p>
          </div>

          <div className="p-4 space-y-3">
            {/* Photos grid */}
            {item.photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {item.photos.map((photo, idx) => (
                  <div key={idx} className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-border">
                    <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(item.id, idx)}
                      className="absolute top-0.5 right-0.5 bg-destructive text-white rounded-full p-0.5"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Camera button */}
            <button
              onClick={() => handleCapture(item.id)}
              className={cn(
                "w-full h-14 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 font-semibold transition-all active:scale-95",
                item.photos.length === 0
                  ? "border-destructive text-destructive bg-destructive/5"
                  : "border-border text-muted-foreground"
              )}
            >
              <Camera className="h-5 w-5" />
              {item.photos.length === 0 ? "Tirar foto (obrigatório)" : "Adicionar mais fotos"}
            </button>

            {/* Notes */}
            <Textarea
              placeholder="Observação (opcional)..."
              value={item.notes}
              onChange={(e) => setNotes(item.id, e.target.value)}
              className="min-h-[60px] text-sm rounded-xl resize-none"
            />
          </div>
        </div>
      ))}
    </div>
  );
};
