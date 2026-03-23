import { ContractHistoryEntry, useContractHistory } from "@/hooks/useContractHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Edit,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Receipt,
  Upload,
  Plus,
  ArrowRightLeft,
  DollarSign,
  Calendar,
  RefreshCw,
  History,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  contractId: string;
}

interface EventConfig {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  dotClass: string;
  badgeLabel: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
}

const EVENT_CONFIG: Record<string, EventConfig> = {
  contract_created: {
    icon: FileText,
    iconClass: "text-emerald-600",
    dotClass: "bg-emerald-500",
    badgeLabel: "Criação",
    badgeVariant: "default",
  },
  contract_updated: {
    icon: Edit,
    iconClass: "text-blue-600",
    dotClass: "bg-blue-500",
    badgeLabel: "Atualização",
    badgeVariant: "secondary",
  },
  contract_status_changed: {
    icon: ArrowRightLeft,
    iconClass: "text-purple-600",
    dotClass: "bg-purple-500",
    badgeLabel: "Status",
    badgeVariant: "secondary",
  },
  contract_value_changed: {
    icon: DollarSign,
    iconClass: "text-orange-600",
    dotClass: "bg-orange-500",
    badgeLabel: "Valor",
    badgeVariant: "secondary",
  },
  contract_date_changed: {
    icon: Calendar,
    iconClass: "text-indigo-600",
    dotClass: "bg-indigo-500",
    badgeLabel: "Data",
    badgeVariant: "secondary",
  },
  invoice_generated: {
    icon: Receipt,
    iconClass: "text-cyan-600",
    dotClass: "bg-cyan-500",
    badgeLabel: "Fatura gerada",
    badgeVariant: "outline",
  },
  invoice_paid: {
    icon: CheckCircle2,
    iconClass: "text-emerald-600",
    dotClass: "bg-emerald-500",
    badgeLabel: "Pagamento",
    badgeVariant: "default",
  },
  invoice_overdue: {
    icon: AlertTriangle,
    iconClass: "text-red-500",
    dotClass: "bg-red-500",
    badgeLabel: "Em atraso",
    badgeVariant: "destructive",
  },
  invoice_cancelled: {
    icon: XCircle,
    iconClass: "text-slate-500",
    dotClass: "bg-slate-400",
    badgeLabel: "Cancelado",
    badgeVariant: "secondary",
  },
  invoice_status_changed: {
    icon: RefreshCw,
    iconClass: "text-blue-500",
    dotClass: "bg-blue-400",
    badgeLabel: "Fatura",
    badgeVariant: "secondary",
  },
  document_uploaded: {
    icon: Upload,
    iconClass: "text-blue-600",
    dotClass: "bg-blue-500",
    badgeLabel: "Documento",
    badgeVariant: "secondary",
  },
  extra_charge_added: {
    icon: Plus,
    iconClass: "text-orange-600",
    dotClass: "bg-orange-500",
    badgeLabel: "Cobrança extra",
    badgeVariant: "secondary",
  },
};

const DEFAULT_CONFIG: EventConfig = {
  icon: History,
  iconClass: "text-slate-500",
  dotClass: "bg-slate-400",
  badgeLabel: "Evento",
  badgeVariant: "secondary",
};

const formatDate = (iso: string) =>
  format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

const MetadataDetail = ({ metadata }: { metadata: Record<string, unknown> }) => {
  const entries = Object.entries(metadata).filter(
    ([k]) => !["invoice_id", "account_id", "user_id"].includes(k)
  );
  if (entries.length === 0) return null;

  return (
    <div className="mt-2 rounded-md border bg-muted/40 p-2 text-xs space-y-1">
      {entries.map(([key, value]) => {
        if (value !== null && typeof value === "object" && !Array.isArray(value)) {
          const v = value as Record<string, unknown>;
          if ("de" in v && "para" in v) {
            return (
              <div key={key} className="flex flex-wrap gap-1 items-center">
                <span className="text-muted-foreground capitalize">
                  {key.replace(/_/g, " ")}:
                </span>
                <span className="line-through text-muted-foreground">{String(v.de ?? "—")}</span>
                <span>→</span>
                <span className="font-medium">{String(v.para ?? "—")}</span>
              </div>
            );
          }
        }
        return (
          <div key={key} className="flex gap-1">
            <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>
            <span className="font-medium truncate">{String(value ?? "—")}</span>
          </div>
        );
      })}
    </div>
  );
};

const TimelineItem = ({
  entry,
  isLast,
}: {
  entry: ContractHistoryEntry;
  isLast: boolean;
}) => {
  const config = EVENT_CONFIG[entry.event_type] ?? DEFAULT_CONFIG;
  const Icon = config.icon;

  return (
    <div className="flex gap-4">
      {/* Dot + line */}
      <div className="flex flex-col items-center">
        <div className={`mt-1 h-3 w-3 rounded-full ring-2 ring-background ${config.dotClass} shrink-0`} />
        {!isLast && <div className="mt-1 w-px flex-1 bg-border" />}
      </div>

      {/* Content */}
      <div className={`pb-6 flex-1 ${isLast ? "" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 shrink-0 ${config.iconClass}`} />
            <p className="text-sm font-medium">{entry.description}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={config.badgeVariant} className="text-[10px] px-1.5 py-0">
              {config.badgeLabel}
            </Badge>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDate(entry.created_at)}
            </span>
          </div>
        </div>
        <MetadataDetail metadata={entry.metadata} />
      </div>
    </div>
  );
};

export const ContractHistoryTimeline = ({ contractId }: Props) => {
  const { data: entries, isLoading } = useContractHistory(contractId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-5 w-5 text-muted-foreground" />
          Histórico do Contrato
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-3 w-3 rounded-full mt-1 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : !entries || entries.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            Nenhum evento registrado ainda.
          </p>
        ) : (
          <div>
            {entries.map((entry, idx) => (
              <TimelineItem
                key={entry.id}
                entry={entry}
                isLast={idx === entries.length - 1}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
