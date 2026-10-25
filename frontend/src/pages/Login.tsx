import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, Mail, ArrowRight, UserCheck, CheckCircle2 } from "lucide-react";

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("rb.officer@aicte.gov.in");
  const [password, setPassword] = useState("Password@123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    { title: "Regulation Bureau (RB) Officer", email: "rb.officer@aicte.gov.in", role: "RB Officer", desc: "Manages regulatory violations & academic compliance" },
    { title: "Public Grievance Redressal (PGRC)", email: "pgrc.officer@aicte.gov.in", role: "PGRC Officer", desc: "Handles student & faculty petitions & fee disputes" },
    { title: "Regional Officer (Western)", email: "regional.officer@aicte.gov.in", role: "Regional Officer", desc: "Oversees local institutions & physical audits" },
    { title: "Senior Management", email: "senior.mgmt@aicte.gov.in", role: "Senior Management", desc: "Council-wide KPI oversight & inter-bureau intervention" },
    { title: "System Administrator", email: "admin@aicte.gov.in", role: "Admin", desc: "Full administrative, identity master & audit access" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err?.message || "Invalid credentials. Please verify your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (accEmail: string) => {
    setEmail(accEmail);
    setPassword("Password@123");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center px-4">
        {/* Tricolour Accent */}
        <div className="w-24 h-1 mx-auto mb-4 bg-gradient-to-r from-orange-500 via-white to-green-600 rounded"></div>

        {/* SyncDesk Official Brand Banner */}
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200/90 inline-flex items-center justify-center max-w-sm sm:max-w-md w-full">
            <img
              src="/syncdesk-logo.jpeg"
              alt="SyncDesk Official Logo"
              className="h-16 sm:h-20 w-auto object-contain mx-auto"
            />
          </div>
        </div>

        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          <span className="text-[#0B2545]">Sync</span><span className="text-[#C19A5B]">Desk</span> Vigilance Portal
        </h2>
        <p className="mt-1 text-xs text-slate-600 font-medium max-w-md mx-auto">
          Integrated AICTE Complaint Monitoring, Overlap Intelligence & Inter-Bureau Coordination
        </p>
        <div className="mt-2.5 inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-[11px] font-semibold text-amber-900">
          <span>Smart India Hackathon</span>
          <span className="text-amber-400">•</span>
          <span>SIH26264 Prototype</span>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 shadow-xl border border-slate-200/90 rounded-xl sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-2">
              <span className="font-bold">Error:</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Official Email ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs pl-10 pr-3 py-2.5 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-slate-50"
                  placeholder="officer@aicte.gov.in"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs pl-10 pr-3 py-2.5 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-slate-50"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-md shadow bg-[#0B2545] hover:bg-[#133E87] text-white font-bold text-xs tracking-wide transition-colors disabled:opacity-50"
            >
              <span>{loading ? "Authenticating..." : "Sign In to SyncDesk Vigilance"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Select Personas for Judges */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center">
                <UserCheck className="w-3.5 h-3.5 text-blue-700 mr-1.5" />
                SIH Evaluator Demo Personas
              </span>
              <span className="text-[10px] text-slate-400">Click to autofill</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickSelect(acc.email)}
                  className={`text-left p-2.5 rounded border transition-all text-xs flex items-center justify-between ${
                    email === acc.email
                      ? "bg-blue-50/90 border-blue-600 ring-1 ring-blue-600 text-blue-950 font-semibold"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <div>
                    <div className="font-bold flex items-center space-x-2">
                      <span>{acc.title}</span>
                      <span className="text-[10px] font-medium text-slate-500">({acc.email})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{acc.desc}</div>
                  </div>
                  {email === acc.email && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center text-[11px] text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
            Notice: All data in this installation is synthetic and deterministic. Not affiliated with live AICTE production servers.
          </div>
        </div>
      </div>
    </div>
  );
};
