import * as React from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, X, ChevronDown } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export type DateFilterField = "due_date" | "reference_month" | "payment_date";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  dateField: DateFilterField;
  onDateFieldChange: (field: DateFilterField) => void;
  className?: string;
}

const FIELD_LABELS: Record<DateFilterField, string> = {
  due_date: "Dt. Vencimento",
  reference_month: "Dt. Competência",
  payment_date: "Dt. Pagamento",
};

type PresetKey =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "last7Days"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "lastYear";

const PRESET_GROUPS: { label: string; items: { key: PresetKey; label: string }[] }[] = [
  {
    label: "Dias",
    items: [
      { key: "today", label: "Hoje" },
      { key: "yesterday", label: "Ontem" },
      { key: "last7Days", label: "Últimos 7 dias" },
    ],
  },
  {
    label: "Semanas",
    items: [
      { key: "thisWeek", label: "Esta semana" },
      { key: "lastWeek", label: "Semana passada" },
    ],
  },
  {
    label: "Meses",
    items: [
      { key: "thisMonth", label: "Este mês" },
      { key: "lastMonth", label: "Mês passado" },
    ],
  },
  {
    label: "Anos",
    items: [
      { key: "thisYear", label: "Este ano" },
      { key: "lastYear", label: "Ano passado" },
    ],
  },
];

function getPresetRange(preset: PresetKey): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = subDays(today, 1);
      return { from: y, to: y };
    }
    case "thisWeek":
      return { from: startOfWeek(today, { locale: ptBR }), to: endOfWeek(today, { locale: ptBR }) };
    case "lastWeek": {
      const s = startOfWeek(subWeeks(today, 1), { locale: ptBR });
      return { from: s, to: endOfWeek(s, { locale: ptBR }) };
    }
    case "last7Days":
      return { from: subDays(today, 6), to: today };
    case "thisMonth":
      return { from: startOfMonth(today), to: endOfMonth(today) };
    case "lastMonth": {
      const s = startOfMonth(subMonths(today, 1));
      return { from: s, to: endOfMonth(s) };
    }
    case "thisYear":
      return { from: startOfYear(today), to: endOfYear(today) };
    case "lastYear": {
      const s = startOfYear(subYears(today, 1));
      return { from: s, to: endOfYear(s) };
    }
    default:
      return { from: today, to: today };
  }
}

function isPresetActive(preset: PresetKey, dateRange: DateRange | undefined): boolean {
  if (!dateRange?.from) return false;
  const range = getPresetRange(preset);
  return (
    isSameDay(range.from, dateRange.from) &&
    !!range.to && !!dateRange.to && isSameDay(range.to, dateRange.to)
  );
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  dateField,
  onDateFieldChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handlePresetClick = (preset: PresetKey) => {
    onDateRangeChange(getPresetRange(preset));
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDateRangeChange(undefined);
    setOpen(false);
  };

  const formatDateRange = () => {
    if (!dateRange?.from) return null;
    if (!dateRange.to || isSameDay(dateRange.from, dateRange.to))
      return format(dateRange.from, "dd/MM/yyyy", { locale: ptBR });
    return `${format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} – ${format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}`;
  };

  const hasValue = !!dateRange?.from;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {/* Date Field Selector */}
      <Select value={dateField} onValueChange={(value) => onDateFieldChange(value as DateFilterField)}>
        <SelectTrigger className="w-[150px] h-9 text-sm">
          <SelectValue placeholder="Tipo de data" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="due_date">{FIELD_LABELS.due_date}</SelectItem>
          <SelectItem value="reference_month">{FIELD_LABELS.reference_month}</SelectItem>
          <SelectItem value="payment_date">{FIELD_LABELS.payment_date}</SelectItem>
        </SelectContent>
      </Select>

      {/* Date Range Picker */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "h-9 justify-start text-left font-normal gap-2 min-w-[200px]",
              hasValue
                ? "border-primary/60 bg-primary/5 text-foreground"
                : "text-muted-foreground"
            )}
          >
            <CalendarIcon className={cn("h-4 w-4 shrink-0", hasValue ? "text-primary" : "text-muted-foreground")} />
            <span className="flex-1 truncate text-sm">
              {formatDateRange() || "Selecione o período"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0 shadow-lg border" align="start">
          <div className="flex divide-x">
            {/* Presets Panel */}
            <div className="w-44 py-3 flex flex-col gap-0.5">
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Atalhos
              </p>
              {PRESET_GROUPS.map((group, gi) => (
                <React.Fragment key={group.label}>
                  {gi > 0 && <Separator className="my-1 mx-3" />}
                  <div className="px-2 space-y-0.5">
                    <p className="px-1 text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wide">
                      {group.label}
                    </p>
                    {group.items.map((preset) => {
                      const active = isPresetActive(preset.key, dateRange);
                      return (
                        <button
                          key={preset.key}
                          onClick={() => handlePresetClick(preset.key)}
                          className={cn(
                            "w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors",
                            active
                              ? "bg-primary text-primary-foreground font-medium"
                              : "hover:bg-muted text-foreground"
                          )}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </React.Fragment>
              ))}
            </div>

            {/* Calendar Panel */}
            <div className="flex flex-col">
              <div className="p-3">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={onDateRangeChange}
                  numberOfMonths={2}
                  locale={ptBR}
                  className="rounded-none"
                />
              </div>

              {/* Footer */}
              <div className="border-t px-4 py-2.5 flex items-center justify-between bg-muted/30">
                <span className="text-xs text-muted-foreground">
                  {hasValue ? formatDateRange() : "Selecione uma data ou período"}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleClear}
                    disabled={!hasValue}
                  >
                    Limpar
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setOpen(false)}
                    disabled={!hasValue}
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Inline Clear */}
      {hasValue && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-destructive"
          onClick={handleClear}
          title="Limpar filtro de data"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
