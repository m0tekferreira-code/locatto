import { useLicense } from "@/contexts/LicenseContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const TrialBanner = () => {
  const { isValid, daysRemaining, isTrial, canEdit } = useLicense();
  const navigate = useNavigate();

  // Don't show banner if license is valid and not in trial
  if (isValid && !isTrial) {
    return null;
  }

  // License expired - show read-only mode banner
  if (!isValid) {
    return (
      <Alert className="mb-4 border-destructive bg-destructive/10">
        <Lock className="h-4 w-4 text-destructive" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <strong className="text-destructive">Modo Somente Leitura</strong>
            <p className="text-sm text-muted-foreground mt-1">
              Sua licença expirou. Você pode visualizar seus dados, mas não pode fazer edições.
            </p>
          </div>
          <Button 
            onClick={() => navigate('/plans')}
            variant="destructive"
            size="sm"
          >
            Renovar Licença
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Trial mode - show days remaining
  if (isTrial && daysRemaining !== null) {
    const isUrgent = daysRemaining <= 3;
    
    return (
      <Alert className={`mb-4 ${isUrgent ? 'border-warning bg-warning/10' : 'border-info bg-info/10'}`}>
        {isUrgent ? (
          <AlertTriangle className="h-4 w-4 text-warning" />
        ) : (
          <Clock className="h-4 w-4 text-info" />
        )}
        <AlertDescription className="flex items-center justify-between">
          <div>
            <strong className={isUrgent ? 'text-warning' : 'text-info'}>
              Período de Trial - {daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'}
            </strong>
            <p className="text-sm text-muted-foreground mt-1">
              {isUrgent 
                ? 'Seu período de teste está acabando! Contrate um plano para continuar usando.' 
                : 'Aproveite para explorar todas as funcionalidades do sistema.'
              }
            </p>
          </div>
          <Button 
            onClick={() => navigate('/plans')}
            variant={isUrgent ? "default" : "outline"}
            size="sm"
          >
            Ver Planos
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};
