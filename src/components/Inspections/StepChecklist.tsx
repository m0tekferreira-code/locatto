import { useState } from "react";
import { ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InspectionData, InspectionItem } from "@/pages/Inspections/InspectionWizard";

interface Props {
  data: InspectionData;
  setData: React.Dispatch<React.SetStateAction<InspectionData>>;
}

export const StepChecklist = ({ data, setData }: Props) => {
  const rooms = [...new Set(data.items.map((i) => i.room))];
  const [expandedRoom, setExpandedRoom] = useState<string>(rooms[0] || "");

  const setStatus = (id: string, status: InspectionItem["status"]) => {
    setData((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === id ? { ...i, status } : i)),
    }));
  };

  const roomProgress = (room: string) => {
    const roomItems = data.items.filter((i) => i.room === room);
    const done = roomItems.filter((i) => i.status !== null).length;
    return { done, total: roomItems.length };
  };

  return (
    <div className="space-y-3">
      {rooms.map((room) => {
        const { done, total } = roomProgress(room);
        const isExpanded = expandedRoom === room;
        const roomItems = data.items.filter((i) => i.room === room);
        const allDone = done === total;

        return (
          <div key={room} className="rounded-xl border-2 border-border overflow-hidden bg-card">
            <button
              onClick={() => setExpandedRoom(isExpanded ? "" : room)}
              className="w-full flex items-center justify-between p-4 active:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                    allDone ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                  )}
                >
                  {done}/{total}
                </div>
                <span className="font-semibold text-foreground">{room}</span>
              </div>
              <ChevronDown
                className={cn("h-5 w-5 text-muted-foreground transition-transform", isExpanded && "rotate-180")}
              />
            </button>

            {isExpanded && (
              <div className="border-t border-border">
                {roomItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0"
                  >
                    <span className="text-sm font-medium text-foreground">{item.item}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setStatus(item.id, "conforme")}
                        className={cn(
                          "flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95",
                          item.status === "conforme"
                            ? "bg-green-600 text-white"
                            : "bg-green-50 text-green-700 border border-green-200"
                        )}
                      >
                        <Check className="h-4 w-4" />
                        <span className="hidden sm:inline">OK</span>
                      </button>
                      <button
                        onClick={() => setStatus(item.id, "nao_conforme")}
                        className={cn(
                          "flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95",
                          item.status === "nao_conforme"
                            ? "bg-destructive text-white"
                            : "bg-red-50 text-red-700 border border-red-200"
                        )}
                      >
                        <X className="h-4 w-4" />
                        <span className="hidden sm:inline">NC</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
