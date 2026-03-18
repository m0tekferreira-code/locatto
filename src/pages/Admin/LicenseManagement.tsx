import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  full_name: string | null;
  data_expiracao: string | null;
}

const LicenseManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, data_expiracao')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar usuários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLicense = async () => {
    if (!selectedUserId) {
      toast({
        title: "Erro",
        description: "Selecione um usuário",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { error } = await supabase.functions.invoke('admin-update-license', {
        body: {
          user_id: selectedUserId,
          expiration_date: selectedDate ? selectedDate.toISOString() : null,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Licença atualizada com sucesso",
      });

      await loadUsers();
      setSelectedUserId("");
      setSelectedDate(undefined);
    } catch (error) {
      console.error('Error updating license:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar licença",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleExtend30Days = async (userId: string) => {
    setUpdating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const user = users.find(u => u.id === userId);
      const currentDate = user?.data_expiracao 
        ? new Date(user.data_expiracao) 
        : new Date();
      
      const baseDate = currentDate > new Date() ? currentDate : new Date();
      const newDate = new Date(baseDate);
      newDate.setDate(newDate.getDate() + 30);

      const { error } = await supabase.functions.invoke('admin-update-license', {
        body: {
          user_id: userId,
          expiration_date: newDate.toISOString(),
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Licença estendida por 30 dias",
      });

      await loadUsers();
    } catch (error) {
      console.error('Error extending license:', error);
      toast({
        title: "Erro",
        description: "Falha ao estender licença",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gerenciamento de Licenças</h1>
        <p className="text-muted-foreground">Gerencie as licenças dos usuários do sistema</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Atualizar Licença</CardTitle>
            <CardDescription>
              Defina uma nova data de expiração para um usuário
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-select">Usuário</Label>
              <select
                id="user-select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Selecione um usuário</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || 'Sem nome'} - {user.data_expiracao 
                      ? format(new Date(user.data_expiracao), "dd/MM/yyyy", { locale: ptBR })
                      : 'Sem licença'}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Nova Data de Expiração</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleUpdateLicense} 
                disabled={updating || !selectedUserId}
                className="flex-1"
              >
                {updating ? "Atualizando..." : "Atualizar Licença"}
              </Button>
              <Button 
                onClick={() => {
                  setSelectedDate(undefined);
                  if (selectedUserId) handleUpdateLicense();
                }}
                disabled={updating || !selectedUserId}
                variant="destructive"
              >
                Revogar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuários</CardTitle>
            <CardDescription>
              Todos os usuários e suas licenças
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {users.map((user) => {
                const isExpired = user.data_expiracao 
                  ? new Date(user.data_expiracao) < new Date()
                  : true;
                
                return (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{user.full_name || 'Sem nome'}</p>
                      <p className={cn(
                        "text-sm",
                        isExpired ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {user.data_expiracao 
                          ? format(new Date(user.data_expiracao), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : 'Sem licença'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleExtend30Days(user.id)}
                      disabled={updating}
                    >
                      +30 dias
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LicenseManagement;
