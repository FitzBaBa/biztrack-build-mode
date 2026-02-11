import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  variant?: "default" | "primary" | "accent" | "destructive";
}

const variantStyles = {
  default: "bg-card border-border",
  primary: "bg-primary/5 border-primary/20",
  accent: "bg-accent/10 border-accent/20",
  destructive: "bg-destructive/5 border-destructive/20",
};

const iconStyles = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  destructive: "bg-destructive/10 text-destructive",
};

export const StatCard = ({ title, value, icon: Icon, trend, trendUp, variant = "default" }: StatCardProps) => (
  <div className={`stat-card ${variantStyles[variant]} animate-fade-in`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-display font-bold text-foreground animate-count-up">{value}</p>
        {trend && (
          <p className={`mt-1 text-xs font-medium ${trendUp ? "text-success" : "text-destructive"}`}>
            {trendUp ? "↑" : "↓"} {trend}
          </p>
        )}
      </div>
      <div className={`rounded-lg p-2.5 ${iconStyles[variant]}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);
