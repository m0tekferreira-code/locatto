import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, Phone, Mail, User, Home, AlertCircle, Settings, Save } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppLayout } from "@/components/Layout/AppLayout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ScheduledVisit {
  id: string;
  property_id: string;
  visitor_name: string;
  visitor_phone: string;
  visitor_email: string;
  visit_date: string;
  visit_time: string;
  status: string;
  notes: string;
  created_by: string;
  created_at: string;
  properties: {
    name: string;
    address: string;
    city: string;
    state: string;
  };
}

const ScheduledVisits = () => {
  const [visits, setVisits] = useState<ScheduledVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [calendarUrl, setCalendarUrl] = useState("");
  const [tempCalendarUrl, setTempCalendarUrl] = useState("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchVisits();
      fetchCalendarConfig();
    }
  }, [user]);

  const fetchCalendarConfig = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("google_calendar_embed_url")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data && (data as any).google_calendar_embed_url) {
        const url = (data as any).google_calendar_embed_url;
        setCalendarUrl(url);
        setTempCalendarUrl(url);
      }
    } catch (error) {
      console.error("Error fetching calendar config:", error);
    }
  };

  const saveCalendarConfig = async () => {
    if (!user) return;

    setSavingConfig(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ google_calendar_embed_url: tempCalendarUrl } as any)
        .eq("id", user.id);

      if (error) throw error;

      setCalendarUrl(tempCalendarUrl);
      setIsConfigOpen(false);

      toast({
        title: "Configuração salva",
        description: "A URL da sua agenda foi atualizada com sucesso.",
      });
    } catch (error) {
      console.error("Error saving calendar config:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a configuração.",
        variant: "destructive",
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const fetchVisits = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("scheduled_visits")
        .select(`
          *,
          properties:property_id (
            name,
            address,
            city,
            state
          )
        `)
        
        .order("visit_date", { ascending: true })
        .order("visit_time", { ascending: true });

      if (error) throw error;

      setVisits(data || []);
    } catch (error) {
      console.error("Error fetching visits:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as visitas agendadas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateVisitStatus = async (visitId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("scheduled_visits")
        .update({ status: newStatus })
        .eq("id", visitId);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: "O status da visita foi atualizado com sucesso.",
      });

      fetchVisits();
    } catch (error) {
      console.error("Error updating visit status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status da visita.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      scheduled: { label: "Agendada", variant: "default" },
      confirmed: { label: "Confirmada", variant: "secondary" },
      completed: { label: "Realizada", variant: "outline" },
      cancelled: { label: "Cancelada", variant: "destructive" },
    };

    const config = statusConfig[status] || statusConfig.scheduled;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredVisits = visits.filter((visit) => {
    if (filter === "all") return true;
    return visit.status === filter;
  });

  const upcomingVisits = filteredVisits.filter(
    (visit) => new Date(`${visit.visit_date} ${visit.visit_time}`) > new Date() && visit.status !== "cancelled"
  );

  const pastVisits = filteredVisits.filter(
    (visit) => new Date(`${visit.visit_date} ${visit.visit_time}`) <= new Date() || visit.status === "cancelled"
  );

  return (
    <AppLayout title="Visitas Agendadas">
      <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Visitas Agendadas</h1>
                <p className="text-muted-foreground">
                  Gerencie as visitas aos seus imóveis agendadas pelo agente
                </p>
              </div>
              <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Settings className="mr-2 h-4 w-4" />
                    Configurar Agenda
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Integrar Agenda Google</DialogTitle>
                    <DialogDescription>
                      Cole o link de incorporação da sua agenda do Google Calendar.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="calendar-url">URL do Google Calendar</Label>
                      <Input
                        id="calendar-url"
                        placeholder="https://calendar.google.com/calendar/embed?src=..."
                        value={tempCalendarUrl}
                        onChange={(e) => setTempCalendarUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Para obter a URL, abra o Google Calendar, vá em Configurações {">"} Configurações da sua agenda {">"} Integrar agenda {">"} copie o código iframe ou apenas a URL.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTempCalendarUrl(calendarUrl);
                        setIsConfigOpen(false);
                      }}
                      disabled={savingConfig}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={saveCalendarConfig} disabled={savingConfig}>
                      <Save className="mr-2 h-4 w-4" />
                      {savingConfig ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {calendarUrl && (
              <Card>
                <CardHeader>
                  <CardTitle>Minha Agenda</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full overflow-hidden rounded-lg border">
                    <iframe
                      src={calendarUrl}
                      style={{ border: 0 }}
                      width="100%"
                      height="600"
                      frameBorder="0"
                      scrolling="no"
                      title="Google Calendar"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Filtrar Visitas</CardTitle>
                <CardDescription>Visualize visitas por status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={filter === "all" ? "default" : "outline"}
                    onClick={() => setFilter("all")}
                  >
                    Todas
                  </Button>
                  <Button
                    variant={filter === "scheduled" ? "default" : "outline"}
                    onClick={() => setFilter("scheduled")}
                  >
                    Agendadas
                  </Button>
                  <Button
                    variant={filter === "confirmed" ? "default" : "outline"}
                    onClick={() => setFilter("confirmed")}
                  >
                    Confirmadas
                  </Button>
                  <Button
                    variant={filter === "completed" ? "default" : "outline"}
                    onClick={() => setFilter("completed")}
                  >
                    Realizadas
                  </Button>
                  <Button
                    variant={filter === "cancelled" ? "default" : "outline"}
                    onClick={() => setFilter("cancelled")}
                  >
                    Canceladas
                  </Button>
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <div className="text-center py-12">Carregando visitas...</div>
            ) : (
              <>
                {upcomingVisits.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-semibold">Próximas Visitas</h2>
                    <div className="grid gap-4">
                      {upcomingVisits.map((visit) => (
                        <Card key={visit.id}>
                          <CardContent className="pt-6">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                              <div className="flex-1 space-y-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                      <Home className="h-5 w-5" />
                                      {visit.properties.name}
                                    </h3>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                      <MapPin className="h-4 w-4" />
                                      {visit.properties.address}, {visit.properties.city} - {visit.properties.state}
                                    </p>
                                  </div>
                                  {getStatusBadge(visit.status)}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span>{visit.visitor_name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{visit.visitor_phone}</span>
                                  </div>
                                  {visit.visitor_email && (
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-4 w-4 text-muted-foreground" />
                                      <span>{visit.visitor_email}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span>{format(new Date(visit.visit_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span>{visit.visit_time}</span>
                                  </div>
                                </div>

                                {visit.notes && (
                                  <div className="flex items-start gap-2 text-sm bg-muted p-3 rounded-md">
                                    <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                                    <span>{visit.notes}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col gap-2 min-w-[140px]">
                                {visit.status === "scheduled" && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateVisitStatus(visit.id, "confirmed")}
                                  >
                                    Confirmar
                                  </Button>
                                )}
                                {(visit.status === "scheduled" || visit.status === "confirmed") && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateVisitStatus(visit.id, "completed")}
                                    >
                                      Marcar como Realizada
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => updateVisitStatus(visit.id, "cancelled")}
                                    >
                                      Cancelar
                                    </Button>
                                  </>
                                )}
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => navigate(`/imoveis/${visit.property_id}`)}
                                >
                                  Ver Imóvel
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {pastVisits.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-semibold">Visitas Anteriores</h2>
                    <div className="grid gap-4">
                      {pastVisits.map((visit) => (
                        <Card key={visit.id} className="opacity-75">
                          <CardContent className="pt-6">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                              <div className="flex-1 space-y-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                      <Home className="h-5 w-5" />
                                      {visit.properties.name}
                                    </h3>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                      <MapPin className="h-4 w-4" />
                                      {visit.properties.address}, {visit.properties.city} - {visit.properties.state}
                                    </p>
                                  </div>
                                  {getStatusBadge(visit.status)}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span>{visit.visitor_name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{visit.visitor_phone}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span>{format(new Date(visit.visit_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span>{visit.visit_time}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col gap-2 min-w-[140px]">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => navigate(`/imoveis/${visit.property_id}`)}
                                >
                                  Ver Imóvel
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {filteredVisits.length === 0 && (
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhuma visita agendada encontrada.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
      </div>
    </AppLayout>
  );
};

export default ScheduledVisits;