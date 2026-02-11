import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Inventory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", cost_price: "", selling_price: "", quantity: "", low_stock_threshold: "5" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadProducts();
  }, [user]);

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("products").insert({
      user_id: user!.id,
      name: form.name,
      sku: "", // auto-generated
      category: form.category,
      cost_price: Number(form.cost_price),
      selling_price: Number(form.selling_price),
      quantity: Number(form.quantity),
      low_stock_threshold: Number(form.low_stock_threshold),
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setForm({ name: "", category: "", cost_price: "", selling_price: "", quantity: "", low_stock_threshold: "5" });
      setOpen(false);
      loadProducts();
      toast({ title: "Product added" });
    }
  };

  const deleteProduct = async (id: string) => {
    await supabase.from("products").delete().eq("id", id);
    loadProducts();
  };

  const formatCurrency = (a: number) => "₦" + Number(a).toLocaleString("en-NG");

  const totalValue = products.reduce((s, p) => s + Number(p.selling_price) * p.quantity, 0);
  const lowStockCount = products.filter((p) => p.quantity <= p.low_stock_threshold).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Inventory</h1>
          <p className="page-subtitle">Manage your products and stock levels</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add Product</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
            <form onSubmit={addProduct} className="space-y-4">
              <div className="space-y-2">
                <Label>Product Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Electronics" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cost Price (₦)</Label>
                  <Input type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} required min="0" step="0.01" />
                </div>
                <div className="space-y-2">
                  <Label>Selling Price (₦)</Label>
                  <Input type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} required min="0" step="0.01" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required min="0" />
                </div>
                <div className="space-y-2">
                  <Label>Low Stock Alert</Label>
                  <Input type="number" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} min="0" />
                </div>
              </div>
              <Button type="submit" className="w-full">Add Product</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="stat-card bg-primary/5 border-primary/20">
          <p className="text-sm text-muted-foreground">Total Products</p>
          <p className="text-2xl font-display font-bold">{products.length}</p>
        </div>
        <div className="stat-card bg-accent/10 border-accent/20">
          <p className="text-sm text-muted-foreground">Inventory Value</p>
          <p className="text-2xl font-display font-bold">{formatCurrency(totalValue)}</p>
        </div>
        <div className="stat-card bg-destructive/5 border-destructive/20">
          <p className="text-sm text-muted-foreground">Low Stock Items</p>
          <p className="text-2xl font-display font-bold text-destructive">{lowStockCount}</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : products.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No products yet</TableCell></TableRow>
              ) : (
                products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm font-medium">{p.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.sku}</TableCell>
                    <TableCell className="text-sm">{p.category || "—"}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(p.cost_price)}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(p.selling_price)}</TableCell>
                    <TableCell className="text-right text-sm">{p.quantity}</TableCell>
                    <TableCell>
                      {p.quantity <= p.low_stock_threshold ? (
                        <Badge variant="destructive" className="text-xs">Low Stock</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">In Stock</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => deleteProduct(p.id)} className="text-destructive hover:text-destructive">Delete</Button>
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

export default Inventory;
