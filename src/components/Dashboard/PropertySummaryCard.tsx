import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PropertySummaryCardProps {
  unavailable: number;
  contracted: number;
  available: number;
  announced?: number;
}

export const PropertySummaryCard = ({ unavailable, contracted, available, announced = 0 }: PropertySummaryCardProps) => {
  const navigate = useNavigate();
  const total = unavailable + contracted + available;
  const contractedPercentage = total > 0 ? (contracted / total) * 100 : 0;
  const availablePercentage = total > 0 ? (available / total) * 100 : 0;
  const unavailablePercentage = total > 0 ? (unavailable / total) * 100 : 0;

  return (
    <Card className="flex flex-col justify-between">
      <CardContent className="p-5 flex flex-col justify-between h-full">
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-semibold text-foreground">Imóveis</h3>
          <div className="rounded-lg bg-muted p-2 text-info">
            <Home className="h-5 w-5" />
          </div>
        </div>

        <div className="flex gap-6 flex-1">
          {/* Donut chart */}
          <div className="flex items-center justify-center">
            <div className="relative h-28 w-28">
              <svg className="h-28 w-28 -rotate-90" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="70" fill="none" stroke="hsl(var(--border))" strokeWidth="20" />
                <circle cx="80" cy="80" r="70" fill="none" stroke="hsl(var(--info))" strokeWidth="20"
                  strokeDasharray={`${(contractedPercentage / 100) * 440} 440`} strokeDashoffset="0" />
                <circle cx="80" cy="80" r="70" fill="none" stroke="hsl(var(--success))" strokeWidth="20"
                  strokeDasharray={`${(availablePercentage / 100) * 440} 440`}
                  strokeDashoffset={`${-(contractedPercentage / 100) * 440}`} />
                <circle cx="80" cy="80" r="70" fill="none" stroke="hsl(var(--destructive))" strokeWidth="20"
                  strokeDasharray={`${(unavailablePercentage / 100) * 440} 440`}
                  strokeDashoffset={`${-((contractedPercentage + availablePercentage) / 100) * 440}`} />
              </svg>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive" />
                <span className="text-xs text-muted-foreground">Indisponíveis</span>
              </div>
              <span className="text-sm font-bold">{unavailable}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-info" />
                <span className="text-xs text-muted-foreground">Contratados</span>
              </div>
              <span className="text-sm font-bold">{contracted}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-success" />
                <span className="text-xs text-muted-foreground">Anunciados</span>
              </div>
              <span className="text-sm font-bold">{announced}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <span className="text-sm text-muted-foreground">Total de imóveis</span>
          <span className="text-lg font-bold">{total}</span>
        </div>

        <Button
          variant="link"
          className="text-info p-0 h-auto mt-2 self-center text-xs"
          onClick={() => navigate("/imoveis")}
        >
          Consultar imóveis
          <ChevronRight className="ml-0.5 h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
};
