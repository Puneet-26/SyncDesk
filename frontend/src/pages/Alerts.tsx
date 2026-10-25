import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BellRing,
  AlertTriangle,
  AlertCircle,
  Clock,
  GitMerge,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Eye,
  Check
} from "lucide-react";
import { api } from "../api/client";
import { Alert } from "../types";

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "All") params.append("type_filter", typeFilter);
      if (severityFilter !== "All") params.append("severity", severityFilter);
      if (unreadOnly) params.append("unread_only", "true");
      params.append("limit", "100");

      const res = await api.get<{ total: number; unread_count: number; items: Alert[] }>(`/alerts/?${params.toString()}`);
      setAlerts(res.items);
      setTotal(res.total);
      setUnreadCount(res.unread_count);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [typeFilter, severityFilter, unreadOnly]);

  const handleMarkRead = async (id: number) => {
    try {
      await api.post(`/alerts/${id}/read`);
      await fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post("/alerts/read-all");
      await fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolveAlert = async (id: number) => {
    try {
      await api.post(`/alerts/${id}/resolve`, {});
      await fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  const alertTypes = [
    "Overlap",
    "SLA Breached",
    "SLA Approaching",
    "Pending Reminder",
    "Escalation",
    "Institution Resolution Required"
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center">
            <BellRing className="w-5 h-5 mr-2 text-blue-900" />
            Surveillance Alerts & SLA Deadline Center
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Proactive statutory SLA countdown, breach triggers, cross-bureau overlap warnings, and resolution alerts
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-semibold border border-slate-300 transition"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-900" />
            <span>Mark All Read ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="aicte-card p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <span className="font-bold text-slate-700 mr-2">Alert Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="p-1.5 rounded border border-slate-300 bg-slate-50"
            >
              <option value="All">All Types</option>
              {alertTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <span className="font-bold text-slate-700 mr-2">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="p-1.5 rounded border border-slate-300 bg-slate-50"
            >
              <option value="All">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          <label className="flex items-center space-x-1.5 cursor-pointer font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="rounded text-blue-900 focus:ring-0"
            />
            <span>Show Unread Only</span>
          </label>
        </div>

        <div className="text-slate-500">
          Showing <strong>{alerts.length}</strong> alerts ({unreadCount} unread)
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {loading ? (
          <div className="aicte-card p-12 text-center text-xs text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
            Refreshing surveillance alert registry...
          </div>
        ) : alerts.length === 0 ? (
          <div className="aicte-card p-12 text-center text-xs text-slate-400">
            No alerts matching your current filter criteria.
          </div>
        ) : (
          alerts.map((al) => (
            <div
              key={al.id}
              className={`aicte-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-l-4 transition ${
                !al.is_read ? "bg-blue-50/20" : "bg-white"
              } ${
                al.severity === "CRITICAL"
                  ? "border-l-red-600"
                  : al.severity === "HIGH"
                  ? "border-l-amber-500"
                  : "border-l-blue-600"
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded mt-0.5 shrink-0 ${
                  al.severity === "CRITICAL" ? "bg-red-100 text-red-700" :
                  al.severity === "HIGH" ? "bg-amber-100 text-amber-700" :
                  "bg-blue-100 text-blue-700"
                }`}>
                  {al.type === "Overlap" ? <GitMerge className="w-4 h-4" /> :
                   al.type === "SLA Breached" ? <AlertCircle className="w-4 h-4" /> :
                   al.type === "Escalation" ? <ShieldAlert className="w-4 h-4" /> :
                   <Clock className="w-4 h-4 text-blue-700" />}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      al.severity === "CRITICAL" ? "bg-red-100 text-red-800" :
                      al.severity === "HIGH" ? "bg-amber-100 text-amber-800" :
                      "bg-blue-100 text-blue-800"
                    }`}>
                      {al.type}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(al.created_at).toLocaleString()}
                    </span>
                    {!al.is_read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    )}
                  </div>

                  <h3 className="text-xs font-bold text-slate-900">{al.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">{al.message}</p>

                  <div className="flex items-center space-x-3 text-[11px] text-slate-500 pt-1">
                    {al.case_number && (
                      <Link to={`/cases/${al.case_id}`} className="font-semibold text-blue-700 hover:underline">
                        Case: {al.case_number}
                      </Link>
                    )}
                    {al.institution_name && (
                      <span className="truncate">Institution: <strong>{al.institution_name}</strong></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                {!al.is_read && (
                  <button
                    onClick={() => handleMarkRead(al.id)}
                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 rounded border border-slate-200"
                  >
                    Mark Read
                  </button>
                )}

                {al.case_id && (
                  <Link
                    to={`/cases/${al.case_id}`}
                    className="px-3 py-1 bg-blue-900 hover:bg-blue-800 text-white rounded text-xs font-bold shadow-sm"
                  >
                    Inspect Dossier →
                  </Link>
                )}

                {!al.is_resolved && (
                  <button
                    onClick={() => handleResolveAlert(al.id)}
                    title="Mark resolved"
                    className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
