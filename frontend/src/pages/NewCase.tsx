import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FilePlus, Building2, Send, ChevronLeft, AlertCircle, Sparkles } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { Institution } from "../types";

export const NewCase: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rawInstitution, setRawInstitution] = useState("");
  const [category, setCategory] = useState("Faculty Deficiencies");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [bureau, setBureau] = useState(user?.bureau && user.bureau !== "Central" ? user.bureau : "Regulation Bureau (RB)");
  const [externalRef, setExternalRef] = useState("");
  const [slaDays, setSlaDays] = useState(30);
  const [description, setDescription] = useState("");

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [filteredInsts, setFilteredInsts] = useState<Institution[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInstitutions = async () => {
      try {
        const res = await api.get<Institution[]>("/institutions/?limit=100");
        setInstitutions(res);
      } catch {
        // ignore
      }
    };
    loadInstitutions();
  }, []);

  const handleNameChange = (val: string) => {
    setRawInstitution(val);
    if (val.trim().length > 2) {
      const q = val.toLowerCase();
      const matches = institutions.filter(
        (i) => i.official_name.toLowerCase().includes(q) || (i.aicte_permanent_id && i.aicte_permanent_id.includes(q))
      );
      setFilteredInsts(matches.slice(0, 5));
    } else {
      setFilteredInsts([]);
    }
  };

  const handleSelectInstitution = (inst: Institution) => {
    setRawInstitution(inst.official_name);
    setFilteredInsts([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const created = await api.post<{ id: number; case_id: string }>("/cases/", {
        raw_institution_name: rawInstitution,
        category,
        description,
        priority,
        current_bureau: bureau,
        external_reference: externalRef || null,
        sla_days: Number(slaDays),
        next_action: "Initial Review & Bureau Verification"
      });

      navigate(`/cases/${created.id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to lodge complaint case.");
    } finally {
      setSubmitting(false);
    }
  };

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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2 pb-2 border-b border-slate-200">
        <button
          onClick={() => navigate(-1)}
          className="p-1 hover:bg-slate-200 rounded text-slate-600 mr-1"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center">
            <FilePlus className="w-5 h-5 mr-2 text-blue-900" />
            Lodge New Institutional Complaint
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Registers case into AICTE Central Surveillance Registry with automated identity resolution & overlap detection
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <div className="aicte-card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Institution Name Input with autocomplete suggestions */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Institution Name (Official Name or Campus Filing) *
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                required
                value={rawInstitution}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Vivekanand Education Society's Institute of Technology"
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-slate-50"
              />
            </div>

            {/* Suggestions dropdown */}
            {filteredInsts.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-xl z-20 overflow-hidden divide-y divide-slate-100">
                <div className="p-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 flex items-center">
                  <Sparkles className="w-3 h-3 text-blue-600 mr-1" /> Master Database Suggestions
                </div>
                {filteredInsts.map((inst) => (
                  <div
                    key={inst.id}
                    onClick={() => handleSelectInstitution(inst)}
                    className="p-2.5 hover:bg-blue-50 cursor-pointer text-xs"
                  >
                    <div className="font-bold text-slate-800">{inst.official_name}</div>
                    <div className="text-[10px] text-slate-500 flex items-center space-x-2 mt-0.5">
                      <span>ID: {inst.aicte_permanent_id}</span>
                      <span>• {inst.city}, {inst.state} ({inst.region} Region)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-1">
              Identity resolution service will match against verified AICTE IDs and aliases automatically.
            </p>
          </div>

          {/* Bureau and Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Receiving Bureau / Cell *
              </label>
              <select
                value={bureau}
                onChange={(e) => setBureau(e.target.value)}
                className="w-full text-xs p-2.5 rounded border border-slate-300 bg-slate-50"
              >
                <option value="Regulation Bureau (RB)">Regulation Bureau (RB)</option>
                <option value="Public Grievance Redressal Cell (PGRC)">Public Grievance Redressal Cell (PGRC)</option>
                <option value="Regional Office (RO)">Regional Office (RO)</option>
                <option value="Approval Bureau">Approval Bureau</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Complaint Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs p-2.5 rounded border border-slate-300 bg-slate-50"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority, SLA and External Ref Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Urgency Priority *
              </label>
              <select
                value={priority}
                onChange={(e: any) => setPriority(e.target.value)}
                className="w-full text-xs p-2.5 rounded border border-slate-300 bg-slate-50"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Statutory SLA (Days) *
              </label>
              <input
                type="number"
                min="7"
                max="120"
                value={slaDays}
                onChange={(e) => setSlaDays(Number(e.target.value))}
                className="w-full text-xs p-2.5 rounded border border-slate-300 bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                CPGRAMS / External Ref (Optional)
              </label>
              <input
                type="text"
                value={externalRef}
                onChange={(e) => setExternalRef(e.target.value)}
                placeholder="CPGRAMS/2026/..."
                className="w-full text-xs p-2.5 rounded border border-slate-300 bg-slate-50"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Detailed Complaint Allegation & Evidentiary Summary *
            </label>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="State precise institutional non-compliance, affected student batch or department, statutory clauses violated, and evidence cited..."
              className="w-full text-xs p-3 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-slate-50 leading-relaxed font-normal"
            />
          </div>

          {/* Submit buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center space-x-1.5 px-5 py-2.5 bg-[#0f2942] hover:bg-blue-900 text-white rounded text-xs font-bold shadow transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? "Registering & Analyzing Overlaps..." : "Register Complaint Case"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
