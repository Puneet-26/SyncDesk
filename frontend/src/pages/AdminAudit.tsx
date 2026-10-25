import React, { useState, useEffect } from "react";
import { History, Shield, RefreshCw } from "lucide-react";
import { api } from "../api/client";
import { AuditEvent } from "../types";

export const AdminAudit: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [entityFilter, setEntityFilter] = useState("All");
  const [opFilter, setOpFilter] = useState("All");

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityFilter !== "All") params.append("entity_type", entityFilter);
      if (opFilter !== "All") params.append("operation", opFilter);
      params.append("limit", "100");

      const res = await api.get<{ total: number; items: AuditEvent[] }>(`/admin/audit-events?${params.toString()}`);
      setEvents(res.items);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, [entityFilter, opFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center">
            <History className="w-5 h-5 mr-2 text-blue-900" />
            Statutory Regulatory Audit Trail
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Immutable log of all administrative actions, transfers, escalations, overlap confirmations, and case disposals
          </p>
        </div>
      </div>

      <div className="aicte-card p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <div>
            <span className="font-bold text-slate-700 mr-2">Entity:</span>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="p-1.5 rounded border border-slate-300 bg-slate-50"
            >
              <option value="All">All Entities</option>
              <option value="CASE">CASE</option>
              <option value="INSTITUTION">INSTITUTION</option>
              <option value="OVERLAP">OVERLAP</option>
              <option value="COORDINATION">COORDINATION</option>
            </select>
          </div>

          <div>
            <span className="font-bold text-slate-700 mr-2">Operation:</span>
            <select
              value={opFilter}
              onChange={(e) => setOpFilter(e.target.value)}
              className="p-1.5 rounded border border-slate-300 bg-slate-50"
            >
              <option value="All">All Operations</option>
              <option value="CREATE">CREATE</option>
              <option value="TRANSFER">TRANSFER</option>
              <option value="ESCALATE">ESCALATE</option>
              <option value="DISPOSE">DISPOSE</option>
              <option value="REOPEN">REOPEN</option>
              <option value="CONFIRM_OVERLAP">CONFIRM_OVERLAP</option>
              <option value="DISMISS_OVERLAP">DISMISS_OVERLAP</option>
            </select>
          </div>
        </div>

        <div className="text-slate-500">
          Total Logged Operations: <strong>{total}</strong>
        </div>
      </div>

      <div className="aicte-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Entity Type</th>
                <th className="py-2.5 px-3">Entity ID</th>
                <th className="py-2.5 px-3">Operation</th>
                <th className="py-2.5 px-3">Details / Audit Snapshot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    Querying audit events...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No audit records matching filter criteria.
                  </td>
                </tr>
              ) : (
                events.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(e.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{e.actor_name}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">
                        {e.entity_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-blue-900">{e.entity_id}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        e.operation === "DISPOSE" ? "bg-emerald-100 text-emerald-800" :
                        e.operation === "CONFIRM_OVERLAP" ? "bg-purple-100 text-purple-800" :
                        e.operation === "ESCALATE" ? "bg-red-100 text-red-800" :
                        "bg-blue-100 text-blue-800"
                      }`}>
                        {e.operation}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 max-w-md truncate font-mono text-[11px] text-slate-600">
                      {JSON.stringify(e.after_state)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
