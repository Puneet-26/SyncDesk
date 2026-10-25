import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  GitMerge,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Building2,
  AlertCircle,
  Layers,
  ArrowUpRight
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid
} from "recharts";
import { api } from "../api/client";
import { KPISummary, PriorityQueueItem } from "../types";

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<KPISummary | null>(null);
  const [bureauStats, setBureauStats] = useState<any[]>([]);
  const [statusStats, setStatusStats] = useState<any[]>([]);
  const [regionStats, setRegionStats] = useState<any[]>([]);
  const [ageingStats, setAgeingStats] = useState<any[]>([]);
  const [trendStats, setTrendStats] = useState<any[]>([]);
  const [priorityQueue, setPriorityQueue] = useState<PriorityQueueItem[]>([]);
  const [instStatus, setInstStatus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);

    try {
      const [kpiRes, burRes, stRes, regRes, ageRes, trRes, pqRes, instRes] = await Promise.all([
        api.get<KPISummary>("/dashboard/kpi-summary"),
        api.get<any[]>("/dashboard/bureau-stats"),
        api.get<any[]>("/dashboard/status-distribution"),
        api.get<any[]>("/dashboard/region-stats"),
        api.get<any[]>("/dashboard/ageing-stats"),
        api.get<any[]>("/dashboard/disposal-trend"),
        api.get<PriorityQueueItem[]>("/dashboard/priority-queue"),
        api.get<any[]>("/dashboard/institution-status")
      ]);

      setKpis(kpiRes);
      setBureauStats(burRes);
      setStatusStats(stRes);
      setRegionStats(regRes);
      setAgeingStats(ageRes);
      setTrendStats(trRes);
      setPriorityQueue(pqRes);
      setInstStatus(instRes);
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(false);
    // 5-second background polling
    const interval = setInterval(() => fetchDashboardData(true), 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !kpis) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-slate-200 rounded-lg"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-slate-200 rounded-lg"></div>
          <div className="h-72 bg-slate-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Real-time surveillance header & manual refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-2">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center">
            <span>SyncDesk Institutional Vigilance Overview</span>
            {isRefreshing && (
              <span className="ml-2.5 inline-flex items-center text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                <RefreshCw className="w-3 h-3 animate-spin mr-1" /> Syncing live DB...
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            AICTE Cross-Bureau Regulatory Actions • SLA Statutory Watch • Conflict Interception
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchDashboardData(false)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh Now</span>
          </button>
          <Link
            to="/cases/new"
            className="flex items-center space-x-1 px-3 py-1.5 bg-[#0f2942] hover:bg-blue-900 text-white rounded text-xs font-bold shadow-sm transition"
          >
            <span>+ Lodge New Complaint</span>
          </Link>
        </div>
      </div>

      {/* Prominent Overlap Notice Banner */}
      {kpis && kpis.active_overlap_institutions > 0 && (
        <div className="p-4 rounded-lg bg-amber-500/10 border-2 border-amber-500/40 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-amber-500 text-white rounded-lg mt-0.5 shrink-0 shadow">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center">
                <span>POTENTIAL OVERLAPPING CASES: COORDINATION REQUIRED</span>
                <span className="ml-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {kpis.active_overlap_institutions} Institutions Affected
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                Multiple active regulatory and grievance proceedings detected across Regulation Bureau, PGRC, and Regional Offices for the same institution. Immediate cross-bureau review is recommended to avoid conflicting orders.
              </p>
            </div>
          </div>
          <Link
            to="/overlaps"
            className="self-start md:self-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded shadow flex items-center space-x-1.5 shrink-0 transition"
          >
            <span>Launch Overlap Intelligence</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Primary KPI Grid (8 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
        {/* Total Cases */}
        <div className="aicte-card p-4 border-l-4 border-l-blue-900">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Received</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{kpis?.total_cases ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center">
            <FileText className="w-3.5 h-3.5 mr-1 text-blue-900" /> All Bureaus & Regions
          </div>
        </div>

        {/* Pending Cases */}
        <div className="aicte-card p-4 border-l-4 border-l-amber-500">
          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Pending Initial Review</div>
          <div className="text-2xl font-black text-amber-900 mt-1">{kpis?.pending_cases ?? 0}</div>
          <div className="text-[11px] text-amber-700 mt-1 flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" /> Awaiting Bureau Scrutiny
          </div>
        </div>

        {/* Under Process */}
        <div className="aicte-card p-4 border-l-4 border-l-blue-600">
          <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Under Process</div>
          <div className="text-2xl font-black text-blue-900 mt-1">{kpis?.under_process_cases ?? 0}</div>
          <div className="text-[11px] text-blue-600 mt-1 flex items-center">
            <Layers className="w-3.5 h-3.5 mr-1 text-blue-600" /> Active Investigation
          </div>
        </div>

        {/* Overdue Cases */}
        <div className="aicte-card p-4 border-l-4 border-l-red-600 bg-red-50/20">
          <div className="text-[11px] font-bold text-red-700 uppercase tracking-wider">SLA Breached (Overdue)</div>
          <div className="text-2xl font-black text-red-700 mt-1">{kpis?.overdue_cases ?? 0}</div>
          <div className="text-[11px] text-red-600 mt-1 flex items-center font-medium">
            <AlertCircle className="w-3.5 h-3.5 mr-1 text-red-600" /> Exceeded Statutory Days
          </div>
        </div>

        {/* Transferred Cases */}
        <div className="aicte-card p-4 border-l-4 border-l-purple-600">
          <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Transferred</div>
          <div className="text-2xl font-black text-purple-900 mt-1">{kpis?.transferred_cases ?? 0}</div>
          <div className="text-[11px] text-purple-600 mt-1">Inter-Bureau Reassignment</div>
        </div>

        {/* Escalated Cases */}
        <div className="aicte-card p-4 border-l-4 border-l-rose-600">
          <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Escalated</div>
          <div className="text-2xl font-black text-rose-900 mt-1">{kpis?.escalated_cases ?? 0}</div>
          <div className="text-[11px] text-rose-600 mt-1">Senior Authority Intervention</div>
        </div>

        {/* Disposed Cases */}
        <div className="aicte-card p-4 border-l-4 border-l-emerald-600">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Disposed (Resolved)</div>
          <div className="text-2xl font-black text-emerald-900 mt-1">{kpis?.disposed_cases ?? 0}</div>
          <div className="text-[11px] text-emerald-600 mt-1 flex items-center">
            <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Verified Regulatory Disposal
          </div>
        </div>

        {/* SLA Compliance Rate */}
        <div className="aicte-card p-4 border-l-4 border-l-teal-600">
          <div className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">SLA Compliance</div>
          <div className="text-2xl font-black text-teal-900 mt-1">{kpis?.sla_compliance_rate ?? 0}%</div>
          <div className="text-[11px] text-teal-600 mt-1 flex items-center">
            <TrendingUp className="w-3.5 h-3.5 mr-1 text-teal-600" /> Statutory Timeliness
          </div>
        </div>
      </div>

      {/* Charts Section: Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bureau-wise Workload */}
        <div className="aicte-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Bureau-Wise Surveillance Workload</h2>
              <p className="text-[11px] text-slate-500">Distribution of cases currently allocated per Bureau</p>
            </div>
            <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              Live Aggregate
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bureauStats} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="bureau" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f2942", color: "#fff", borderRadius: "6px", fontSize: "11px" }}
                />
                <Bar dataKey="total" fill="#1e3a8a" name="Total Cases" radius={[4, 4, 0, 0]} />
                <Bar dataKey="overdue" fill="#ef4444" name="Overdue Cases" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="aicte-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Lifecycle Status Breakdown</h2>
              <p className="text-[11px] text-slate-500">Categorization across procedural stages</p>
            </div>
            <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              Current Active Ratio
            </span>
          </div>

          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusStats}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {statusStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f2942", color: "#fff", borderRadius: "6px", fontSize: "11px" }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Section: Row 2 (Ageing & Intake Trend) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Case Ageing Analysis */}
        <div className="aicte-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Case Ageing Brackets (Pending Disposal)</h2>
              <p className="text-[11px] text-slate-500">Days elapsed since formal receipt of complaint</p>
            </div>
            <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              Statutory Brackets
            </span>
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageingStats} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="bracket" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f2942", color: "#fff", borderRadius: "6px", fontSize: "11px" }}
                />
                <Bar dataKey="count" fill="#d97706" name="Active Cases" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 6-Month Intake vs Disposal Trend */}
        <div className="aicte-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Monthly Intake vs Disposal Velocity</h2>
              <p className="text-[11px] text-slate-500">6-Month historical intake vs disposal reconciliation</p>
            </div>
            <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              Disposal Velocity
            </span>
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendStats} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f2942", color: "#fff", borderRadius: "6px", fontSize: "11px" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line type="monotone" dataKey="intake" stroke="#1e3a8a" strokeWidth={2} name="Intake" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="disposed" stroke="#059669" strokeWidth={2} name="Disposed" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Priority Action Queue */}
      <div className="aicte-card p-5 border-t-4 border-t-red-600">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center">
              <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
              Statutory Priority & Escalation Queue
            </h2>
            <p className="text-xs text-slate-500">
              Surveillance items prioritized automatically by SLA breaches, imminent deadlines, or cross-bureau conflicts
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {priorityQueue.length} Urgent Items
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 text-slate-700 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Item / Target</th>
                <th className="py-2.5 px-3">Type & Severity</th>
                <th className="py-2.5 px-3">Institution</th>
                <th className="py-2.5 px-3">Current Bureau</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3">Prioritization Rationale</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {priorityQueue.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    No urgent priority items pending immediate intervention.
                  </td>
                </tr>
              ) : (
                priorityQueue.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-blue-900">{item.case_id}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.severity === "CRITICAL"
                          ? "bg-red-100 text-red-800 border border-red-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}>
                        {item.type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 max-w-xs truncate">{item.institution}</td>
                    <td className="py-2.5 px-3 text-slate-600">{item.bureau}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{item.due_date}</td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-md">{item.priority_reason}</td>
                    <td className="py-2.5 px-3 text-right">
                      {item.type === "CROSS_BUREAU_OVERLAP" ? (
                        <Link
                          to={`/overlaps?id=${item.overlap_id}`}
                          className="text-xs font-bold text-blue-700 hover:text-blue-900 underline inline-flex items-center"
                        >
                          Review Overlap <ArrowUpRight className="w-3 h-3 ml-0.5" />
                        </Link>
                      ) : (
                        <Link
                          to={`/cases/${item.internal_id}`}
                          className="text-xs font-bold text-blue-700 hover:text-blue-900 underline inline-flex items-center"
                        >
                          View Case <ArrowUpRight className="w-3 h-3 ml-0.5" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Institution Regulatory Surveillance Table */}
      <div className="aicte-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center">
              <Building2 className="w-4 h-4 text-blue-900 mr-2" />
              Institutions Under Surveillance (Highest Active Burden)
            </h2>
            <p className="text-xs text-slate-500">
              Consolidated institutional metrics across all Bureaus and Regional Offices
            </p>
          </div>
          <Link
            to="/institutions"
            className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center"
          >
            <span>View All Institutions</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Institution Name</th>
                <th className="py-2.5 px-3">AICTE Permanent ID</th>
                <th className="py-2.5 px-3">Region</th>
                <th className="py-2.5 px-3 text-center">Total</th>
                <th className="py-2.5 px-3 text-center">Active</th>
                <th className="py-2.5 px-3 text-center">Overdue</th>
                <th className="py-2.5 px-3 text-center">Overlaps</th>
                <th className="py-2.5 px-3">Involved Bureaus</th>
                <th className="py-2.5 px-3">Most Recent Action</th>
                <th className="py-2.5 px-3 text-right">360 View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {instStatus.slice(0, 10).map((inst) => (
                <tr key={inst.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-900 max-w-xs truncate">
                    {inst.official_name}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                    {inst.aicte_permanent_id}
                  </td>
                  <td className="py-2.5 px-3">{inst.region}</td>
                  <td className="py-2.5 px-3 text-center font-semibold">{inst.total_cases}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-blue-900">{inst.active_cases}</td>
                  <td className="py-2.5 px-3 text-center">
                    {inst.overdue_cases > 0 ? (
                      <span className="bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                        {inst.overdue_cases}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {inst.overlap_count > 0 ? (
                      <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                        {inst.overlap_count}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-wrap gap-1">
                      {inst.involved_bureaus.map((b: string) => (
                        <span key={b} className="text-[10px] bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded">
                          {b.replace("Regulation Bureau (RB)", "RB").replace("Public Grievance Redressal Cell (PGRC)", "PGRC").replace("Regional Office (RO)", "RO")}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate text-[11px]">
                    {inst.most_recent_action}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Link
                      to={`/institutions/${inst.id}`}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-blue-900 hover:text-white rounded text-[11px] font-bold text-blue-900 transition"
                    >
                      Profile →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
