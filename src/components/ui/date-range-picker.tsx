import * as React from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "lucide-react";
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

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "thisWeek", label: "Esta semana" },
  { key: "lastWeek", label: "Semana Passada" },
  { key: "last7Days", label: "Últimos 7 Dias" },
  { key: "thisMonth", label: "Este Mês" },
  { key: "lastMonth", label: "Mês Passado" },
  { key: "thisYear", label: "Este Ano" },
  { key: "lastYear", label: "Ano Passado" },
];

function getPresetRange(preset: PresetKey): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const yesterday = subDays(today, 1);
      return { from: yesterday, to: yesterday };
    }
    case "thisWeek":
      return { from: startOfWeek(today, { locale: ptBR }), to: endOfWeek(today, { locale: ptBR }) };
    case "lastWeek": {
      const lastWeekStart = startOfWeek(subWeeks(today, 1), { locale: ptBR });
      return { from: lastWeekStart, to: endOfWeek(lastWeekStart, { locale: ptBR }) };
    }
    case "last7Days":
      return { from: subDays(today, 6), to: today };
    case "thisMonth":
      return { from: startOfMonth(today), to: endOfMonth(today) };
    case "lastMonth": {
      const lastMonthStart = startOfMonth(subMonths(today, 1));
      return { from: lastMonthStart, to: endOfMonth(lastMonthStart) };
    }
    case "thisYear":
      return { from: startOfYear(today), to: endOfYear(today) };
    case "lastYear": {
      const lastYearStart = startOfYear(subYears(today, 1));
      return { from: lastYearStart, to: endOfYear(lastYearStart) };
    }
    default:
      return { from: today, to: today };
  }
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
  };

  const formatDateRange = () => {
    if (!dateRange?.from) return null;
    if (!dateRange.to) return format(dateRange.from, "dd/MM/yyyy", { locale: ptBR });
    return `${format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -- ${format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}`;
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Date Field Selector */}
      <Select value={dateField} onValueChange={(value) => onDateFieldChange(value as DateFilterField)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Filtro por data" />
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
              "w-[260px] justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateRange() || "Selecione o período"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Presets */}
            <div className="border-r p-3 space-y-1">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.key}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start font-normal"
                  onClick={() => handlePresetClick(preset.key)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            
            {/* Calendar */}
            <div className="p-3">
              {/* Month/Year selectors */}
              <div className="flex gap-4 mb-2 justify-center">
                <MonthYearSelector
                  date={dateRange?.from || new Date()}
                  onChange={(date) => {
                    onDateRangeChange({
                      from: date,
                      to: dateRange?.to,
                    });
                  }}
                />
                <MonthYearSelector
                  date={dateRange?.to || new Date()}
                  onChange={(date) => {
                    onDateRangeChange({
                      from: dateRange?.from,
                      to: date,
                    });
                  }}
                />
              </div>
              
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={onDateRangeChange}
                numberOfMonths={2}
                locale={ptBR}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear Button */}
      {dateRange && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// Month/Year selector component
function MonthYearSelector({ 
  date, 
  onChange 
}: { 
  date: Date; 
  onChange: (date: Date) => void;
}) {
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  return (
    <div className="flex gap-1">
      <Select 
        value={date.getMonth().toString()} 
        onValueChange={(value) => {
          const newDate = new Date(date);
          newDate.setMonth(parseInt(value));
          onChange(newDate);
        }}
      >
        <SelectTrigger className="w-[110px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((month, index) => (
            <SelectItem key={index} value={index.toString()}>
              {month}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select 
        value={date.getFullYear().toString()} 
        onValueChange={(value) => {
          const newDate = new Date(date);
          newDate.setFullYear(parseInt(value));
          onChange(newDate);
        }}
      >
        <SelectTrigger className="w-[80px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
