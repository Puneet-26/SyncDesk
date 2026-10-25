import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users2, Plus, Calendar, CheckCircle2, Clock, AlertCircle, RefreshCw, FileText } from "lucide-react";
import { api } from "../api/client";
import { CoordinationRecord } from "../types";

export const Coordination: React.FC = () => {
  const [records, setRecords] = useState<CoordinationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetReviewDate, setTargetReviewDate] = useState("");
  const [caseIdsStr, setCaseIdsStr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Update Status Modal
  const [selectedRecord, setSelectedRecord] = useState<CoordinationRecord | null>(null);
  const [updateStatus, setUpdateStatus] = useState("In Progress");
  const [resolutionSummary, setResolutionSummary] = useState("");

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const url = statusFilter === "All" ? "/coordination/" : `/coordination/?status_filter=${statusFilter}`;
      const res = await api.get<CoordinationRecord[]>(url);
      setRecords(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [statusFilter]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const ids = caseIdsStr
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n) && n > 0);

      await api.post("/coordination/", {
        title,
        description,
        target_review_date: targetReviewDate || new Date().toISOString().split("T")[0],
        case_ids: ids
      });

      setShowCreateModal(false);
      setTitle("");
      setDescription("");
      setTargetReviewDate("");
      setCaseIdsStr("");
      await fetchRecords();
    } catch (err: any) {
      alert(err?.message || "Failed to create coordination record.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    try {
      await api.put(`/coordination/${selectedRecord.id}`, {
        coordination_status: updateStatus,
        resolution_summary: resolutionSummary || null
      });
      setSelectedRecord(null);
      await fetchRecords();
    } catch (err: any) {
      alert(err?.message || "Failed to update coordination status.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center">
            <Users2 className="w-5 h-5 mr-2 text-blue-900" />
            Inter-Bureau Joint Coordination Workspace
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Collaborative alignment for confirmed overlapping institutional investigations across Regulation Bureau, PGRC, and Regional Offices
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#0f2942] hover:bg-blue-900 text-white rounded text-xs font-bold shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Coordination Task</span>
        </button>
      </div>

      {/* Filter by status */}
      <div className="flex items-center space-x-2">
        <span className="text-xs font-bold text-slate-700">Filter By Status:</span>
        {["All", "Open", "In Progress", "Resolved", "Closed"].map((st) => (
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

      {/* Coordination Records List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="md:col-span-2 aicte-card p-8 text-center text-xs text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
            Loading joint coordination workspaces...
          </div>
        ) : records.length === 0 ? (
          <div className="md:col-span-2 aicte-card p-8 text-center text-xs text-slate-400">
            No active coordination workspaces found for selected status.
          </div>
        ) : (
          records.map((rec) => (
            <div key={rec.id} className="aicte-card p-5 flex flex-col justify-between space-y-4 border-l-4 border-l-blue-900">
              <div>
                <div className="flex items-start justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    rec.coordination_status === "Open" ? "bg-amber-100 text-amber-800" :
                    rec.coordination_status === "In Progress" ? "bg-blue-100 text-blue-800" :
                    rec.coordination_status === "Resolved" ? "bg-emerald-100 text-emerald-800" :
                    "bg-slate-200 text-slate-700"
                  }`}>
                    {rec.coordination_status}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Workspace #{rec.id}</span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mt-2">{rec.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{rec.description}</p>

                {/* Linked cases tags */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Participating Complaint Cases ({rec.linked_cases.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {rec.linked_cases.map((lc) => (
                      <Link
                        key={lc.id}
                        to={`/cases/${lc.case_id}`}
                        className="text-[11px] font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200 flex items-center space-x-1"
                      >
                        <FileText className="w-3 h-3 text-blue-700" />
                        <span>{lc.case_number || `Case #${lc.case_id}`}</span>
                        <span className="text-[10px] text-slate-500 font-normal">({lc.bureau})</span>
                      </Link>
                    ))}
                  </div>
                </div>

                {rec.resolution_summary && (
                  <div className="mt-3 p-2.5 bg-emerald-50 rounded border border-emerald-200 text-xs text-emerald-950">
                    <span className="font-bold">Joint Resolution:</span> {rec.resolution_summary}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="space-y-0.5">
                  <div>Coordinator: <strong className="text-slate-700">{rec.responsible_officer_name || "Assigned Officer"}</strong></div>
                  <div className="flex items-center text-[11px]">
                    <Calendar className="w-3 h-3 mr-1 text-slate-400" /> Target Review: {rec.target_review_date}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedRecord(rec);
                    setUpdateStatus(rec.coordination_status);
                    setResolutionSummary(rec.resolution_summary || "");
                  }}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold text-xs border border-slate-200 transition"
                >
                  Update Status
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-300">
            <h3 className="text-sm font-bold text-slate-900 uppercase pb-2 border-b border-slate-100">
              Initialize Joint Coordination Record
            </h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Joint Review: Faculty Cadre & Capitation Fees at VESIT"
                  className="w-full text-xs p-2.5 rounded border border-slate-300 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Description / Plan *</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="State coordination strategy between involved bureaus..."
                  className="w-full text-xs p-2.5 rounded border border-slate-300 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Review Date *</label>
                <input
                  type="date"
                  required
                  value={targetReviewDate}
                  onChange={(e) => setTargetReviewDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded border border-slate-300 bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Linked Case Database IDs (comma separated) *</label>
                <input
                  type="text"
                  required
                  value={caseIdsStr}
                  onChange={(e) => setCaseIdsStr(e.target.value)}
                  placeholder="e.g. 1, 2"
                  className="w-full text-xs p-2.5 rounded border border-slate-300 bg-slate-50"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-blue-900 text-white rounded text-xs font-bold shadow disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Initialize Workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-300">
            <h3 className="text-sm font-bold text-slate-900 uppercase pb-2 border-b border-slate-100">
              Update Coordination Status: #{selectedRecord.id}
            </h3>
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Status</label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  className="w-full text-xs p-2.5 rounded border border-slate-300 bg-slate-50"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Joint Resolution Summary</label>
                <textarea
                  rows={3}
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  placeholder="Record unified consensus or joint regulatory outcome..."
                  className="w-full text-xs p-2.5 rounded border border-slate-300 bg-slate-50"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-900 text-white rounded text-xs font-bold shadow"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
