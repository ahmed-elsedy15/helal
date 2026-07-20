"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut, 
  User 
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signingIn: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // التحقق من نتيجة إعادة التوجيه عند تحميل الصفحة
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          toast({
            title: "تم تسجيل الدخول",
            description: `أهلاً بك ${result.user.displayName}`,
          });
        }
      })
      .catch((error) => {
        console.error("Redirect result error:", error);
      });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      setSigningIn(false);
    }, (error) => {
      console.error("Auth state change error:", error);
      setLoading(false);
      setSigningIn(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const loginWithGoogle = async () => {
    if (signingIn) return;
    
    setSigningIn(true);
    try {
      // استخدام Redirect بدلاً من Popup لضمان العمل في كل المتصفحات
      await signInWithRedirect(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed:", error);
      setSigningIn(false);
      toast({
        title: "خطأ في تسجيل الدخول",
        description: "تعذر بدء عملية تسجيل الدخول. يرجى المحاولة مرة أخرى.",
        variant: "destructive"
      });
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "تم تسجيل الخروج",
        description: "تم تسجيل الخروج بنجاح.",
      });
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signingIn, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
