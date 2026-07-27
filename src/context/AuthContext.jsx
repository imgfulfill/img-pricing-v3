import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const resolved = useRef(false);

  const isAdmin = user?.r === "admin";

  const done = () => { if (!resolved.current) { resolved.current = true; setLoading(false); } };

  const setBasicUser = (authUser) => {
    setUser({ id: authUser.id, u: authUser.email, r: "admin", n: authUser.email });
  };

  const fetchProfile = async (authUser) => {
    // Set basic user immediately so app doesn't hang
    setBasicUser(authUser);
    done();

    // Then try to fetch profile in background
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (profile) {
        setUser({
          id: authUser.id,
          u: profile.email,
          r: profile.role || "staff",
          n: profile.full_name || profile.email,
        });
      }
    } catch (err) {
      console.warn("Profile fetch failed:", err.message);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { console.warn("Auth timeout"); done(); }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth event:", event);
        if (session?.user) {
          fetchProfile(session.user);
        } else {
          setUser(null);
          done();
        }
      }
    );

    return () => { clearTimeout(timer); subscription.unsubscribe(); };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, msg: error.message };
    // Set user immediately, don't wait for profile
    setBasicUser(data.user);
    done();
    // Fetch profile in background
    fetchProfile(data.user);
    return { ok: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
