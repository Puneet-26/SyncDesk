import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  Filter,
  ArrowUpDown,
  Building2,
  Calendar,
  AlertCircle,
  Clock,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle2,
  GitMerge
} from "lucide-react";
import { api } from "../api/client";
import { ComplaintCase } from "../types";

export const Cases: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [cases, setCases] = useState<ComplaintCase[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters initialized from URL search params
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [bureau, setBureau] = useState(searchParams.get("bureau") || "All");
  const [status, setStatus] = useState(searchParams.get("status") || "All");
  const [category, setCategory] = useState(searchParams.get("category") || "All");
  const [priority, setPriority] = useState(searchParams.get("priority") || "All");
  const [slaState, setSlaState] = useState(searchParams.get("sla_state") || "All");

  const [skip, setSkip] = useState(0);
  const limit = 25;

  const fetchCases = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (bureau !== "All") params.append("bureau", bureau);
      if (status !== "All") params.append("status", status);
      if (category !== "All") params.append("category", category);
      if (priority !== "All") params.append("priority", priority);
      if (slaState !== "All") params.append("sla_state", slaState);
      params.append("skip", skip.toString());
      params.append("limit", limit.toString());

      const res = await api.get<{ total: number; items: ComplaintCase[] }>(`/cases/?${params.toString()}`);
      setCases(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Sync filters with URL query parameters
    const nextParams = new URLSearchParams();
    if (search) nextParams.set("search", search);
    if (bureau !== "All") nextParams.set("bureau", bureau);
    if (status !== "All") nextParams.set("status", status);
    if (category !== "All") nextParams.set("category", category);
    if (priority !== "All") nextParams.set("priority", priority);
    if (slaState !== "All") nextParams.set("sla_state", slaState);
    setSearchParams(nextParams, { replace: true });

    fetchCases();
  }, [search, bureau, status, category, priority, slaState, skip]);

  const categories = [
    "Faculty Deficiencies",
    "Capitation Fees",
    "Infrastructure Non-Compliance",
    "Harassment",
    "Unauthorized Courses",
    "Excess Tuition Fees",
    "Laboratory Equipment Deficiencies",
    "Examination Irregularities",
    "Ragging Allegation",
    "Non-Refund of Security Deposit"
  ];

  return (
    <div className="space-y-5">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center">
            Complaint Cases Surveillance Registry
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Centralized intake across Regulation Bureau, PGRC, Regional Offices and Approval Bureau
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/cases/new"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#0f2942] hover:bg-blue-900 text-white rounded text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lodge New Complaint</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="aicte-card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Case ID, Institution, Allegation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-slate-50"
            />
          </div>

          {/* Bureau Filter */}
          <div>
            <select
              value={bureau}
              onChange={(e) => { setBureau(e.target.value); setSkip(0); }}
              className="w-full text-xs px-2.5 py-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-slate-50"
            >
              <option value="All">All Bureaus</option>
              <option value="Regulation Bureau (RB)">Regulation Bureau (RB)</option>
              <option value="Public Grievance Redressal Cell (PGRC)">PGRC</option>
              <option value="Regional Office (RO)">Regional Office (RO)</option>
              <option value="Approval Bureau">Approval Bureau</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setSkip(0); }}
              className="w-full text-xs px-2.5 py-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-slate-50"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Under Process">Under Process</option>
              <option value="Disposed">Disposed</option>
              <option value="Transferred">Transferred</option>
              <option value="Escalated">Escalated</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setSkip(0); }}
              className="w-full text-xs px-2.5 py-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-slate-50 truncate"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* SLA State Filter */}
          <div>
            <select
              value={slaState}
              onChange={(e) => { setSlaState(e.target.value); setSkip(0); }}
              className="w-full text-xs px-2.5 py-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-slate-50"
            >
              <option value="All">All SLA States</option>
              <option value="OVERDUE">Overdue (Breached)</option>
              <option value="APPROACHING">Approaching Deadline</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <div>
            Found <strong className="text-slate-800">{total}</strong> total cases matching filters
          </div>
          {(search || bureau !== "All" || status !== "All" || category !== "All" || priority !== "All" || slaState !== "All") && (
            <button
              onClick={() => {
                setSearch("");
                setBureau("All");
                setStatus("All");
                setCategory("All");
                setPriority("All");
                setSlaState("All");
                setSkip(0);
              }}
              className="text-xs text-blue-700 hover:text-blue-900 font-semibold underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Case Table */}
      <div className="aicte-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 text-slate-700 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">Case ID</th>
                <th className="py-3 px-3.5">Institution & ID</th>
                <th className="py-3 px-3.5">Category</th>
                <th className="py-3 px-3.5">Current Bureau</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">Priority</th>
                <th className="py-3 px-3.5">SLA Due Date</th>
                <th className="py-3 px-3.5">Assigned Officer</th>
                <th className="py-3 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    Loading cases from persistent database...
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No complaint cases match your selected filter criteria.
                  </td>
                </tr>
              ) : (
                cases.map((c) => {
                  const isOverdue = c.status !== "Disposed" && new Date(c.sla_due_date) < new Date();
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3.5 font-bold text-blue-900 whitespace-nowrap">
                        <Link to={`/cases/${c.id}`} className="hover:underline flex items-center">
                          {c.case_id}
                        </Link>
                      </td>
                      <td className="py-3 px-3.5 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">
                          {c.institution_name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {c.aicte_permanent_id || <span className="text-amber-600 font-semibold">Unresolved</span>}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-medium text-slate-700">
                        {c.category}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="text-xs text-slate-600">{c.current_bureau}</span>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          c.status === "Pending" ? "bg-amber-100 text-amber-800" :
                          c.status === "Under Process" ? "bg-blue-100 text-blue-800" :
                          c.status === "Disposed" ? "bg-emerald-100 text-emerald-800" :
                          c.status === "Transferred" ? "bg-purple-100 text-purple-800" :
                          "bg-rose-100 text-rose-800"
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          c.priority === "CRITICAL" ? "bg-red-600 text-white" :
                          c.priority === "HIGH" ? "bg-orange-500 text-white" :
                          c.priority === "MEDIUM" ? "bg-slate-200 text-slate-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {c.priority}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px]">
                        <span className={isOverdue ? "text-red-700 font-bold flex items-center" : "text-slate-700"}>
                          {isOverdue && <AlertCircle className="w-3.5 h-3.5 mr-1 text-red-600 inline" />}
                          {c.sla_due_date}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-600">
                        {c.assigned_officer_name || <span className="text-slate-400 italic">Unassigned</span>}
                      </td>
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <Link
                          to={`/cases/${c.id}`}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-blue-900 hover:text-white rounded text-xs font-bold text-blue-900 transition"
                        >
                          Details →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing {cases.length > 0 ? skip + 1 : 0} to {Math.min(skip + limit, total)} of {total} cases
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={skip === 0}
              onClick={() => setSkip(Math.max(0, skip - limit))}
              className="px-3 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={skip + limit >= total}
              onClick={() => setSkip(skip + limit)}
              className="px-3 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
