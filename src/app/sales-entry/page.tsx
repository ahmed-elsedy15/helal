
"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { db, Product, Sale, Customer } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ShoppingCart, History, Search, Plus, Trash2, CreditCard, Wallet, ArrowRight, Star } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTranslation } from "@/context/language-context"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
}

export default function SalesEntryPage() {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [recentSales, setRecentSales] = useState<Sale[]>([])

  const [selectedProductId, setSelectedProductId] = useState("")
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState("")
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('cash')
  const [quantity, setQuantity] = useState("1")
  const [itemDiscount, setItemDiscount] = useState("0")
  const [paidNow, setPaidNow] = useState("0")

  const [cart, setCart] = useState<CartItem[]>([])

  const [productSearch, setProductSearch] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [isProductPopoverOpen, setIsProductPopoverOpen] = useState(false)
  const [isCustomerPopoverOpen, setIsCustomerPopoverOpen] = useState(false)

  // State for return confirmation
  const [saleToReturn, setSaleToReturn] = useState<string | null>(null)

  const loadData = useCallback(() => {
    setProducts(db.getProducts().filter(p => p.quantity > 0))
    setCustomers(db.getCustomers())
    setRecentSales(db.getSales().slice(0, 10))
  }, [])

  useEffect(() => {
    loadData()
    const handleSync = () => loadData();
    window.addEventListener('salesphere-db-updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('salesphere-db-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadData])

  const filteredProducts = useMemo(() => {
    const term = productSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(term))
  }, [products, productSearch])

  const filteredCustomers = useMemo(() => {
    const term = customerSearch.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(term) || c.phone.includes(term))
  }, [customers, customerSearch])

  const selectedProduct = products.find(p => p.id === selectedProductId)

  const addToCart = () => {
    if (!selectedProductId || !selectedProduct) return;
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) return;
    if (qty > selectedProduct.quantity) {
      toast({ title: t.error, description: "Insufficient stock", variant: "destructive" });
      return;
    }

    const price = Number(selectedProduct.sellingPrice) || Number(selectedProduct.price) || 0;
    const disc = parseFloat(itemDiscount) || 0;
    const total = (price * qty) - disc;

    const newItem: CartItem = {
      id: crypto.randomUUID(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity: qty,
      price: price,
      discount: disc,
      total: total
    }

    setCart([...cart, newItem])
    setSelectedProductId("")
    setQuantity("1")
    setItemDiscount("0")
    setProductSearch("")
  }

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id))
  }

  const finalTotal = cart.reduce((sum, item) => sum + item.total, 0)
  const totalPaid = parseFloat(paidNow) || 0;
  const debtToRecord = Math.max(0, finalTotal - totalPaid);

  const handleCompleteSale = () => {
    if (cart.length === 0) return;

    if (paymentType === 'credit' && !selectedCustomerId && !isNewCustomer) {
      toast({ title: t.error, description: t.customer, variant: "destructive" });
      return;
    }

    if (isNewCustomer && !newCustomerName && paymentType === 'credit') {
      toast({ title: t.error, description: t.customerName, variant: "destructive" });
      return;
    }

    try {
      let finalCustomerId = selectedCustomerId;

      // إنشاء عميل جديد إذا تم تفعيل الخيار
      if (paymentType === 'credit' && isNewCustomer && newCustomerName) {
        const newCust = db.addCustomer({
          name: newCustomerName,
          phone: "",
          type: "regular"
        });
        finalCustomerId = newCust.id;
      }

      const debtRatio = finalTotal > 0 ? debtToRecord / finalTotal : 0;

      cart.forEach(item => {
        const itemDebt = item.total * debtRatio;
        db.recordSale(
          item.productId,
          item.quantity,
          paymentType,
          finalCustomerId || undefined,
          item.discount,
          itemDebt
        )
      })

      toast({ title: t.success, description: t.success })
      setCart([])
      setSelectedCustomerId("")
      setIsNewCustomer(false)
      setNewCustomerName("")
      setPaymentType('cash')
      setPaidNow("0")
      loadData()
    } catch (err: any) {
      toast({ title: t.error, description: err.message, variant: "destructive" })
    }
  }

  const confirmReturn = () => {
    if (!saleToReturn) return;
    if (db.returnSale(saleToReturn)) {
      toast({ title: t.success, description: t.saleReturned })
      loadData()
    }
    setSaleToReturn(null);
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-4 md:p-8 space-y-8 bg-slate-50/50 dark:bg-transparent min-h-screen">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center gap-2">
            <ShoppingCart className="h-8 w-8" />
            {t.salesEntry}
          </h1>
          <p className="text-muted-foreground mt-1">{t.welcome}</p>
        </div>
        <Badge variant="outline" className="px-4 py-2 text-base bg-white dark:bg-slate-900 shadow-sm border-primary/20 h-fit w-fit">
          {t.totalItems}: {cart.length}
        </Badge>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8 border-none shadow-md overflow-hidden bg-white dark:bg-slate-900">
          <div className="h-1 bg-primary w-full" />
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Plus className="h-4 w-4 text-primary" />
              {t.selectProduct}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-9 grid gap-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">{t.productName}</Label>
                <Popover open={isProductPopoverOpen} onOpenChange={setIsProductPopoverOpen} modal={true}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between h-12 text-start font-normal">
                      {selectedProductId ? products.find(p => p.id === selectedProductId)?.name : t.searchProducts}
                      <Search className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0 shadow-lg"
                    align="start"
                  >
                    <div className="flex items-center border-b px-3">
                      <Search className="mr-2 h-4 w-4 opacity-50" />
                      <Input
                        placeholder={t.searchProducts}
                        className="border-none focus-visible:ring-0 shadow-none bg-transparent h-12"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                      />
                    </div>
                    <ScrollArea className="h-72">
                      <div className="p-2 space-y-1">
                        {filteredProducts.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className="flex w-full cursor-pointer items-center rounded-md px-3 py-3 text-sm hover:bg-primary/10 transition-colors"
                            onClick={() => { setSelectedProductId(p.id); setIsProductPopoverOpen(false); setProductSearch(""); }}
                          >
                            <div className="flex-1 text-start">
                              <p className="font-semibold">{p.name}</p>
                              <Badge variant="secondary" className="text-[10px]">${(p.sellingPrice || p.price || 0).toFixed(2)}</Badge>
                            </div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="md:col-span-3 grid gap-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">{t.quantity}</Label>
                <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" className="h-12 text-center" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-3 grid gap-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">{t.sellingPrice}</Label>
                <div className="h-12 flex items-center px-4 bg-slate-50 dark:bg-slate-800 border rounded-md font-bold text-primary">
                  ${selectedProduct ? (selectedProduct.sellingPrice || selectedProduct.price || 0).toFixed(2) : "0.00"}
                </div>
              </div>
              <div className="md:col-span-6 grid gap-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase">{t.discount}</Label>
                <Input type="number" value={itemDiscount} onChange={(e) => setItemDiscount(e.target.value)} min="0" className="h-12" placeholder="0.00" />
              </div>
              <div className="md:col-span-3 flex items-end">
                <Button onClick={addToCart} className="w-full h-12 gap-2">
                  <Plus className="h-4 w-4" />
                  {t.addToCart}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-none shadow-md overflow-hidden bg-white dark:bg-slate-900">
          <div className="h-1 bg-accent w-full" />
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <CreditCard className="h-4 w-4 text-accent" />
              {t.paymentType}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <RadioGroup value={paymentType} onValueChange={(val) => setPaymentType(val as any)} className="grid grid-cols-2 gap-4">
                <Label htmlFor="cash" className={cn("flex items-center justify-center gap-2 p-2 rounded-xl border-2 cursor-pointer h-12", paymentType === 'cash' ? "border-primary bg-primary/5" : "border-slate-100")}>
                  <RadioGroupItem value="cash" id="cash" className="sr-only" />
                  <Wallet className="h-4 w-4" />
                  <span className="text-xs font-medium">{t.cash}</span>
                </Label>
                <Label htmlFor="credit" className={cn("flex items-center justify-center gap-2 p-2 rounded-xl border-2 cursor-pointer h-12", paymentType === 'credit' ? "border-orange-500 bg-orange-500/5" : "border-slate-100")}>
                  <RadioGroupItem value="credit" id="credit" className="sr-only" />
                  <CreditCard className="h-4 w-4" />
                  <span className="text-xs font-medium">{t.credit}</span>
                </Label>
              </RadioGroup>
            </div>

            {paymentType === 'credit' && (
              <div className="space-y-4 pt-2 border-t mt-4 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-primary uppercase">{t.newCustomer}</Label>
                  <Switch checked={isNewCustomer} onCheckedChange={setIsNewCustomer} />
                </div>

                {isNewCustomer ? (
                  <div className="grid gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase">{t.customerName}</Label>
                    <Input
                      placeholder={t.customerName}
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      className="h-12 border-primary/30 focus:border-primary"
                    />
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase">{t.searchCustomers}</Label>
                    <Popover open={isCustomerPopoverOpen} onOpenChange={setIsCustomerPopoverOpen} modal={true}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between h-12 text-start font-normal">
                          {selectedCustomerId ? customers.find(c => c.id === selectedCustomerId)?.name : t.searchCustomers}
                          <Search className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[--radix-popover-trigger-width] p-0 shadow-lg"
                        align="start"
                      >
                        <div className="flex items-center border-b px-3">
                          <Search className="mr-2 h-4 w-4 opacity-50" />
                          <Input
                            placeholder={t.searchCustomers}
                            className="border-none focus-visible:ring-0 shadow-none bg-transparent h-12"
                            value={customerSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                          />
                        </div>
                        <ScrollArea className="h-72">
                          <div className="p-2 space-y-1">
                            {filteredCustomers.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                className="w-full p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between rounded-md transition-colors"
                                onClick={() => { setSelectedCustomerId(c.id); setIsCustomerPopoverOpen(false); }}
                              >
                                <p className="text-sm">{c.name}</p>
                                {c.type === 'special' && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                <div className="grid gap-2 pt-2 border-t">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase">{t.amountPaidNow}</Label>
                  <Input type="number" value={paidNow} onChange={(e) => setPaidNow(e.target.value)} min="0" className="h-12 bg-green-50/20" placeholder="0.00" />
                  <div className="flex justify-between text-[10px] font-bold mt-1">
                    <span className="text-muted-foreground uppercase">{t.remainingDebt}:</span>
                    <span className="text-orange-600">${debtToRecord.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-lg bg-white dark:bg-slate-900 overflow-hidden h-full">
            <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b py-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="h-5 w-5 text-primary" />
                {t.cart}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/5 border-none">
                      <TableHead>{t.product}</TableHead>
                      <TableHead>{t.price}</TableHead>
                      <TableHead>{t.qty}</TableHead>
                      <TableHead>{t.discount}</TableHead>
                      <TableHead>{t.totalPrice}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-semibold">{item.productName}</TableCell>
                        <TableCell className="text-xs">${item.price.toFixed(2)}</TableCell>
                        <TableCell><Badge variant="outline">{item.quantity}</Badge></TableCell>
                        <TableCell className="text-red-500 text-xs">{item.discount > 0 ? `-$${item.discount.toFixed(2)}` : "-"}</TableCell>
                        <TableCell className="font-bold text-primary">${item.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)} className="hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {cart.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-64 text-center text-muted-foreground italic">{t.cartEmpty}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="border-none shadow-2xl bg-slate-900 text-white overflow-hidden rounded-2xl h-full flex flex-col justify-center text-center p-8 space-y-8">
            <div>
              <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t.finalTotal}</span>
              <div className="text-6xl font-black text-accent font-mono tracking-tighter">${finalTotal.toFixed(2)}</div>
            </div>
            <Button
              className="w-full bg-accent hover:bg-accent/90 text-primary font-bold py-10 text-2xl group rounded-xl"
              disabled={cart.length === 0}
              onClick={handleCompleteSale}
            >
              {t.completeSale}
              <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          {t.recentSales}
        </h3>
        <div className="rounded-2xl border bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/5">
                <TableHead>{t.time}</TableHead>
                <TableHead>{t.product}</TableHead>
                <TableHead>{t.qty}</TableHead>
                <TableHead>{t.discount}</TableHead>
                <TableHead>{t.paymentType}</TableHead>
                <TableHead className="text-right">{t.totalPrice}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSales.map(sale => (
                <TableRow key={sale.id} className="text-sm">
                  <TableCell className="py-4 text-[10px] text-muted-foreground">
                    <div className="flex flex-col">
                      <span className="whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">{formatDate(sale.timestamp)}</span>
                      <span className="font-medium opacity-80 text-[10px]">{formatTime(sale.timestamp)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-slate-700 dark:text-slate-300">
                      {sale.productName}
                    </div>
                    {sale.customerName && <div className="text-[10px] text-blue-600 font-medium">[{sale.customerName}]</div>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{sale.quantitySold}</Badge>
                  </TableCell>
                  <TableCell className="text-red-500 text-xs">
                    {sale.discount > 0 ? `-$${(sale.discount || 0).toFixed(2)}` : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={sale.paymentType === 'cash' ? "default" : "outline"} className={sale.paymentType === 'credit' ? "text-orange-600 border-orange-200" : ""}>
                      {sale.paymentType === 'cash' ? t.cash : t.credit}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-black text-primary text-right text-base">${sale.totalPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="hover:text-orange-600" onClick={() => setSaleToReturn(sale.id)}>
                      <History className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Return Sale Confirmation Dialog */}
      <AlertDialog open={!!saleToReturn} onOpenChange={(open) => !open && setSaleToReturn(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmReturn}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.confirmReturn}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSaleToReturn(null)}>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReturn} className="bg-orange-600 hover:bg-orange-700">
              {t.save}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
