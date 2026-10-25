import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Bell, Search, ShieldCheck, UserCheck, ChevronDown, CheckCircle2, AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Alert } from "../types";

export const Header: React.FC = () => {
  const { user, logout, quickSwitch } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showAlertMenu, setShowAlertMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const demoAccounts = [
    { name: "Dr. Rajesh Sharma", role: "RB Officer", email: "rb.officer@aicte.gov.in" },
    { name: "Smt. Sunita Verma", role: "PGRC Officer", email: "pgrc.officer@aicte.gov.in" },
    { name: "Shri Arvind Kulkarni", role: "Regional Officer", email: "regional.officer@aicte.gov.in" },
    { name: "Prof. K. R. Ramanathan", role: "Senior Management", email: "senior.mgmt@aicte.gov.in" },
    { name: "System Administrator", role: "Admin", email: "admin@aicte.gov.in" },
  ];

  const fetchAlerts = async () => {
    try {
      const res = await api.get<{ unread_count: number; items: Alert[] }>("/alerts/?limit=6&unread_only=true");
      setUnreadCount(res.unread_count || 0);
      setAlerts(res.items || []);
    } catch {
      // ignore in background
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/cases?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post("/alerts/read-all");
      setUnreadCount(0);
      setAlerts([]);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="tricolour-bar"></div>
      <div className="px-6 py-2.5 flex items-center justify-between">
        {/* Left Title branding */}
        <div className="flex items-center space-x-3">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-lg bg-white p-0.5 flex items-center justify-center shadow-sm border border-slate-200 group-hover:border-amber-400 transition-colors">
              <img
                src="/syncdesk-icon.png"
                alt="SyncDesk Shield"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-base flex items-center">
                  <span className="text-[#0B2545]">Sync</span>
                  <span className="text-[#C19A5B]">Desk</span>
                  <span className="mx-2 text-slate-300 font-normal">|</span>
                  <span className="text-slate-800 font-bold">AICTE Complaint Monitoring & Coordination</span>
                </span>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded border border-amber-300">
                  SIH26264
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                EDUCATION · ACCESS · SERVICE • Statutory Bureau Surveillance & Conflict Interception
              </p>
            </div>
          </Link>
        </div>

        {/* Global Search */}
        <form onSubmit={handleSearch} className="hidden md:flex items-center relative w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search Case ID, Institution, AICTE ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 bg-slate-50/70"
          />
        </form>

        {/* Right side controls */}
        <div className="flex items-center space-x-4">
          {/* Quick Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center space-x-2 text-xs font-medium px-2.5 py-1.5 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700"
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-700" />
              <span>Role: <strong className="text-blue-900">{user?.role}</strong></span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-xl py-2 z-50">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Switch Demo Persona (SIH Judges)
                </div>
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={async () => {
                      await quickSwitch(acc.email);
                      setShowRoleMenu(false);
                      window.location.reload();
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-blue-50 ${user?.email === acc.email ? "bg-blue-50/80 font-bold text-blue-900" : "text-slate-700"}`}
                  >
                    <div>
                      <div className="font-semibold">{acc.name}</div>
                      <div className="text-[10px] text-slate-500">{acc.role}</div>
                    </div>
                    {user?.email === acc.email && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowAlertMenu(!showAlertMenu)}
              className="relative p-2 rounded-full hover:bg-slate-100 text-slate-600 focus:outline-none"
              title="SLA & Overlap Alerts"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showAlertMenu && (
              <div className="absolute right-0 mt-2 w-96 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold tracking-wide">Surveillance Alerts ({unreadCount} Unread)</span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] text-slate-300 hover:text-white underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {alerts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No unread alerts. All SLAs and institutional relationships clear.
                    </div>
                  ) : (
                    alerts.map((al) => (
                      <div
                        key={al.id}
                        onClick={() => {
                          setShowAlertMenu(false);
                          if (al.case_id) navigate(`/cases/${al.case_id}`);
                          else navigate("/alerts");
                        }}
                        className="p-3 hover:bg-slate-50 cursor-pointer text-left transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${al.severity === "CRITICAL" ? "bg-red-100 text-red-800" : al.severity === "HIGH" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
                            {al.type}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(al.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 truncate">{al.title}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{al.message}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2 text-center bg-slate-50 border-t border-slate-100">
                  <Link
                    to="/alerts"
                    onClick={() => setShowAlertMenu(false)}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                  >
                    View All SLA & Overlap Alerts →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Avatar badge */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-blue-900 text-white font-bold text-xs flex items-center justify-center">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="hidden lg:block text-left leading-tight">
              <div className="text-xs font-bold text-slate-800">{user?.name}</div>
              <div className="text-[10px] text-slate-500">{user?.bureau}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
