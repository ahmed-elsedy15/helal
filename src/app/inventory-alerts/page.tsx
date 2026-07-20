
"use client"

import { useEffect, useState, useCallback } from "react"
import { db, Product, DB_UPDATE_EVENT } from "@/lib/db"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertTriangle, ShoppingCart } from "lucide-react"
import { useTranslation } from "@/context/language-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function InventoryAlertsPage() {
  const { t, dir } = useTranslation()
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])

  const loadLowStock = useCallback(() => {
    const products = db.getProducts()
    // تصفية المنتجات التي كميتها أقل من 5
    const filtered = products.filter(p => p.quantity < 5)
    setLowStockProducts(filtered)
  }, [])

  useEffect(() => {
    loadLowStock()
    window.addEventListener(DB_UPDATE_EVENT, loadLowStock)
    window.addEventListener('storage', loadLowStock)
    return () => {
      window.removeEventListener(DB_UPDATE_EVENT, loadLowStock)
      window.removeEventListener('storage', loadLowStock)
    }
  }, [loadLowStock])

  const criticalCount = lowStockProducts.length

  return (
    <div className="p-8 space-y-8" dir={dir}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-primary flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
            {t.inventoryAlerts}
          </h1>
          <p className="text-muted-foreground">عرض تلقائي للمنتجات التي أوشكت كميتها على النفاد من المخزن.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className={`border-none shadow-md ${criticalCount > 0 ? 'bg-orange-50 dark:bg-orange-900/10' : 'bg-green-50 dark:bg-green-900/10'}`}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-medium flex items-center justify-between ${criticalCount > 0 ? 'text-orange-800' : 'text-green-800'}`}>
              {t.criticalStock}
              <AlertTriangle className={`h-4 w-4 ${criticalCount > 0 ? 'text-orange-500' : 'text-green-500'}`} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${criticalCount > 0 ? 'text-orange-700' : 'text-green-700'}`}>
              {criticalCount} {t.product}
            </div>
            <p className="text-[10px] opacity-80 mt-4">منتجات كميتها أقل من 5 قطع</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-2xl border-2 bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 border-none">
              <TableHead className="font-bold">{t.productName}</TableHead>
              <TableHead className="font-bold">{t.stock}</TableHead>
              <TableHead className="font-bold">{t.sellingPrice}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lowStockProducts.length > 0 ? (
              lowStockProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-black text-slate-800 dark:text-slate-200">
                    {product.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 font-bold px-3 py-1">
                      {product.quantity} {t.units}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold">
                    ${(product.sellingPrice || product.price || 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-48 text-center text-muted-foreground italic">
                  <div className="flex flex-col items-center gap-2">
                    <ShoppingCart className="h-8 w-8 opacity-20" />
                    {t.allGood}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
