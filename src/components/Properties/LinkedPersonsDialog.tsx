import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const personSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  type: z.enum(["fiador", "procurador", "proprietario", "outro"], {
    required_error: "Tipo é obrigatório",
  }),
  phone: z.string().min(1, "Telefone é obrigatório").max(20, "Telefone muito longo"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  document: z.string().max(20, "Documento muito longo").optional(),
  notes: z.string().max(500, "Observações muito longas").optional(),
});

type PersonFormData = z.infer<typeof personSchema>;

interface LinkedPerson extends PersonFormData {
  id: string;
  created_at: string;
}

interface LinkedPersonsDialogProps {
  propertyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const personTypeLabels = {
  fiador: "Fiador",
  procurador: "Procurador",
  proprietario: "Proprietário",
  outro: "Outro",
};

export function LinkedPersonsDialog({ propertyId, open, onOpenChange }: LinkedPersonsDialogProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<PersonFormData>({
    resolver: zodResolver(personSchema),
  });

  const { data: property } = useQuery({
    queryKey: ["property-linked-persons", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("linked_persons")
        .eq("id", propertyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const linkedPersons: LinkedPerson[] = (property?.linked_persons as unknown as LinkedPerson[]) || [];

  const addPersonMutation = useMutation({
    mutationFn: async (data: PersonFormData) => {
      const newPerson: LinkedPerson = {
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };

      const updatedPersons = [...linkedPersons, newPerson];

      const { error } = await supabase
        .from("properties")
        .update({ linked_persons: updatedPersons as any })
        .eq("id", propertyId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pessoa vinculada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["property-linked-persons", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
      reset();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao vincular pessoa: ${error.message}`);
    },
  });

  const removePersonMutation = useMutation({
    mutationFn: async (personId: string) => {
      const updatedPersons = linkedPersons.filter((p) => p.id !== personId);

      const { error } = await supabase
        .from("properties")
        .update({ linked_persons: updatedPersons as any })
        .eq("id", propertyId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pessoa removida com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["property-linked-persons", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover pessoa: ${error.message}`);
    },
  });

  const onSubmit = (data: PersonFormData) => {
    addPersonMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vincular Pessoas ao Imóvel</DialogTitle>
        </DialogHeader>

        {linkedPersons.length > 0 && (
          <div className="space-y-2 mb-6">
            <h3 className="text-sm font-medium">Pessoas Vinculadas</h3>
            <div className="space-y-2">
              {linkedPersons.map((person) => (
                <Card key={person.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{person.name}</p>
                          <Badge variant="secondary">
                            {personTypeLabels[person.type]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{person.phone}</p>
                        {person.email && (
                          <p className="text-sm text-muted-foreground">{person.email}</p>
                        )}
                        {person.document && (
                          <p className="text-sm text-muted-foreground">CPF/CNPJ: {person.document}</p>
                        )}
                        {person.notes && (
                          <p className="text-sm text-muted-foreground italic">{person.notes}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePersonMutation.mutate(person.id)}
                        disabled={removePersonMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Adicionar Nova Pessoa
          </h3>

          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              placeholder="Nome completo"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo *</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fiador">Fiador</SelectItem>
                    <SelectItem value="procurador">Procurador</SelectItem>
                    <SelectItem value="proprietario">Proprietário</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && (
              <p className="text-sm text-destructive">{errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone *</Label>
            <Input
              id="phone"
              placeholder="(00) 00000-0000"
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@exemplo.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="document">CPF/CNPJ</Label>
            <Input
              id="document"
              placeholder="000.000.000-00"
              {...register("document")}
            />
            {errors.document && (
              <p className="text-sm text-destructive">{errors.document.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Observações sobre esta pessoa..."
              rows={3}
              {...register("notes")}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={addPersonMutation.isPending}
            >
              Fechar
            </Button>
            <Button type="submit" disabled={addPersonMutation.isPending}>
              {addPersonMutation.isPending ? "Adicionando..." : "Adicionar Pessoa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
