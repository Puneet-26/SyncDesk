import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "../types";
import { api } from "../api/client";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  quickSwitch: (roleEmail: string) => Promise<void>;
  hasRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("aicte_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("aicte_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      const savedToken = localStorage.getItem("aicte_token");
      if (savedToken) {
        try {
          const profile = await api.get<User>("/auth/me");
          setUser(profile);
          localStorage.setItem("aicte_user", JSON.stringify(profile));
        } catch {
          logout();
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, []);

  const login = async (email: string, password: string = "Password@123") => {
    const res = await api.post<{ access_token: string; user: User }>("/auth/login", {
      email,
      password
    });
    localStorage.setItem("aicte_token", res.access_token);
    localStorage.setItem("aicte_user", JSON.stringify(res.user));
    setToken(res.access_token);
    setUser(res.user);
  };

  const quickSwitch = async (roleEmail: string) => {
    await login(roleEmail, "Password@123");
  };

  const logout = () => {
    localStorage.removeItem("aicte_token");
    localStorage.removeItem("aicte_user");
    setToken(null);
    setUser(null);
  };

  const hasRole = (roles: string[]) => {
    if (!user) return false;
    if (user.role === "Admin") return true;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, quickSwitch, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
