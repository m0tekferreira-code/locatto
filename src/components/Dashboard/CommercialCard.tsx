import { Card, CardContent } from "@/components/ui/card";
import { Filter, ChevronRight, Users, CalendarDays, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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

        <div className="space-y-3 flex-1">
          <div className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Leads</span>
            </div>
            <span className="text-xl font-bold">{leads}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Visitas agendadas</span>
            </div>
            <span className="text-xl font-bold">{scheduledVisits}</span>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Propostas recebidas</span>
            </div>
            <span className="text-xl font-bold">{proposals}</span>
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
