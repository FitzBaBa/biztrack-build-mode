import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = [
  "hsl(160, 84%, 24%)",
  "hsl(38, 92%, 50%)",
  "hsl(210, 80%, 52%)",
  "hsl(0, 72%, 51%)",
  "hsl(280, 60%, 50%)",
];

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    lowStockCount: 0,
    totalSales: 0,
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 7);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Fetch income
    const { data: incomeData } = await supabase
      .from("income")
      .select("amount, income_date")
      .eq("user_id", user.id);

    // Fetch expenses
    const { data: expensesData } = await supabase
      .from("expenses")
      .select("amount, expense_date, category_id")
      .eq("user_id", user.id);

    // Fetch expense categories
    const { data: categories } = await supabase
      .from("expense_categories")
      .select("id, name")
      .eq("user_id", user.id);

    // Fetch sales
    const { data: salesData } = await supabase
      .from("sales")
      .select("total_amount, sale_date")
      .eq("user_id", user.id);

    // Low stock products
    const { data: products } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id);

    const lowStock = (products || []).filter((p) => p.quantity <= p.low_stock_threshold);

    // Calculate stats
    const todayStr = today.toISOString().split("T")[0];
    const todayRevenue = (incomeData || [])
      .filter((i) => i.income_date === todayStr)
      .reduce((sum, i) => sum + Number(i.amount), 0);

    const weekRevenue = (incomeData || [])
      .filter((i) => new Date(i.income_date) >= startOfWeek)
      .reduce((sum, i) => sum + Number(i.amount), 0);

    const monthRevenue = (incomeData || [])
      .filter((i) => new Date(i.income_date) >= startOfMonth)
      .reduce((sum, i) => sum + Number(i.amount), 0);

    const totalExpenses = (expensesData || []).reduce((sum, e) => sum + Number(e.amount), 0);
    const totalIncome = (incomeData || []).reduce((sum, i) => sum + Number(i.amount), 0);

    setStats({
      todayRevenue,
      weekRevenue,
      monthRevenue,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      lowStockCount: lowStock.length,
      totalSales: (salesData || []).length,
    });

    // Revenue trend (last 7 days)
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split("T")[0];
      const dayIncome = (incomeData || [])
        .filter((inc) => inc.income_date === dateStr)
        .reduce((sum, inc) => sum + Number(inc.amount), 0);
      return { date: d.toLocaleDateString("en-NG", { weekday: "short" }), revenue: dayIncome };
    });
    setRevenueData(last7);

    // Expense breakdown by category
    const catMap = new Map<string, number>();
    (expensesData || []).forEach((e) => {
      const catName = categories?.find((c) => c.id === e.category_id)?.name || "Uncategorized";
      catMap.set(catName, (catMap.get(catName) || 0) + Number(e.amount));
    });
    setExpenseBreakdown(
      Array.from(catMap.entries()).map(([name, value]) => ({ name, value }))
    );

    setLowStockProducts(lowStock.slice(0, 5));
    setLoading(false);
  };

  const formatCurrency = (amount: number) =>
    "₦" + amount.toLocaleString("en-NG", { minimumFractionDigits: 0 });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Dashboard</h1>
        <p className="page-subtitle">Overview of your business performance</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today's Revenue" value={formatCurrency(stats.todayRevenue)} icon={TrendingUp} variant="primary" />
        <StatCard title="Monthly Revenue" value={formatCurrency(stats.monthRevenue)} icon={DollarSign} variant="accent" />
        <StatCard title="Total Expenses" value={formatCurrency(stats.totalExpenses)} icon={TrendingDown} variant="destructive" />
        <StatCard
          title="Net Profit"
          value={formatCurrency(stats.netProfit)}
          icon={TrendingUp}
          variant={stats.netProfit >= 0 ? "primary" : "destructive"}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">Revenue Trend (7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(40, 15%, 89%)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(160, 84%, 24%)" strokeWidth={2} dot={{ fill: "hsl(160, 84%, 24%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={expenseBreakdown} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {expenseBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                No expense data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-display">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length > 0 ? (
              <div className="space-y-3">
                {lowStockProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-warning/5 px-3 py-2 border border-warning/10">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>
                    </div>
                    <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning">
                      {p.quantity} left
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">All stock levels are healthy ✓</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Total Sales</span>
              </div>
              <span className="font-semibold">{stats.totalSales}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Low Stock Items</span>
              </div>
              <span className="font-semibold text-warning">{stats.lowStockCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Weekly Revenue</span>
              </div>
              <span className="font-semibold">{formatCurrency(stats.weekRevenue)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
