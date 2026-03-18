import { Card, CardContent } from "@/components/ui/card";
import { Filter, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

interface CommercialCardProps {
  leads: number;
  scheduledVisits: number;
  proposals: number;
}

export const CommercialCard = ({ leads, scheduledVisits, proposals }: CommercialCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className="flex flex-col justify-between">
      <CardContent className="p-5 flex flex-col justify-between h-full">
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-semibold text-foreground">Comercial</h3>
          <div className="rounded-lg bg-muted p-2 text-muted-foreground">
            <Filter className="h-5 w-5" />
          </div>
        </div>

        <div className="space-y-4 flex-1">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Leads</span>
              <span className="text-sm font-semibold">{leads}</span>
            </div>
            <Progress value={leads > 0 ? Math.min(leads * 10, 100) : 0} className="h-2" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Visitas agendadas</span>
              <span className="text-sm font-semibold">{scheduledVisits}</span>
            </div>
            <Progress value={scheduledVisits > 0 ? Math.min(scheduledVisits * 10, 100) : 0} className="h-2" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Propostas recebidas</span>
              <span className="text-sm font-semibold">{proposals}</span>
            </div>
            <Progress value={proposals > 0 ? Math.min(proposals * 10, 100) : 0} className="h-2" />
          </div>
        </div>

        <Button 
          variant="link" 
          className="text-info p-0 h-auto mt-3 self-center text-xs"
          onClick={() => navigate("/contatos")}
        >
          Consultar leads
          <ChevronRight className="ml-0.5 h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
};
