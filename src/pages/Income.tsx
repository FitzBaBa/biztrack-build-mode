import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Income = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [incomeList, setIncomeList] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [form, setForm] = useState({ amount: "", description: "", reference: "", category_id: "", income_date: new Date().toISOString().split("T")[0] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    const [{ data: inc }, { data: cats }] = await Promise.all([
      supabase.from("income").select("*").eq("user_id", user!.id).order("income_date", { ascending: false }),
      supabase.from("income_categories").select("*").eq("user_id", user!.id),
    ]);
    setIncomeList(inc || []);
    setCategories(cats || []);
    setLoading(false);
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    await supabase.from("income_categories").insert({ user_id: user!.id, name: newCatName.trim() });
    setNewCatName("");
    setCatOpen(false);
    loadData();
    toast({ title: "Category added" });
  };

  const addIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("income").insert({
      user_id: user!.id,
      amount: Number(form.amount),
      description: form.description,
      reference: form.reference,
      category_id: form.category_id || null,
      income_date: form.income_date,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setForm({ amount: "", description: "", reference: "", category_id: "", income_date: new Date().toISOString().split("T")[0] });
      setOpen(false);
      loadData();
      toast({ title: "Income recorded" });
    }
  };

  const deleteIncome = async (id: string) => {
    await supabase.from("income").delete().eq("id", id);
    loadData();
  };

  const formatCurrency = (a: number) => "₦" + Number(a).toLocaleString("en-NG");
  const total = incomeList.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Income</h1>
          <p className="page-subtitle">Track all revenue sources</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={catOpen} onOpenChange={setCatOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">+ Category</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Income Category</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Category Name</Label>
                  <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="e.g. Product Sales" />
                </div>
                <Button onClick={addCategory} className="w-full">Add Category</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Income</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record Income</DialogTitle></DialogHeader>
              <form onSubmit={addIncome} className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount (₦)</Label>
                  <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required min="0" step="0.01" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is this income from?" />
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
                  <Label>Reference</Label>
                  <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Receipt or reference number" />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.income_date} onChange={(e) => setForm({ ...form, income_date: e.target.value })} />
                </div>
                <Button type="submit" className="w-full">Record Income</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary */}
      <div className="stat-card bg-primary/5 border-primary/20">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Income</p>
            <p className="text-2xl font-display font-bold text-foreground">{formatCurrency(total)}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : incomeList.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No income recorded yet</TableCell></TableRow>
              ) : (
                incomeList.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="text-sm">{new Date(i.income_date).toLocaleDateString("en-NG")}</TableCell>
                    <TableCell className="text-sm">{i.description || "—"}</TableCell>
                    <TableCell className="text-sm">{categories.find((c) => c.id === i.category_id)?.name || "—"}</TableCell>
                    <TableCell className="text-sm">{i.reference || "—"}</TableCell>
                    <TableCell className="text-right text-sm font-semibold text-primary">{formatCurrency(i.amount)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => deleteIncome(i.id)} className="text-destructive hover:text-destructive">Delete</Button>
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

export default Income;
