import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Building2,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  HelpCircle,
  MapPin,
  Plus
} from "lucide-react";
import { api } from "../api/client";
import { Institution, ComplaintCase } from "../types";

export const Institutions: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "unresolved" ? "unresolved" : "all";

  const [activeTab, setActiveTab] = useState<"all" | "unresolved">(initialTab);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [unresolvedCases, setUnresolvedCases] = useState<ComplaintCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("All");

  // Manual resolution modal state
  const [selectedCase, setSelectedCase] = useState<ComplaintCase | null>(null);
  const [targetInstId, setTargetInstId] = useState<number | "">("");
  const [resolutionRemarks, setResolutionRemarks] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resSuccess, setResSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [instRes, caseRes] = await Promise.all([
        api.get<Institution[]>("/institutions/?limit=100"),
        api.get<{ items: ComplaintCase[] }>("/cases/?status=Pending&limit=50")
      ]);

      setInstitutions(instRes);
      // Filter out cases where institution_id is missing or raw name matches unresolved pattern
      const unres = caseRes.items.filter((c) => !c.institution_id);
      setUnresolvedCases(unres);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !targetInstId) return;

    setResolving(true);
    try {
      await api.post("/institutions/resolve", {
        case_id: selectedCase.id,
        institution_id: Number(targetInstId),
        remarks: resolutionRemarks || "Resolved via Administrative Identity Surveillance Desk"
      });

      setResSuccess(`Successfully resolved identity for ${selectedCase.case_id}. Case linked to master record.`);
      setSelectedCase(null);
      setTargetInstId("");
      setResolutionRemarks("");
      await fetchData();
    } catch (err: any) {
      alert(err?.message || "Resolution failed");
    } finally {
      setResolving(false);
    }
  };

  const filteredInstitutions = institutions.filter((inst) => {
    const q = search.toLowerCase();
    const matchesSearch =
      inst.official_name.toLowerCase().includes(q) ||
      (inst.aicte_permanent_id && inst.aicte_permanent_id.toLowerCase().includes(q)) ||
      inst.city.toLowerCase().includes(q);

    const matchesRegion = regionFilter === "All" || inst.region === regionFilter;
    return matchesSearch && matchesRegion;
  });

  return (
    <div className="space-y-6">
      {/* Title & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-blue-900" />
            Institutional Master Registry & Identity Surveillance
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            AICTE permanent directory, verified aliases, and ambiguous identity resolution queue
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center space-x-1 bg-slate-200/80 p-1 rounded-lg">
          <button
            onClick={() => { setActiveTab("all"); setSearchParams({}); }}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
              activeTab === "all" ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Master Registry ({institutions.length})
          </button>
          <button
            onClick={() => { setActiveTab("unresolved"); setSearchParams({ tab: "unresolved" }); }}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1 ${
              activeTab === "unresolved" ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Resolution Queue</span>
            {unresolvedCases.length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {unresolvedCases.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {resSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs flex items-center justify-between">
          <span>{resSuccess}</span>
          <button onClick={() => setResSuccess(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {/* TAB 1: ALL INSTITUTIONS */}
      {activeTab === "all" && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="aicte-card p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search Institution, City, or AICTE Permanent ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-slate-50"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="text-xs p-2 rounded border border-slate-300 bg-slate-50"
              >
                <option value="All">All Regions</option>
                <option value="Northern">Northern</option>
                <option value="Western">Western</option>
                <option value="Southern">Southern</option>
                <option value="Eastern">Eastern</option>
                <option value="Central">Central</option>
                <option value="South-Western">South-Western</option>
                <option value="North-Western">North-Western</option>
              </select>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInstitutions.map((inst) => (
              <div key={inst.id} className="aicte-card p-4 flex flex-col justify-between hover:border-blue-300 transition">
                <div>
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-[11px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {inst.aicte_permanent_id || "Unregistered"}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {inst.region}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 mt-2 line-clamp-2">
                    {inst.official_name}
                  </h3>

                  <div className="flex items-center text-[11px] text-slate-500 mt-1">
                    <MapPin className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                    <span>{inst.city}, {inst.state}</span>
                  </div>

                  {inst.aliases && inst.aliases.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                      {inst.aliases.map((al) => (
                        <span key={al.id} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                          {al.alias}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold">{inst.institution_type}</span>
                  <Link
                    to={`/institutions/${inst.id}`}
                    className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center"
                  >
                    <span>Institution 360</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: UNRESOLVED RESOLUTION QUEUE */}
      {activeTab === "unresolved" && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <h3 className="font-bold flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-600" />
              Identity Disambiguation & Verification Queue
            </h3>
            <p className="mt-0.5 text-amber-800 leading-relaxed">
              These complaint cases were lodged with raw or informal institution names where confidence was below threshold. Authorized officers can review evidence and confirm matching to the official AICTE master record.
            </p>
          </div>

          <div className="aicte-card overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">Case ID</th>
                  <th className="py-3 px-3.5">Lodge Date</th>
                  <th className="py-3 px-3.5">Bureau</th>
                  <th className="py-3 px-3.5">Reported Raw Institution Name</th>
                  <th className="py-3 px-3.5">Complaint Allegation</th>
                  <th className="py-3 px-3.5 text-right">Resolve Mapping</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {unresolvedCases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      All complaint cases in the system have been successfully resolved to verified AICTE institutions.
                    </td>
                  </tr>
                ) : (
                  unresolvedCases.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3.5 font-bold text-blue-900">{c.case_id}</td>
                      <td className="py-3 px-3.5">{c.date_received}</td>
                      <td className="py-3 px-3.5">{c.current_bureau}</td>
                      <td className="py-3 px-3.5 font-bold text-amber-900 bg-amber-50/60 px-2 py-1 rounded">
                        {c.raw_institution_name}
                      </td>
                      <td className="py-3 px-3.5 max-w-sm truncate text-slate-600">
                        {c.description}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedCase(c);
                            setTargetInstId("");
                            setResolutionRemarks("");
                          }}
                          className="px-3 py-1 bg-[#0f2942] hover:bg-blue-900 text-white rounded text-xs font-bold transition shadow-sm"
                        >
                          Resolve & Link
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Resolution Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-300">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase">
                Resolve Institution Identity
              </h3>
              <button onClick={() => setSelectedCase(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-1">
              <div><strong>Case ID:</strong> {selectedCase.case_id}</div>
              <div><strong>Filing Name:</strong> <span className="font-bold text-amber-900">{selectedCase.raw_institution_name}</span></div>
              <div><strong>Category:</strong> {selectedCase.category}</div>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Select Verified Target Institution from Master Registry *
                </label>
                <select
                  required
                  value={targetInstId}
                  onChange={(e) => setTargetInstId(Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded border border-slate-300 bg-slate-50"
                >
                  <option value="">-- Choose verified institution --</option>
                  {institutions.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.official_name} ({i.aicte_permanent_id || "No ID"}) - {i.city}, {i.state}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Resolution Audit Remarks
                </label>
                <textarea
                  rows={3}
                  value={resolutionRemarks}
                  onChange={(e) => setResolutionRemarks(e.target.value)}
                  placeholder="State grounds for identity confirmation (e.g. verified address, city, and registrar acknowledgement)..."
                  className="w-full text-xs p-2.5 rounded border border-slate-300 bg-slate-50"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedCase(null)}
                  className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving || !targetInstId}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded text-xs font-bold shadow disabled:opacity-50"
                >
                  {resolving ? "Confirming..." : "Confirm & Link Case"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
