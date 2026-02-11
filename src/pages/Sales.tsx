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
import { Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CartItem {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

const Sales = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [qty, setQty] = useState("1");
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    const [{ data: salesData }, { data: prods }] = await Promise.all([
      supabase.from("sales").select("*").eq("user_id", user!.id).order("sale_date", { ascending: false }),
      supabase.from("products").select("*").eq("user_id", user!.id),
    ]);
    setSales(salesData || []);
    setProducts(prods || []);
    setLoading(false);
  };

  const addToCart = () => {
    const prod = products.find((p) => p.id === selectedProduct);
    if (!prod) return;
    const quantity = Number(qty);
    if (quantity <= 0 || quantity > prod.quantity) {
      toast({ title: "Invalid quantity", variant: "destructive" });
      return;
    }
    const existing = cart.find((c) => c.product_id === prod.id);
    if (existing) {
      setCart(cart.map((c) => c.product_id === prod.id ? { ...c, quantity: c.quantity + quantity, total_price: (c.quantity + quantity) * c.unit_price } : c));
    } else {
      setCart([...cart, { product_id: prod.id, name: prod.name, quantity, unit_price: Number(prod.selling_price), total_price: quantity * Number(prod.selling_price) }]);
    }
    setSelectedProduct("");
    setQty("1");
  };

  const removeFromCart = (productId: string) => setCart(cart.filter((c) => c.product_id !== productId));

  const subtotal = cart.reduce((s, c) => s + c.total_price, 0);
  const total = subtotal - Number(discount);

  const completeSale = async () => {
    if (cart.length === 0) return;
    const { data: sale, error } = await supabase.from("sales").insert({
      user_id: user!.id,
      total_amount: total,
      discount: Number(discount),
      payment_method: paymentMethod,
    }).select().single();

    if (error || !sale) {
      toast({ title: "Error", description: error?.message, variant: "destructive" });
      return;
    }

    const items = cart.map((c) => ({
      sale_id: sale.id,
      product_id: c.product_id,
      quantity: c.quantity,
      unit_price: c.unit_price,
      total_price: c.total_price,
    }));

    const { error: itemError } = await supabase.from("sale_items").insert(items);
    if (itemError) {
      toast({ title: "Error saving items", description: itemError.message, variant: "destructive" });
      return;
    }

    // Also record as income
    await supabase.from("income").insert({
      user_id: user!.id,
      amount: total,
      description: `Sale #${sale.id.slice(0, 8)}`,
      income_date: new Date().toISOString().split("T")[0],
    });

    setCart([]);
    setDiscount("0");
    setOpen(false);
    loadData();
    toast({ title: "Sale completed!" });
  };

  const formatCurrency = (a: number) => "₦" + Number(a).toLocaleString("en-NG");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Sales</h1>
          <p className="page-subtitle">Create and track all sales</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" /> New Sale</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create New Sale</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {/* Add items */}
              <div className="flex gap-2">
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products.filter((p) => p.quantity > 0).map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.quantity} avail.)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="w-20" min="1" />
                <Button type="button" variant="outline" onClick={addToCart}>Add</Button>
              </div>

              {/* Cart */}
              {cart.length > 0 && (
                <div className="space-y-2 rounded-lg border border-border p-3">
                  {cart.map((item) => (
                    <div key={item.product_id} className="flex items-center justify-between text-sm">
                      <span>{item.name} × {item.quantity}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatCurrency(item.total_price)}</span>
                        <button onClick={() => removeFromCart(item.product_id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discount (₦)</Label>
                  <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} min="0" />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="pos">POS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-primary/5 px-4 py-3 border border-primary/20">
                <span className="font-medium">Total</span>
                <span className="text-xl font-display font-bold text-primary">{formatCurrency(total)}</span>
              </div>

              <Button onClick={completeSale} className="w-full" disabled={cart.length === 0}>Complete Sale</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="stat-card bg-accent/10 border-accent/20">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-accent/10 p-2.5">
            <ShoppingCart className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Sales</p>
            <p className="text-2xl font-display font-bold">{sales.length} transactions</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Sale ID</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : sales.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No sales yet</TableCell></TableRow>
              ) : (
                sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm">{new Date(s.sale_date).toLocaleDateString("en-NG")}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-sm capitalize">{s.payment_method}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(s.discount)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold text-primary">{formatCurrency(s.total_amount)}</TableCell>
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

export default Sales;
