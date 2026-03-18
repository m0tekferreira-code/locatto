import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

const visitSchema = z.object({
  visitor_name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  visitor_phone: z.string().min(1, "Telefone é obrigatório").max(20, "Telefone muito longo"),
  visitor_email: z.string().email("Email inválido").optional().or(z.literal("")),
  visit_date: z.date({ required_error: "Data é obrigatória" }),
  visit_time: z.string().min(1, "Hora é obrigatória").regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)"),
  notes: z.string().max(500, "Observações muito longas").optional(),
});

type VisitFormData = z.infer<typeof visitSchema>;

interface ScheduleVisitDialogProps {
  propertyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScheduleVisitDialog({ propertyId, open, onOpenChange }: ScheduleVisitDialogProps) {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<VisitFormData>({
    resolver: zodResolver(visitSchema),
  });

  const createVisitMutation = useMutation({
    mutationFn: async (data: VisitFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("scheduled_visits").insert({
        property_id: propertyId,
        user_id: user.id,
        visitor_name: data.visitor_name,
        visitor_phone: data.visitor_phone,
        visitor_email: data.visitor_email || null,
        visit_date: format(data.visit_date, "yyyy-MM-dd"),
        visit_time: data.visit_time,
        notes: data.notes || null,
        status: "scheduled",
        created_by: "manual",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Visita agendada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["property-visits", propertyId] });
      reset();
      setSelectedDate(undefined);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao agendar visita: ${error.message}`);
    },
  });

  const onSubmit = (data: VisitFormData) => {
    createVisitMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Agendar Visita</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="visitor_name">Nome do Interessado *</Label>
            <Input
              id="visitor_name"
              placeholder="Nome completo"
              {...register("visitor_name")}
            />
            {errors.visitor_name && (
              <p className="text-sm text-destructive">{errors.visitor_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="visitor_phone">Telefone *</Label>
            <Input
              id="visitor_phone"
              placeholder="(00) 00000-0000"
              {...register("visitor_phone")}
            />
            {errors.visitor_phone && (
              <p className="text-sm text-destructive">{errors.visitor_phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="visitor_email">Email</Label>
            <Input
              id="visitor_email"
              type="email"
              placeholder="email@exemplo.com"
              {...register("visitor_email")}
            />
            {errors.visitor_email && (
              <p className="text-sm text-destructive">{errors.visitor_email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Data da Visita *</Label>
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
                  {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    if (date) setValue("visit_date", date);
                  }}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {errors.visit_date && (
              <p className="text-sm text-destructive">{errors.visit_date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="visit_time">Hora da Visita *</Label>
            <Input
              id="visit_time"
              type="time"
              {...register("visit_time")}
            />
            {errors.visit_time && (
              <p className="text-sm text-destructive">{errors.visit_time.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Observações sobre a visita..."
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
              disabled={createVisitMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createVisitMutation.isPending}>
              {createVisitMutation.isPending ? "Agendando..." : "Agendar Visita"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
