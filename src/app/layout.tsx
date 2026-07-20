
import type { Metadata } from 'next';
import './globals.css';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { LanguageProvider } from '@/context/language-context';

export const metadata: Metadata = {
  title: 'Bedaya بداية لادارة المبيعات',
  description: 'Manage products and track daily sales ',
  icons: {
    icon: './king2.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <SidebarProvider defaultOpen={true}>
              <AppSidebar />
              <SidebarInset>
                <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
                  <SidebarTrigger className="-ml-1" />

                  {/* الاسم في النص */}
                  <div className="flex-1 text-center font-semibold text-lg">
                    شركة بداية للإلكترونيات
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 rounded-lg  flex items-center justify-center text-primary font-bold text-sm">
                      <img
                        src="/king2.png"
                        alt="Bedaya"
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </header>
                <main className="flex flex-col flex-1 overflow-y-auto">
                  {children}
                </main>
              </SidebarInset>
            </SidebarProvider>
          </LanguageProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
