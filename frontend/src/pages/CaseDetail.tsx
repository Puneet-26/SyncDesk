import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  FileText,
  Building2,
  Calendar,
  Clock,
  UserCheck,
  Send,
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle,
  RotateCcw,
  ShieldAlert,
  ChevronLeft,
  AlertCircle,
  GitMerge,
  History,
  FileSpreadsheet
} from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { ComplaintCase, ActionHistory } from "../types";

export const CaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  const [caseData, setCaseData] = useState<ComplaintCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [activeModal, setActiveModal] = useState<"action" | "transfer" | "escalate" | "dispose" | "reopen" | null>(null);
  const [modalText, setModalText] = useState("");
  const [targetBureau, setTargetBureau] = useState("Public Grievance Redressal Cell (PGRC)");
  const [targetAuthority, setTargetAuthority] = useState("Senior Management");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchCase = async () => {
    setLoading(true);
    try {
      const res = await api.get<ComplaintCase>(`/cases/${id}`);
      setCaseData(res);
    } catch (err: any) {
      setError(err?.message || "Failed to load case detail");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCase();
  }, [id]);

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSubmitting(true);

    try {
      if (activeModal === "action") {
        await api.post(`/cases/${id}/actions`, {
          remarks: modalText,
          action_type: "ACTION_NOTE"
        });
      } else if (activeModal === "transfer") {
        await api.post(`/cases/${id}/transfer`, {
          target_bureau: targetBureau,
          remarks: modalText
        });
      } else if (activeModal === "escalate") {
        await api.post(`/cases/${id}/escalate`, {
          remarks: modalText,
          target_authority: targetAuthority,
          priority: "CRITICAL"
        });
      } else if (activeModal === "dispose") {
        await api.post(`/cases/${id}/dispose`, {
          closure_remarks: modalText
        });
      } else if (activeModal === "reopen") {
        await api.post(`/cases/${id}/reopen`, {
          reopen_reason: modalText
        });
      }

      setActiveModal(null);
      setModalText("");
      await fetchCase();
    } catch (err: any) {
      setActionError(err?.message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        Loading case surveillance dossier...
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="aicte-card p-6 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Case Not Found</h2>
        <p className="text-xs text-slate-500">{error}</p>
        <Link to="/cases" className="text-xs font-bold text-blue-700 underline">
          ← Return to Cases Registry
        </Link>
      </div>
    );
  }

  const isOverdue = caseData.status !== "Disposed" && new Date(caseData.sla_due_date) < new Date();

  return (
    <div className="space-y-6">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate(-1)}
            className="p-1 hover:bg-slate-200 rounded text-slate-600 mr-1"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm font-black text-blue-900">{caseData.case_id}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                caseData.status === "Pending" ? "bg-amber-100 text-amber-800" :
                caseData.status === "Under Process" ? "bg-blue-100 text-blue-800" :
                caseData.status === "Disposed" ? "bg-emerald-100 text-emerald-800" :
                caseData.status === "Transferred" ? "bg-purple-100 text-purple-800" :
                "bg-rose-100 text-rose-800"
              }`}>
                {caseData.status}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                caseData.priority === "CRITICAL" ? "bg-red-600 text-white" :
                caseData.priority === "HIGH" ? "bg-orange-500 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                {caseData.priority} PRIORITY
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Current Purview: <strong className="text-slate-800">{caseData.current_bureau}</strong>
            </p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {caseData.status !== "Disposed" && (
            <>
              <button
                onClick={() => { setActiveModal("action"); setModalText(""); setActionError(null); }}
                className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded shadow-sm flex items-center space-x-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Add Action Note</span>
              </button>

              <button
                onClick={() => { setActiveModal("transfer"); setModalText(""); setActionError(null); }}
                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded shadow-sm flex items-center space-x-1"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Transfer Bureau</span>
              </button>

              <button
                onClick={() => { setActiveModal("escalate"); setModalText(""); setActionError(null); }}
                className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded shadow-sm flex items-center space-x-1"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Escalate</span>
              </button>

              <button
                onClick={() => { setActiveModal("dispose"); setModalText(""); setActionError(null); }}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded shadow-sm flex items-center space-x-1"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Dispose Case</span>
              </button>
            </>
          )}

          {caseData.status === "Disposed" && (hasRole(["Senior Management", "Admin"])) && (
            <button
              onClick={() => { setActiveModal("reopen"); setModalText(""); setActionError(null); }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded shadow-sm flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Authorized Reopen</span>
            </button>
          )}
        </div>
      </div>

      {/* Case Details Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Complaint Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="aicte-card p-5 space-y-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Institution Under Purview
              </h2>
              {caseData.institution_id ? (
                <div className="flex items-center justify-between">
                  <div>
                    <Link
                      to={`/institutions/${caseData.institution_id}`}
                      className="text-base font-black text-slate-900 hover:text-blue-900 hover:underline flex items-center"
                    >
                      <Building2 className="w-4 h-4 mr-1.5 text-blue-900" />
                      {caseData.institution_name}
                    </Link>
                    <div className="text-xs font-mono text-slate-500 mt-0.5">
                      AICTE Permanent ID: <strong className="text-slate-800">{caseData.aicte_permanent_id}</strong>
                    </div>
                  </div>
                  <Link
                    to={`/institutions/${caseData.institution_id}`}
                    className="text-xs font-bold text-blue-700 hover:underline bg-blue-50 px-2.5 py-1 rounded border border-blue-200"
                  >
                    View 360 Profile →
                  </Link>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex items-center justify-between">
                  <div>
                    <span className="font-bold">Raw Identity: {caseData.raw_institution_name}</span>
                    <p className="text-[11px] text-amber-700">Identity resolution pending administrative review</p>
                  </div>
                  <Link
                    to="/institutions?tab=unresolved"
                    className="text-xs font-bold underline text-amber-900 hover:text-amber-950"
                  >
                    Resolve in Master Queue →
                  </Link>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Complaint Allegation & Category: <span className="text-blue-950 font-black">{caseData.category}</span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded border border-slate-200/80 text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-wrap">
                {caseData.description}
              </div>
            </div>

            {/* Next Action & Procedural Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-3 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Next Action Required</span>
                <p className="font-semibold text-slate-800 mt-0.5">{caseData.next_action}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Assigned Regulatory Officer</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {caseData.assigned_officer_name || "Unassigned - Pending Allocation"}
                </p>
              </div>
            </div>

            {caseData.closure_remarks && (
              <div className="border-t border-slate-100 pt-3">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Official Disposal Findings & Closure Remarks
                </span>
                <p className="mt-1 p-3 bg-emerald-50 rounded border border-emerald-200 text-xs text-emerald-950 font-medium">
                  {caseData.closure_remarks}
                </p>
              </div>
            )}
          </div>

          {/* Action History Timeline */}
          <div className="aicte-card p-5">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center mb-4">
              <History className="w-4 h-4 text-blue-900 mr-2" />
              Surveillance Action History & Audit Timeline
            </h2>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {caseData.action_history?.map((act, index) => (
                <div key={act.id || index} className="relative text-xs">
                  {/* Timeline node icon */}
                  <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border-2 border-blue-900 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-900"></div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-slate-500">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800 uppercase tracking-wide text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">
                          {act.action_type}
                        </span>
                        <span className="text-[11px] font-semibold text-blue-900">{act.bureau}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(act.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed mt-1 font-normal">
                      {act.remarks}
                    </p>

                    <div className="text-[10px] text-slate-400 flex items-center space-x-1 pt-1">
                      <span>Recorded by:</span>
                      <strong className="text-slate-600">{act.actor_name}</strong>
                      {act.from_bureau && act.to_bureau && (
                        <span>• Transfer: {act.from_bureau} → {act.to_bureau}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Metadata & SLA Watch */}
        <div className="space-y-6">
          {/* Statutory SLA Card */}
          <div className={`aicte-card p-5 border-t-4 ${isOverdue ? "border-t-red-600 bg-red-50/10" : "border-t-blue-900"}`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center mb-3">
              <Clock className="w-4 h-4 text-blue-900 mr-1.5" /> Statutory SLA Monitoring
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Date Received:</span>
                <span className="font-semibold text-slate-800">{caseData.date_received}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Statutory SLA Window:</span>
                <span className="font-semibold text-slate-800">{caseData.sla_days} Days</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Prescribed Due Date:</span>
                <span className={`font-mono font-bold ${isOverdue ? "text-red-700" : "text-slate-800"}`}>
                  {caseData.sla_due_date}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SLA Status:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  isOverdue ? "bg-red-100 text-red-800 border border-red-200" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {isOverdue ? "STATUTORY BREACH" : "WITHIN TIMELINE"}
                </span>
              </div>
            </div>
          </div>

          {/* Regulatory Metadata Card */}
          <div className="aicte-card p-5 space-y-3 text-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
              <FileSpreadsheet className="w-4 h-4 text-blue-900 mr-1.5" /> Registry Metadata
            </h3>

            <div className="space-y-2.5 text-slate-600">
              {caseData.external_reference && (
                <div className="pb-2 border-b border-slate-100">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">External Reference / CPGRAMS</span>
                  <span className="font-mono font-semibold text-blue-900">{caseData.external_reference}</span>
                </div>
              )}
              <div className="pb-2 border-b border-slate-100">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Registration Timestamp</span>
                <span>{caseData.created_at ? new Date(caseData.created_at).toLocaleString() : "N/A"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Last Action Recorded</span>
                <span>{caseData.last_action_date ? new Date(caseData.last_action_date).toLocaleString() : "N/A"}</span>
              </div>
            </div>
          </div>

          {/* Quick Overlap Shortcut */}
          <div className="p-4 rounded-lg bg-blue-900 text-white space-y-2">
            <div className="flex items-center space-x-2">
              <GitMerge className="w-4 h-4 text-amber-300" />
              <span className="text-xs font-bold uppercase tracking-wider">Inter-Bureau Overlaps</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Check if other Bureaus (PGRC, Regional Office, Approval Bureau) have parallel proceedings regarding this institution.
            </p>
            <Link
              to={`/overlaps?institution_id=${caseData.institution_id || ""}`}
              className="inline-block mt-1 px-3 py-1.5 bg-blue-800 hover:bg-blue-700 text-white text-xs font-bold rounded shadow-sm"
            >
              Examine Related Overlaps →
            </Link>
          </div>
        </div>
      </div>

      {/* Action Modals */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-300">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                {activeModal === "action" && "Record Action Note"}
                {activeModal === "transfer" && "Transfer Case to Another Bureau"}
                {activeModal === "escalate" && "Escalate to Senior Regulatory Authority"}
                {activeModal === "dispose" && "Dispose Case with Official Findings"}
                {activeModal === "reopen" && "Authorized Reopening of Disposed Complaint"}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-xs">
                {actionError}
              </div>
            )}

            <form onSubmit={handleActionSubmit} className="space-y-4">
              {activeModal === "transfer" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Select Target Bureau / Cell
                  </label>
                  <select
                    value={targetBureau}
                    onChange={(e) => setTargetBureau(e.target.value)}
                    className="w-full text-xs p-2.5 rounded border border-slate-300 bg-slate-50"
                  >
                    <option value="Regulation Bureau (RB)">Regulation Bureau (RB)</option>
                    <option value="Public Grievance Redressal Cell (PGRC)">Public Grievance Redressal Cell (PGRC)</option>
                    <option value="Regional Office (RO)">Regional Office (RO)</option>
                    <option value="Approval Bureau">Approval Bureau</option>
                  </select>
                </div>
              )}

              {activeModal === "escalate" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Target Escalation Authority
                  </label>
                  <select
                    value={targetAuthority}
                    onChange={(e) => setTargetAuthority(e.target.value)}
                    className="w-full text-xs p-2.5 rounded border border-slate-300 bg-slate-50"
                  >
                    <option value="Senior Management">Senior Management / Vice Chairman Desk</option>
                    <option value="AICTE Member Secretary">Member Secretary Executive Office</option>
                    <option value="Regional Coordination Committee">Regional Coordination Committee</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {activeModal === "dispose" ? "Mandatory Closure Remarks (Min. 10 chars)" : "Regulatory Remarks / Justification"}
                </label>
                <textarea
                  required
                  rows={4}
                  value={modalText}
                  onChange={(e) => setModalText(e.target.value)}
                  className="w-full text-xs p-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-slate-50"
                  placeholder={
                    activeModal === "dispose"
                      ? "Document detailed inspection findings, compliance verification, and formal basis for disposal..."
                      : "Enter official remarks, instructions, or rationale for this operation..."
                  }
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded text-xs font-bold shadow disabled:opacity-50"
                >
                  {submitting ? "Committing..." : "Confirm & Commit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
