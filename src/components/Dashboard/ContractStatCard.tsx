import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ContractStatCardProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value: number | string;
  linkText: string;
  linkTo: string;
}

export const ContractStatCard = ({ 
  icon: Icon, 
  iconColor = "text-info",
  title, 
  subtitle, 
  value, 
  linkText, 
  linkTo 
}: ContractStatCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className="flex flex-col justify-between">
      <CardContent className="p-5 flex flex-col justify-between h-full">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-sm text-foreground">{title}</h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
            <p className="text-3xl font-bold mt-2">{value}</p>
          </div>
          <div className={`rounded-lg bg-muted p-2 ${iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <Button 
          variant="link" 
          className="text-info p-0 h-auto mt-3 self-start text-xs"
          onClick={() => navigate(linkTo)}
        >
          {linkText}
          <ChevronRight className="ml-0.5 h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
};
