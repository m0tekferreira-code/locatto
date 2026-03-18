import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatItemProps {
  label: string;
  value: string | number;
  color?: string;
}

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  stats: StatItemProps[];
}

export const StatCard = ({ icon: Icon, title, stats }: StatCardProps) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="rounded-lg bg-info/10 p-2">
            <Icon className="h-5 w-5 text-info" />
          </div>
          <h3 className="font-semibold">{title}</h3>
        </div>
        
        <div className="space-y-3">
          {stats.map((stat, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={cn("h-2 w-2 rounded-full", stat.color || "bg-info")} />
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold ml-4">{stat.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
