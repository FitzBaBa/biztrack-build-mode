import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Expenses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expenseList, setExpenseList] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [form, setForm] = useState({ amount: "", description: "", category_id: "", expense_date: new Date().toISOString().split("T")[0] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    const [{ data: exp }, { data: cats }] = await Promise.all([
      supabase.from("expenses").select("*").eq("user_id", user!.id).order("expense_date", { ascending: false }),
      supabase.from("expense_categories").select("*").eq("user_id", user!.id),
    ]);
    setExpenseList(exp || []);
    setCategories(cats || []);
    setLoading(false);
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    await supabase.from("expense_categories").insert({ user_id: user!.id, name: newCatName.trim() });
    setNewCatName("");
    setCatOpen(false);
    loadData();
    toast({ title: "Category added" });
  };

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("expenses").insert({
      user_id: user!.id,
      amount: Number(form.amount),
      description: form.description,
      category_id: form.category_id || null,
      expense_date: form.expense_date,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setForm({ amount: "", description: "", category_id: "", expense_date: new Date().toISOString().split("T")[0] });
      setOpen(false);
      loadData();
      toast({ title: "Expense recorded" });
    }
  };

  const deleteExpense = async (id: string) => {
    await supabase.from("expenses").delete().eq("id", id);
    loadData();
  };

  const formatCurrency = (a: number) => "₦" + Number(a).toLocaleString("en-NG");
  const total = expenseList.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Expenses</h1>
          <p className="page-subtitle">Track all business expenditures</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={catOpen} onOpenChange={setCatOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">+ Category</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Expense Category</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Category Name</Label>
                  <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="e.g. Rent, Salaries" />
                </div>
                <Button onClick={addCategory} className="w-full">Add Category</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Expense</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
              <form onSubmit={addExpense} className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount (₦)</Label>
                  <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required min="0" step="0.01" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What was this expense for?" />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
                </div>
                <Button type="submit" className="w-full">Record Expense</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="stat-card bg-destructive/5 border-destructive/20">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-destructive/10 p-2.5">
            <TrendingDown className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="text-2xl font-display font-bold text-foreground">{formatCurrency(total)}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : expenseList.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No expenses recorded yet</TableCell></TableRow>
              ) : (
                expenseList.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">{new Date(e.expense_date).toLocaleDateString("en-NG")}</TableCell>
                    <TableCell className="text-sm">{e.description || "—"}</TableCell>
                    <TableCell className="text-sm">{categories.find((c) => c.id === e.category_id)?.name || "—"}</TableCell>
                    <TableCell className="text-right text-sm font-semibold text-destructive">{formatCurrency(e.amount)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => deleteExpense(e.id)} className="text-destructive hover:text-destructive">Delete</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Expenses;
