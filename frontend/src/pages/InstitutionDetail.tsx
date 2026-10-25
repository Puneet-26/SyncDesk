import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Building2,
  ChevronLeft,
  MapPin,
  Tag,
  Plus,
  ShieldCheck,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  GitMerge,
  Filter
} from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { Institution, ComplaintCase } from "../types";

export const InstitutionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [cases, setCases] = useState<ComplaintCase[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [bureauFilter, setBureauFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Add Alias Modal
  const [showAliasModal, setShowAliasModal] = useState(false);
  const [newAlias, setNewAlias] = useState("");
  const [aliasSubmitting, setAliasSubmitting] = useState(false);

  const fetchInstitutionData = async () => {
    setLoading(true);
    try {
      const [instRes, casesRes] = await Promise.all([
        api.get<Institution>(`/institutions/${id}`),
        api.get<ComplaintCase[]>(`/institutions/${id}/cases`)
      ]);
      setInstitution(instRes);
      setCases(casesRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutionData();
  }, [id]);

  const handleAddAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlias.trim()) return;
    setAliasSubmitting(true);
    try {
      await api.post(`/institutions/${id}/aliases`, {
        alias: newAlias.trim(),
        source: "PORTAL_ADMIN_ENTRY",
        verification_status: "VERIFIED"
      });
      setShowAliasModal(false);
      setNewAlias("");
      await fetchInstitutionData();
    } catch (err: any) {
      alert(err?.message || "Failed to add alias");
    } finally {
      setAliasSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading Institution 360 profile...</div>;
  }

  if (!institution) {
    return <div className="p-8 text-center text-xs text-red-600">Institution record not found.</div>;
  }

  const activeCases = cases.filter((c) => c.status !== "Disposed");
  const overdueCases = cases.filter((c) => c.status !== "Disposed" && new Date(c.sla_due_date) < new Date());
  const bureausInvolved = Array.from(new Set(cases.map((c) => c.current_bureau)));

  const filteredCases = cases.filter((c) => {
    const matchBureau = bureauFilter === "All" || c.current_bureau === bureauFilter;
    const matchStatus = statusFilter === "All" || c.status === statusFilter;
    return matchBureau && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center space-x-2 pb-2 border-b border-slate-200">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-200 rounded text-slate-600 mr-1">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {institution.aicte_permanent_id || "ID PENDING"}
            </span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center">
              <ShieldCheck className="w-3 h-3 mr-1" /> {institution.identity_verification_status}
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
            {institution.official_name}
          </h1>
          <div className="flex items-center text-xs text-slate-500 space-x-3 mt-0.5">
            <span className="flex items-center">
              <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
              {institution.address ? `${institution.address}, ` : ""}{institution.city}, {institution.state} ({institution.region} Region)
            </span>
            <span>• Type: {institution.institution_type}</span>
          </div>
        </div>
      </div>

      {/* Aliases & Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Verified Aliases */}
        <div className="md:col-span-2 aicte-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
              <Tag className="w-3.5 h-3.5 mr-1 text-blue-900" /> Verified Institutional Aliases
            </span>
            {hasRole(["Admin"]) && (
              <button
                onClick={() => setShowAliasModal(true)}
                className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center"
              >
                <Plus className="w-3 h-3 mr-0.5" /> Add Alias
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {institution.aliases && institution.aliases.length > 0 ? (
              institution.aliases.map((al) => (
                <span
                  key={al.id}
                  className="text-xs bg-slate-100 border border-slate-200 text-slate-800 px-2.5 py-1 rounded-md font-semibold"
                >
                  {al.alias}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">No historical aliases recorded.</span>
            )}
          </div>
        </div>

        {/* Total & Active Stats */}
        <div className="aicte-card p-4 border-l-4 border-l-blue-900">
          <span className="text-[11px] font-bold uppercase text-slate-500">Active Complaints</span>
          <div className="text-2xl font-black text-blue-900 mt-1">{activeCases.length}</div>
          <span className="text-[10px] text-slate-500">Out of {cases.length} Total Historical Cases</span>
        </div>

        {/* Overdue / Overlap Stats */}
        <div className="aicte-card p-4 border-l-4 border-l-amber-500">
          <span className="text-[11px] font-bold uppercase text-amber-700">Cross-Bureau Involvements</span>
          <div className="text-2xl font-black text-amber-900 mt-1">{bureausInvolved.length} Bureaus</div>
          <Link
            to={`/overlaps?institution_id=${institution.id}`}
            className="text-[11px] font-bold text-blue-700 hover:underline flex items-center mt-1"
          >
            <GitMerge className="w-3 h-3 mr-1" /> View Overlap Details →
          </Link>
        </div>
      </div>

      {/* Unified Multi-Bureau Complaint History */}
      <div className="aicte-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center">
              <FileText className="w-4 h-4 text-blue-900 mr-2" />
              Unified Multi-Bureau Case Dossier
            </h2>
            <p className="text-xs text-slate-500">
              Chronological consolidated record across Regulation Bureau, PGRC, and Regional Offices
            </p>
          </div>

          {/* Bureau & Status Filters */}
          <div className="flex items-center space-x-2">
            <select
              value={bureauFilter}
              onChange={(e) => setBureauFilter(e.target.value)}
              className="text-xs p-1.5 rounded border border-slate-300 bg-slate-50"
            >
              <option value="All">All Bureaus</option>
              <option value="Regulation Bureau (RB)">Regulation Bureau (RB)</option>
              <option value="Public Grievance Redressal Cell (PGRC)">PGRC</option>
              <option value="Regional Office (RO)">Regional Office (RO)</option>
              <option value="Approval Bureau">Approval Bureau</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs p-1.5 rounded border border-slate-300 bg-slate-50"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Under Process">Under Process</option>
              <option value="Disposed">Disposed</option>
              <option value="Transferred">Transferred</option>
              <option value="Escalated">Escalated</option>
            </select>
          </div>
        </div>

        {/* Timeline Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Case ID</th>
                <th className="py-2.5 px-3">Lodge Date</th>
                <th className="py-2.5 px-3">Bureau</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">SLA Due Date</th>
                <th className="py-2.5 px-3">Latest Action</th>
                <th className="py-2.5 px-3 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-400">
                    No cases match the selected filters for this institution.
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => {
                  const isOverdue = c.status !== "Disposed" && new Date(c.sla_due_date) < new Date();
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-blue-900 whitespace-nowrap">
                        <Link to={`/cases/${c.id}`} className="hover:underline">
                          {c.case_id}
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{c.date_received}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-700">{c.current_bureau}</td>
                      <td className="py-2.5 px-3">{c.category}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
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
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          c.priority === "CRITICAL" ? "bg-red-600 text-white" :
                          c.priority === "HIGH" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600"
                        }`}>
                          {c.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono">
                        <span className={isOverdue ? "text-red-700 font-bold" : "text-slate-600"}>
                          {c.sla_due_date}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 max-w-xs truncate text-slate-600">{c.last_action}</td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <Link
                          to={`/cases/${c.id}`}
                          className="text-xs font-bold text-blue-700 hover:text-blue-900 underline"
                        >
                          Dossier →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Alias Modal */}
      {showAliasModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-300">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase">
                Add Verified Institution Alias
              </h3>
              <button onClick={() => setShowAliasModal(false)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAlias} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Alias / Abbreviation (e.g. VESIT or VJTI) *
                </label>
                <input
                  type="text"
                  required
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  placeholder="Enter common alias..."
                  className="w-full text-xs p-2.5 rounded border border-slate-300 bg-slate-50"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAliasModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={aliasSubmitting}
                  className="px-4 py-1.5 bg-blue-900 text-white rounded text-xs font-bold shadow disabled:opacity-50"
                >
                  {aliasSubmitting ? "Adding..." : "Add Verified Alias"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
