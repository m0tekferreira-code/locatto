import { useRef, useEffect, useState } from "react";
import { Eraser } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InspectionData } from "@/pages/Inspections/InspectionWizard";

interface Props {
  data: InspectionData;
  setData: React.Dispatch<React.SetStateAction<InspectionData>>;
}

interface SignaturePadProps {
  label: string;
  value: string | null;
  onChange: (sig: string | null) => void;
}

const SignaturePad = ({ label, value, onChange }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "hsl(var(--foreground))";

    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasStrokes(true);
      };
      img.src = value;
    }
  }, []);

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasStrokes(true);
  };

  const endDraw = () => {
    setIsDrawing(false);
    if (hasStrokes || canvasRef.current) {
      const dataUrl = canvasRef.current?.toDataURL("image/png") || null;
      onChange(dataUrl);
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasStrokes(false);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-foreground">{label}</p>
        <button
          onClick={clear}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive transition-colors px-2 py-1"
        >
          <Eraser className="h-4 w-4" />
          Limpar
        </button>
      </div>
      <div
        className={cn(
          "rounded-xl border-2 overflow-hidden bg-white touch-none",
          hasStrokes ? "border-primary" : "border-border"
        )}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-40 cursor-crosshair"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      {!hasStrokes && (
        <p className="text-xs text-muted-foreground text-center">Desenhe a assinatura acima</p>
      )}
    </div>
  );
};

export const StepSignature = ({ data, setData }: Props) => {
  return (
    <div className="space-y-6">
      <SignaturePad
        label="Assinatura do Locatário"
        value={data.tenantSignature}
        onChange={(sig) => setData((prev) => ({ ...prev, tenantSignature: sig }))}
      />
      <SignaturePad
        label="Assinatura do Vistoriador"
        value={data.inspectorSignature}
        onChange={(sig) => setData((prev) => ({ ...prev, inspectorSignature: sig }))}
      />
    </div>
  );
};
