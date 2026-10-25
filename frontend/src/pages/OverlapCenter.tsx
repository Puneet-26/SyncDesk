import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  GitMerge,
  Sparkles,
  CheckCircle2,
  XCircle,
  Link2,
  RefreshCw,
  Building2,
  ArrowRight,
  ShieldAlert,
  FileText,
  AlertCircle,
  HelpCircle,
  Layers
} from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { OverlapAssessment } from "../types";

export const OverlapCenter: React.FC = () => {
  const [searchParams] = useSearchParams();
  const instParam = searchParams.get("institution_id");

  const { user } = useAuth();
  const [overlaps, setOverlaps] = useState<OverlapAssessment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("Suggested");
  const [classFilter, setClassFilter] = useState("All");

  // Selected item for detail inspection
  const [selectedOverlap, setSelectedOverlap] = useState<OverlapAssessment | null>(null);

  // Modals
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDismissModal, setShowDismissModal] = useState(false);
  const [showManualLinkModal, setShowManualLinkModal] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);

  // Form states
  const [confirmRemarks, setConfirmRemarks] = useState("");
  const [dismissReason, setDismissReason] = useState("");
  const [manualCaseA, setManualCaseA] = useState("");
  const [manualCaseB, setManualCaseB] = useState("");
  const [manualClass, setManualClass] = useState("Potential Issue Overlap");
  const [manualRemarks, setManualRemarks] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchOverlaps = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "All") params.append("status_filter", statusFilter);
      if (classFilter !== "All") params.append("classification", classFilter);
      if (instParam) params.append("institution_id", instParam);

      const res = await api.get<{ total: number; items: OverlapAssessment[] }>(`/overlaps/?${params.toString()}`);
      setOverlaps(res.items);
      setTotal(res.total);
      if (res.items.length > 0 && !selectedOverlap) {
        setSelectedOverlap(res.items[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverlaps();
  }, [statusFilter, classFilter, instParam]);

  const handleBatchReassess = async () => {
    setBatchRunning(true);
    setActionError(null);
    try {
      const res = await api.post<{ message: string; evaluations_count: number }>("/overlaps/reassess-all");
      setActionSuccess(res.message);
      await fetchOverlaps();
    } catch (err: any) {
      setActionError(err?.message || "Batch evaluation failed.");
    } finally {
      setBatchRunning(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOverlap) return;
    setActionError(null);
    try {
      await api.post(`/overlaps/${selectedOverlap.id}/confirm`, {
        remarks: confirmRemarks,
        create_coordination_record: true,
        coordination_title: `Joint Coordination: ${selectedOverlap.case_a?.case_id} & ${selectedOverlap.case_b?.case_id}`
      });
      setShowConfirmModal(false);
      setConfirmRemarks("");
      setActionSuccess(`Overlap confirmed! Joint Coordination Record initialized.`);
      await fetchOverlaps();
    } catch (err: any) {
      setActionError(err?.message || "Failed to confirm overlap.");
    }
  };

  const handleDismiss = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOverlap) return;
    if (dismissReason.trim().length < 8) {
      setActionError("Dismissal requires a mandatory rationale of at least 8 characters.");
      return;
    }
    setActionError(null);
    try {
      await api.post(`/overlaps/${selectedOverlap.id}/dismiss`, {
        reason: dismissReason
      });
      setShowDismissModal(false);
      setDismissReason("");
      setActionSuccess("Overlap dismissed. Record will not be resurrected unless material evidence changes.");
      await fetchOverlaps();
    } catch (err: any) {
      setActionError(err?.message || "Failed to dismiss overlap.");
    }
  };

  const handleManualLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await api.post("/overlaps/manual-link", {
        case_a_id: Number(manualCaseA),
        case_b_id: Number(manualCaseB),
        classification: manualClass,
        remarks: manualRemarks || "Manually established cross-bureau case linkage."
      });
      setShowManualLinkModal(false);
      setManualCaseA("");
      setManualCaseB("");
      setManualRemarks("");
      setActionSuccess("Manual relationship established successfully.");
      await fetchOverlaps();
    } catch (err: any) {
      setActionError(err?.message || "Failed to link cases.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center">
            <GitMerge className="w-5 h-5 mr-2 text-amber-600" />
            Explainable Cross-Bureau Overlap Intelligence
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Multi-signal relationship analysis across Bureaus • Transparent evidence reasoning • Actionable coordination
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowManualLinkModal(true)}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-semibold border border-slate-300 shadow-sm transition"
          >
            <Link2 className="w-3.5 h-3.5 text-slate-600" />
            <span>Manual Link Cases</span>
          </button>
          <button
            onClick={handleBatchReassess}
            disabled={batchRunning}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#0f2942] hover:bg-blue-900 text-white rounded text-xs font-bold shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${batchRunning ? "animate-spin" : ""}`} />
            <span>{batchRunning ? "Assessing..." : "Run Batch Reassessment"}</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-xs flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="aicte-card p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-700">Filter By Status:</span>
          {["Suggested", "Confirmed", "Dismissed", "All"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                statusFilter === st
                  ? "bg-blue-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-700">Classification:</span>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="text-xs p-1.5 rounded border border-slate-300 bg-slate-50"
          >
            <option value="All">All Classifications</option>
            <option value="Potential Duplicate">Potential Duplicate</option>
            <option value="Potential Issue Overlap">Potential Issue Overlap</option>
            <option value="Institution Overlap">Institution Overlap</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Left List (40%) & Right Explainability Card (60%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Overlap Cards */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between px-1">
            <span>Suggested Case Pairs ({overlaps.length})</span>
            <span className="text-[10px] text-slate-400">Ranked by overall similarity</span>
          </div>

          {loading ? (
            <div className="aicte-card p-8 text-center text-xs text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
              Evaluating multi-signal relationships...
            </div>
          ) : overlaps.length === 0 ? (
            <div className="aicte-card p-8 text-center text-xs text-slate-400">
              No overlapping relationships found for current status filter.
            </div>
          ) : (
            overlaps.map((item) => {
              const isSelected = selectedOverlap?.id === item.id;
              const isDuplicate = item.classification === "Potential Duplicate";
              const isIssue = item.classification === "Potential Issue Overlap";

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedOverlap(item)}
                  className={`aicte-card p-3.5 cursor-pointer transition-all border-l-4 ${
                    isSelected
                      ? "ring-2 ring-blue-800 border-l-blue-900 bg-blue-50/20"
                      : isDuplicate
                      ? "border-l-red-600 hover:border-l-red-700"
                      : isIssue
                      ? "border-l-amber-500 hover:border-l-amber-600"
                      : "border-l-blue-500 hover:border-l-blue-600"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      isDuplicate ? "bg-red-100 text-red-800" : isIssue ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                    }`}>
                      {item.classification}
                    </span>
                    <span className="font-mono text-xs font-black text-slate-900">
                      Score: {int(item.overall_score * 100)}%
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-900 mt-2 truncate">
                    {item.case_a?.institution_name || item.case_a?.raw_institution_name}
                  </div>

                  {/* Case Pair Tags */}
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px]">
                    <div className="bg-slate-50 p-1.5 rounded border border-slate-200/80">
                      <div className="font-bold text-blue-900">{item.case_a?.case_id}</div>
                      <div className="text-[10px] text-slate-500 truncate">{item.case_a?.current_bureau}</div>
                    </div>
                    <div className="bg-slate-50 p-1.5 rounded border border-slate-200/80">
                      <div className="font-bold text-blue-900">{item.case_b?.case_id}</div>
                      <div className="text-[10px] text-slate-500 truncate">{item.case_b?.current_bureau}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                    <span>Status: <strong className="text-slate-600">{item.status}</strong></span>
                    <span>Pair ID: #{item.id}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: Explainability Dossier */}
        <div className="lg:col-span-7">
          {selectedOverlap ? (
            <div className="aicte-card p-6 space-y-5 sticky top-20 border-t-4 border-t-amber-600">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-amber-100 text-amber-900 font-bold uppercase text-[10px] px-2 py-0.5 rounded border border-amber-200">
                      {selectedOverlap.classification}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      Assessment #{selectedOverlap.id} • {selectedOverlap.assessment_version}
                    </span>
                  </div>
                  <h2 className="text-base font-black text-slate-900 mt-1">
                    {selectedOverlap.case_a?.institution_name || selectedOverlap.case_a?.raw_institution_name}
                  </h2>
                </div>

                {/* Confirm & Dismiss action buttons */}
                <div className="flex items-center space-x-2">
                  {selectedOverlap.status !== "Confirmed" && (
                    <button
                      onClick={() => setShowConfirmModal(true)}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold shadow-sm flex items-center space-x-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm Overlap</span>
                    </button>
                  )}
                  {selectedOverlap.status !== "Dismissed" && (
                    <button
                      onClick={() => setShowDismissModal(true)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-rose-100 hover:text-rose-800 text-slate-700 rounded text-xs font-bold shadow-sm flex items-center space-x-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Dismiss</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Overall Score Meter */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 uppercase tracking-wide">
                    Overall Explainable Relationship Confidence
                  </span>
                  <span className="text-base font-black text-blue-900">
                    {int(selectedOverlap.overall_score * 100)}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      selectedOverlap.overall_score >= 0.80 ? "bg-red-600" : selectedOverlap.overall_score >= 0.55 ? "bg-amber-500" : "bg-blue-600"
                    }`}
                    style={{ width: `${Math.min(100, selectedOverlap.overall_score * 100)}%` }}
                  ></div>
                </div>

                {/* Sub-factor score tiles */}
                <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Institution Match</span>
                    <strong className="text-slate-800">{int(selectedOverlap.institution_identity_score * 100)}%</strong>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Category Similarity</span>
                    <strong className="text-slate-800">{int(selectedOverlap.category_similarity_score * 100)}%</strong>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Text Similarity</span>
                    <strong className="text-slate-800">{int(selectedOverlap.text_similarity_score * 100)}%</strong>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Comparison of the Two Cases */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 flex items-center">
                  <FileText className="w-3.5 h-3.5 text-blue-900 mr-1.5" />
                  Side-by-Side Comparative Case Evidence
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Case A */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                      <span className="font-bold text-blue-900">{selectedOverlap.case_a?.case_id}</span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-bold">
                        {selectedOverlap.case_a?.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <strong>Bureau:</strong> {selectedOverlap.case_a?.current_bureau}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <strong>Category:</strong> {selectedOverlap.case_a?.category}
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-200 text-[11px] leading-relaxed max-h-32 overflow-y-auto">
                      {selectedOverlap.case_a?.description}
                    </div>
                    <Link
                      to={`/cases/${selectedOverlap.case_a?.id}`}
                      className="text-[11px] font-bold text-blue-700 hover:underline block pt-1"
                    >
                      Open Case A Dossier →
                    </Link>
                  </div>

                  {/* Case B */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                      <span className="font-bold text-blue-900">{selectedOverlap.case_b?.case_id}</span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-bold">
                        {selectedOverlap.case_b?.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <strong>Bureau:</strong> {selectedOverlap.case_b?.current_bureau}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      <strong>Category:</strong> {selectedOverlap.case_b?.category}
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-200 text-[11px] leading-relaxed max-h-32 overflow-y-auto">
                      {selectedOverlap.case_b?.description}
                    </div>
                    <Link
                      to={`/cases/${selectedOverlap.case_b?.id}`}
                      className="text-[11px] font-bold text-blue-700 hover:underline block pt-1"
                    >
                      Open Case B Dossier →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Explainability Breakdown Card */}
              <div className="p-4 rounded-lg bg-blue-50/60 border border-blue-200 space-y-2.5 text-xs text-blue-950">
                <span className="font-bold text-xs uppercase tracking-wider flex items-center text-blue-900">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-700" />
                  Algorithm Rationale & Regulatory Explanation
                </span>
                <p className="leading-relaxed">
                  {selectedOverlap.reasons?.narrative_explanation || "Both cases concern the same institution across multiple bureaus and show meaningful topical overlap."}
                </p>
                <div className="pt-2 border-t border-blue-200/80 flex items-start space-x-2">
                  <strong className="text-blue-900 shrink-0">Recommended Action:</strong>
                  <span>{selectedOverlap.reasons?.recommended_action || "Review both cases and initiate coordination."}</span>
                </div>
              </div>

              {/* Dismissal Reason Note if Dismissed */}
              {selectedOverlap.status === "Dismissed" && (
                <div className="p-3 bg-slate-100 rounded border border-slate-300 text-xs text-slate-700">
                  <span className="font-bold">Dismissed by Officer:</span> {selectedOverlap.dismissed_reason}
                </div>
              )}
            </div>
          ) : (
            <div className="aicte-card p-12 text-center text-xs text-slate-400">
              Select a suggested case pair on the left to view the comparative evidence and algorithmic explanation.
            </div>
          )}
        </div>
      </div>

      {/* Confirm Overlap Modal */}
      {showConfirmModal && selectedOverlap && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-300">
            <h3 className="text-sm font-bold text-slate-900 uppercase pb-2 border-b border-slate-100">
              Confirm Overlap & Launch Joint Coordination
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Confirming this relationship will establish a formal link between <strong>{selectedOverlap.case_a?.case_id}</strong> and <strong>{selectedOverlap.case_b?.case_id}</strong>, append action records to both case timelines, and initialize a Joint Coordination Record for both Bureaus.
            </p>
            <form onSubmit={handleConfirm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Coordination Notes / Alignment Instructions
                </label>
                <textarea
                  rows={3}
                  value={confirmRemarks}
                  onChange={(e) => setConfirmRemarks(e.target.value)}
                  placeholder="e.g. Initiating joint fact-finding hearing between Regulation Bureau and PGRC..."
                  className="w-full text-xs p-2.5 rounded border border-slate-300 bg-slate-50"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold shadow"
                >
                  Confirm & Link Cases
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dismiss Overlap Modal */}
      {showDismissModal && selectedOverlap && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-300">
            <h3 className="text-sm font-bold text-slate-900 uppercase pb-2 border-b border-slate-100">
              Dismiss Suggested Overlap
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dismissing this pair will persist your decision with full audit tracking. The system will NOT recreate this suggestion in future runs unless material complaint facts are updated.
            </p>
            <form onSubmit={handleDismiss} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mandatory Dismissal Rationale (Min. 8 characters) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={dismissReason}
                  onChange={(e) => setDismissReason(e.target.value)}
                  placeholder="State why these complaints represent distinct non-overlapping proceedings..."
                  className="w-full text-xs p-2.5 rounded border border-slate-300 bg-slate-50"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDismissModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded text-xs font-bold shadow"
                >
                  Dismiss Suggestion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Link Modal */}
      {showManualLinkModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-300">
            <h3 className="text-sm font-bold text-slate-900 uppercase pb-2 border-b border-slate-100">
              Manually Link Two Cases
            </h3>
            <form onSubmit={handleManualLink} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">First Case ID (Database #ID) *</label>
                <input
                  type="number"
                  required
                  value={manualCaseA}
                  onChange={(e) => setManualCaseA(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full text-xs p-2.5 rounded border border-slate-300 bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Second Case ID (Database #ID) *</label>
                <input
                  type="number"
                  required
                  value={manualCaseB}
                  onChange={(e) => setManualCaseB(e.target.value)}
                  placeholder="e.g. 2"
                  className="w-full text-xs p-2.5 rounded border border-slate-300 bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Classification</label>
                <select
                  value={manualClass}
                  onChange={(e) => setManualClass(e.target.value)}
                  className="w-full text-xs p-2.5 rounded border border-slate-300 bg-slate-50"
                >
                  <option value="Potential Issue Overlap">Potential Issue Overlap</option>
                  <option value="Potential Duplicate">Potential Duplicate</option>
                  <option value="Institution Overlap">Institution Overlap</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Linking Remarks</label>
                <textarea
                  rows={2}
                  value={manualRemarks}
                  onChange={(e) => setManualRemarks(e.target.value)}
                  placeholder="Grounds for manual relationship establishment..."
                  className="w-full text-xs p-2.5 rounded border border-slate-300 bg-slate-50"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowManualLinkModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-900 text-white rounded text-xs font-bold shadow"
                >
                  Link Cases
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function int(val: number): number {
  return Math.round(val);
}
