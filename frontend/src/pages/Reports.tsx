import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  RefreshCw,
  Calendar,
  Layers
} from "lucide-react";
import { api } from "../api/client";

export const Reports: React.FC = () => {
  const [reportType, setReportType] = useState("bureau_workload");
  const [bureau, setBureau] = useState("All");
  const [region, setRegion] = useState("All");
  const [status, setStatus] = useState("All");
  const [category, setCategory] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const reportOptions = [
    { value: "bureau_workload", label: "1. Bureau-Wise Workload Report" },
    { value: "status_distribution", label: "2. Procedural Status Distribution" },
    { value: "ageing_analysis", label: "3. Case Ageing Bracket Analysis" },
    { value: "sla_compliance", label: "4. Statutory SLA Compliance Summary" },
    { value: "cross_bureau_overlaps", label: "5. Cross-Bureau Overlap Intelligence Dossier" },
    { value: "detailed_cases", label: "6. Detailed Surveillance Case Registry" },
  ];

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("report_type", reportType);
      if (bureau !== "All") params.append("bureau", bureau);
      if (region !== "All") params.append("region", region);
      if (status !== "All") params.append("status", status);
      if (category !== "All") params.append("category", category);
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);

      const res = await api.get(`/reports/data?${params.toString()}`);
      setReportData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, bureau, region, status, category, dateFrom, dateTo]);

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const params = new URLSearchParams();
      params.append("report_type", reportType);
      if (bureau !== "All") params.append("bureau", bureau);
      if (region !== "All") params.append("region", region);
      if (status !== "All") params.append("status", status);
      if (category !== "All") params.append("category", category);
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);

      await api.downloadBlob(`/reports/export/csv?${params.toString()}`, `aicte_report_${reportType}.csv`);
    } catch (e) {
      alert("CSV export failed");
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const params = new URLSearchParams();
      params.append("report_type", reportType);
      if (bureau !== "All") params.append("bureau", bureau);
      if (region !== "All") params.append("region", region);
      if (status !== "All") params.append("status", status);
      if (category !== "All") params.append("category", category);
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);

      await api.downloadBlob(`/reports/export/pdf?${params.toString()}`, `aicte_report_${reportType}.pdf`);
    } catch (e) {
      alert("PDF export failed");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-blue-900" />
            Regulatory Surveillance Reports & Analytics
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Certified statutory data exports • Bureau workload accountability • RFC 4180 CSV & ReportLab PDF
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            disabled={exportingCsv || loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold shadow-sm transition disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{exportingCsv ? "Exporting..." : "Export CSV"}</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={exportingPdf || loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded text-xs font-bold shadow-sm transition disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            <span>{exportingPdf ? "Generating..." : "Export Official PDF"}</span>
          </button>
        </div>
      </div>

      {/* Filter and Report Configuration Card */}
      <div className="aicte-card p-5 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Select Statutory Regulatory Report
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full text-xs p-2.5 rounded border border-slate-300 font-semibold text-blue-950 bg-slate-50"
          >
            {reportOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Secondary Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bureau</label>
            <select
              value={bureau}
              onChange={(e) => setBureau(e.target.value)}
              className="w-full p-2 rounded border border-slate-300 bg-slate-50"
            >
              <option value="All">All Bureaus</option>
              <option value="Regulation Bureau (RB)">Regulation Bureau (RB)</option>
              <option value="Public Grievance Redressal Cell (PGRC)">PGRC</option>
              <option value="Regional Office (RO)">Regional Office (RO)</option>
              <option value="Approval Bureau">Approval Bureau</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full p-2 rounded border border-slate-300 bg-slate-50"
            >
              <option value="All">All Regions</option>
              <option value="Northern">Northern</option>
              <option value="Western">Western</option>
              <option value="Southern">Southern</option>
              <option value="Eastern">Eastern</option>
              <option value="Central">Central</option>
              <option value="South-Western">South-Western</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full p-2 rounded border border-slate-300 bg-slate-50"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Under Process">Under Process</option>
              <option value="Disposed">Disposed</option>
              <option value="Transferred">Transferred</option>
              <option value="Escalated">Escalated</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full p-2 rounded border border-slate-300 bg-slate-50"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full p-2 rounded border border-slate-300 bg-slate-50"
            />
          </div>
        </div>
      </div>

      {/* Report Preview Table */}
      <div className="aicte-card overflow-hidden">
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold tracking-wide">
              {reportData?.title || "Report Preview"}
            </h2>
            <div className="text-[11px] text-slate-400">
              Generated: {reportData?.generated_at} • Total Records: {reportData?.total_records ?? 0}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
              <tr>
                {reportData?.columns?.map((col: string) => (
                  <th key={col} className="py-2.5 px-3">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={reportData?.columns?.length || 4} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    Querying normalized regulatory database...
                  </td>
                </tr>
              ) : !reportData || reportData.data?.length === 0 ? (
                <tr>
                  <td colSpan={reportData?.columns?.length || 4} className="py-12 text-center text-slate-400">
                    No data records found matching selected report criteria.
                  </td>
                </tr>
              ) : (
                reportData.data.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    {reportData.columns.map((col: string) => (
                      <td key={col} className="py-2.5 px-3">
                        {row[col] !== undefined ? String(row[col]) : "-"}
                      </td>
                    ))}
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
