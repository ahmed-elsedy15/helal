"use client";

import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Sun,
  Moon,
  Languages,
  Users,
  Store,
  Receipt,
  Truck,
  AlertTriangle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useTranslation } from "@/context/language-context";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t, dir } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const { state } = useSidebar();

  useEffect(() => {
    setMounted(true);
  }, []);

  const items = [
    {
      title: t.dashboard,
      url: "/",
      icon: LayoutDashboard,
    },
    {
      title: t.products,
      url: "/products",
      icon: Package,
    },
    { title: t.inventoryAlerts, 
      url: "/inventory-alerts", 
      icon: AlertTriangle },
    {
      title: t.purchases,
      url: "/purchases",
      icon: Truck,
    },

    {
      title: t.customers,
      url: "/customers",
      icon: Users,
    },
    {
      title: t.salesEntry,
      url: "/sales-entry",
      icon: ShoppingCart,
    },
    {
      title: t.reports,
      url: "/reports",
      icon: BarChart3,
    },
    {
      title: t.expenses,
      url: "/expenses",
      icon: Receipt,
    },
  ];

  if (!mounted) return null;

  return (
    <Sidebar collapsible="icon" side={dir === "rtl" ? "right" : "left"}>
      <SidebarHeader
        className={cn(
          "h-24 flex items-center border-b bg-primary/5 transition-all duration-300",
          state === "collapsed" ? "px-0 justify-center" : "px-4",
        )}
      >
        <div
          className={cn(
            "flex items-center w-full",
            state === "collapsed" ? "justify-center" : "gap-4",
          )}
        >
          <div className="min-w-12 w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-xl shadow-primary/20 shrink-0 transform transition-transform duration-300 hover:rotate-6">
            <Store className="h-7 w-7" />
          </div>
          {state !== "collapsed" && (
            <div className="flex flex-col overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="font-headline font-black text-2xl tracking-tight whitespace-nowrap text-primary">
                Bedaya
              </span>
              <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-[0.2em] whitespace-nowrap">
                Eletronics
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupLabel
            className={cn(
              "px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2",
              state === "collapsed" && "sr-only",
            )}
          >
            {t.management}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-2">
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    className="h-11 px-4 rounded-xl transition-all duration-200"
                  >
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon
                        className={cn(
                          "h-5 w-5 transition-colors",
                          pathname === item.url
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      />
                      <span className="font-medium text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t bg-muted/20 space-y-2">
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-10 rounded-xl hover:bg-white dark:hover:bg-slate-800 shadow-sm border border-transparent hover:border-border"
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              tooltip={t.language}
            >
              <Languages className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold">
                {lang === "en" ? "العربية" : "English"}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-10 rounded-xl hover:bg-white dark:hover:bg-slate-800 shadow-sm border border-transparent hover:border-border"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              tooltip={t.mode}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-500" />
              ) : (
                <Moon className="h-4 w-4 text-indigo-600" />
              )}
              <span className="text-xs font-semibold">
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
