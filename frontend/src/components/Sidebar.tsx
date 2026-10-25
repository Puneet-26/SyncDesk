import React from "react";
import { NavLink, Link } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Building2,
  GitMerge,
  Users2,
  BellRing,
  BarChart3,
  ShieldAlert,
  History,
  LogOut,
  Sparkles
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export const Sidebar: React.FC = () => {
  const { user, logout, hasRole } = useAuth();

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { label: "Complaint Cases", icon: FileText, path: "/cases" },
    { label: "Institution 360", icon: Building2, path: "/institutions" },
    { label: "Overlap Intelligence", icon: GitMerge, path: "/overlaps", highlight: true },
    { label: "Coordination Space", icon: Users2, path: "/coordination" },
    { label: "Surveillance Alerts", icon: BellRing, path: "/alerts" },
    { label: "Reports & Analytics", icon: BarChart3, path: "/reports" },
  ];

  const adminItems = [
    { label: "User Management", icon: ShieldAlert, path: "/admin/users", roles: ["Admin"] },
    { label: "Regulatory Audit Log", icon: History, path: "/admin/audit", roles: ["Senior Management", "Admin"] },
  ];

  return (
    <aside className="w-64 bg-[#0a192f] text-slate-300 flex flex-col min-h-screen border-r border-slate-800 shrink-0">
      {/* Official SyncDesk Brand Header */}
      <div className="px-4 py-3 border-b border-slate-800 bg-[#0B2545]/95">
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 shadow-sm border border-slate-700/60 group-hover:border-amber-400 transition-colors">
            <img
              src="/syncdesk-icon.png"
              alt="SyncDesk Shield"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center">
              <span className="text-base font-black tracking-tight text-white">Sync</span>
              <span className="text-base font-black tracking-tight text-[#C19A5B]">Desk</span>
            </div>
            <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 truncate">
              AICTE Vigilance System
            </div>
          </div>
        </Link>
      </div>

      {/* Bureau Identifier Badge */}
      <div className="p-4 border-b border-slate-800">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Surveillance Context
        </div>
        <div className="bg-slate-800/80 rounded p-2 border border-slate-700/60">
          <div className="text-xs font-semibold text-white flex items-center justify-between">
            <span className="truncate">{user?.bureau}</span>
          </div>
          <div className="text-[11px] text-blue-400 mt-0.5">
            Region: {user?.region || "All"}
          </div>
        </div>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Main Modules
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                isActive
                  ? "bg-blue-900 text-white font-semibold shadow-sm"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <div className="flex items-center space-x-3">
              <item.icon className="w-4 h-4 text-slate-400 group-hover:text-white" />
              <span>{item.label}</span>
            </div>
            {item.highlight && (
              <span className="flex items-center text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                <Sparkles className="w-2.5 h-2.5 mr-0.5" /> AI
              </span>
            )}
          </NavLink>
        ))}

        {/* Administration Section */}
        {(hasRole(["Admin"]) || hasRole(["Senior Management"])) && (
          <div className="pt-5 space-y-1">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Governance & Security
            </div>
            {adminItems
              .filter((item) => hasRole(item.roles))
              .map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                      isActive
                        ? "bg-blue-900 text-white font-semibold"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 text-slate-400" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
          </div>
        )}
      </nav>

      {/* Bottom Footer Info & Logout */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-center space-x-1.5 text-[10px] text-slate-400 mb-2 font-medium">
          <img src="/syncdesk-icon.png" alt="SyncDesk" className="w-3.5 h-3.5 object-contain rounded" />
          <span>SyncDesk AICTE Surveillance v1.0</span>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-950/60 rounded border border-rose-900/40 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
