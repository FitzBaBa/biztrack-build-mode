import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const Reports = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState("30");
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [expenseData, setExpenseData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ revenue: 0, expenses: 0, profit: 0, salesCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadReports();
  }, [user, period]);

  const loadReports = async () => {
    const days = Number(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startStr = startDate.toISOString().split("T")[0];

    const [{ data: income }, { data: expenses }, { data: sales }] = await Promise.all([
      supabase.from("income").select("amount, income_date").eq("user_id", user!.id).gte("income_date", startStr),
      supabase.from("expenses").select("amount, expense_date").eq("user_id", user!.id).gte("expense_date", startStr),
      supabase.from("sales").select("total_amount, sale_date").eq("user_id", user!.id).gte("sale_date", startDate.toISOString()),
    ]);

    const totalRevenue = (income || []).reduce((s, i) => s + Number(i.amount), 0);
    const totalExpenses = (expenses || []).reduce((s, e) => s + Number(e.amount), 0);

    setSummary({
      revenue: totalRevenue,
      expenses: totalExpenses,
      profit: totalRevenue - totalExpenses,
      salesCount: (sales || []).length,
    });

    // Build daily data
    const dailyMap = new Map<string, { revenue: number; expenses: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const ds = d.toISOString().split("T")[0];
      dailyMap.set(ds, { revenue: 0, expenses: 0 });
    }

    (income || []).forEach((i) => {
      const entry = dailyMap.get(i.income_date);
      if (entry) entry.revenue += Number(i.amount);
    });

    (expenses || []).forEach((e) => {
      const entry = dailyMap.get(e.expense_date);
      if (entry) entry.expenses += Number(e.amount);
    });

    const chartData = Array.from(dailyMap.entries()).map(([date, val]) => ({
      date: new Date(date).toLocaleDateString("en-NG", { month: "short", day: "numeric" }),
      ...val,
    }));

    setRevenueData(chartData);
    setExpenseData(chartData);
    setLoading(false);
  };

  const formatCurrency = (a: number) => "₦" + Number(a).toLocaleString("en-NG");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Reports</h1>
          <p className="page-subtitle">Analyze your business performance</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card bg-primary/5 border-primary/20">
          <p className="text-sm text-muted-foreground">Revenue</p>
          <p className="text-2xl font-display font-bold">{formatCurrency(summary.revenue)}</p>
        </div>
        <div className="stat-card bg-destructive/5 border-destructive/20">
          <p className="text-sm text-muted-foreground">Expenses</p>
          <p className="text-2xl font-display font-bold">{formatCurrency(summary.expenses)}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Net Profit</p>
          <p className={`text-2xl font-display font-bold ${summary.profit >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(summary.profit)}</p>
        </div>
        <div className="stat-card bg-accent/10 border-accent/20">
          <p className="text-sm text-muted-foreground">Sales Count</p>
          <p className="text-2xl font-display font-bold">{summary.salesCount}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(40, 15%, 89%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(160, 84%, 24%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">Revenue vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={expenseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(40, 15%, 89%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                <Bar dataKey="revenue" fill="hsl(160, 84%, 24%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
