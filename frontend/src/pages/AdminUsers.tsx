import React, { useState, useEffect } from "react";
import { ShieldCheck, Plus, UserCheck, RefreshCw, Key } from "lucide-react";
import { api } from "../api/client";
import { User } from "../types";

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // New user modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Password@123");
  const [role, setRole] = useState("RB Officer");
  const [bureau, setBureau] = useState("Regulation Bureau (RB)");
  const [region, setRegion] = useState("Western");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get<User[]>("/admin/users");
      setUsers(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/admin/users", {
        name,
        email,
        password,
        role,
        bureau,
        region,
        is_active: true
      });
      setShowModal(false);
      setName("");
      setEmail("");
      await fetchUsers();
    } catch (err: any) {
      setError(err?.message || "Failed to create user.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center">
            <ShieldCheck className="w-5 h-5 mr-2 text-blue-900" />
            Vigilance System User & RBAC Management
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Administrative role allocation, bureau access boundaries, and credential provisioning
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#0f2942] hover:bg-blue-900 text-white rounded text-xs font-bold shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Provision New Officer</span>
        </button>
      </div>

      <div className="aicte-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">Officer Name</th>
                <th className="py-3 px-3.5">Official Email</th>
                <th className="py-3 px-3.5">Assigned Role</th>
                <th className="py-3 px-3.5">Bureau / Cell</th>
                <th className="py-3 px-3.5">Region Scope</th>
                <th className="py-3 px-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    Loading user accounts...
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3.5 font-bold text-slate-900">{u.name}</td>
                    <td className="py-3 px-3.5 font-mono text-slate-600">{u.email}</td>
                    <td className="py-3 px-3.5">
                      <span className="font-semibold text-blue-950 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-600">{u.bureau}</td>
                    <td className="py-3 px-3.5 font-medium">{u.region}</td>
                    <td className="py-3 px-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Active
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-300">
            <h3 className="text-sm font-bold text-slate-900 uppercase pb-2 border-b border-slate-100">
              Provision New Officer Account
            </h3>
            {error && <div className="p-2 bg-red-50 text-red-800 text-xs rounded">{error}</div>}
            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 bg-slate-50"
                  placeholder="Dr. Rajesh Sharma"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 bg-slate-50"
                  placeholder="officer@aicte.gov.in"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 bg-slate-50"
                >
                  <option value="RB Officer">RB Officer</option>
                  <option value="PGRC Officer">PGRC Officer</option>
                  <option value="Regional Officer">Regional Officer</option>
                  <option value="Senior Management">Senior Management</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Bureau *</label>
                <select
                  value={bureau}
                  onChange={(e) => setBureau(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 bg-slate-50"
                >
                  <option value="Regulation Bureau (RB)">Regulation Bureau (RB)</option>
                  <option value="Public Grievance Redressal Cell (PGRC)">PGRC</option>
                  <option value="Regional Office (RO)">Regional Office (RO)</option>
                  <option value="Approval Bureau">Approval Bureau</option>
                  <option value="Central">Central Executive</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-blue-900 text-white rounded font-bold"
                >
                  {submitting ? "Saving..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
