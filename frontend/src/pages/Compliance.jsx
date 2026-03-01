import { useState, useEffect } from 'react';
import { auditAPI } from '../services/api';
import { BarChart3, Loader2 } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import toast from 'react-hot-toast';

const FUNC_COLORS = {
  Identify: '#3B82F6', Protect: '#8B5CF6', Detect: '#10B981', Respond: '#F59E0B', Recover: '#EF4444'
};

export default function Compliance() {
  const [audits, setAudits] = useState([]);
  const [selectedAudit, setSelectedAudit] = useState('');
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { auditAPI.listAssignments().then(res => setAudits(res.data)); }, []);

  const handleSelect = async (auditId) => {
    setSelectedAudit(auditId);
    if (!auditId) { setCompliance(null); return; }
    setLoading(true);
    try {
      const res = await auditAPI.getCompliance(auditId);
      setCompliance(res.data);
    } catch { toast.error('Gagal memuat data compliance'); }
    finally { setLoading(false); }
  };

  const radarData = compliance ? Object.entries(compliance.by_function).map(([name, data]) => ({
    function: name.substring(0, 3).toUpperCase(), fullName: name, percentage: data.percentage
  })) : [];

  const getLabel = (pct) => pct >= 85 ? { text: 'COMPLIANT', color: 'text-green-600 bg-green-50' } : pct >= 60 ? { text: 'NEEDS IMPROVEMENT', color: 'text-yellow-600 bg-yellow-50' } : { text: 'NON-COMPLIANT', color: 'text-red-600 bg-red-50' };

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><BarChart3 size={24} className="text-primary-700" />Compliance Scoring</h1>
        <p className="text-slate-500 text-sm mt-1">Perhitungan otomatis kepatuhan = Compliant ÷ Total Controls × 100% (Module 8)</p>
      </div>

      <div className="grc-card p-4">
        <select value={selectedAudit} onChange={e => handleSelect(e.target.value)} className="form-select">
          <option value="">Pilih audit untuk dilihat compliance score-nya...</option>
          {audits.map(a => <option key={a.id} value={a.id}>#{a.id} · {a.audit_name}</option>)}
        </select>
      </div>

      {loading && <div className="skeleton h-64 rounded-xl" />}

      {compliance && !loading && (
        <>
          {/* Score Hero */}
          <div className="grc-card p-8 text-center">
            <div className="text-7xl font-black text-primary-900 mb-2">{compliance.compliance_percentage}%</div>
            <p className="text-slate-500 mb-4">Overall Compliance Score</p>
            <div className={`inline-block px-6 py-2 rounded-full font-bold text-sm ${getLabel(compliance.compliance_percentage).color}`}>
              {getLabel(compliance.compliance_percentage).text}
            </div>

            {/* Progress bar */}
            <div className="mt-6 max-w-lg mx-auto">
              <div className="w-full bg-slate-100 rounded-full h-4">
                <div
                  className={`h-4 rounded-full transition-all ${compliance.compliance_percentage >= 85 ? 'bg-green-500' : compliance.compliance_percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${compliance.compliance_percentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>0% Non-Compliant</span>
                <span>60% Needs Improvement</span>
                <span>85% Compliant</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <div className="grc-card p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Radar Chart — NIST CSF Functions</h3>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis dataKey="function" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Radar name="Compliance" dataKey="percentage" stroke="#1E3A8A" fill="#1E3A8A" fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip formatter={(val) => [`${val}%`, 'Compliance']} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Function Breakdown */}
            <div className="grc-card p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Breakdown per Fungsi</h3>
              <div className="space-y-4">
                {Object.entries(compliance.by_function).map(([func, data]) => (
                  <div key={func}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">{func}</span>
                      <span className="text-sm font-bold" style={{ color: FUNC_COLORS[func] }}>{data.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div className="h-2.5 rounded-full" style={{ width: `${data.percentage}%`, backgroundColor: FUNC_COLORS[func] }} />
                    </div>
                    <div className="flex gap-3 mt-1">
                      <span className="text-[10px] text-green-600">✅ {data.compliant}</span>
                      <span className="text-[10px] text-yellow-600">⚠️ {data.partial}</span>
                      <span className="text-[10px] text-red-600">❌ {data.non_compliant}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Controls', value: compliance.total_controls, color: 'bg-slate-100', text: 'text-slate-800' },
              { label: 'Compliant', value: compliance.compliant, color: 'bg-green-100', text: 'text-green-800' },
              { label: 'Partially Compliant', value: compliance.partially_compliant, color: 'bg-yellow-100', text: 'text-yellow-800' },
              { label: 'Non-Compliant', value: compliance.non_compliant, color: 'bg-red-100', text: 'text-red-800' },
            ].map(({ label, value, color, text }) => (
              <div key={label} className={`grc-card p-4 text-center ${color}`}>
                <p className={`text-3xl font-black ${text}`}>{value}</p>
                <p className={`text-xs font-medium mt-1 ${text} opacity-80`}>{label}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {!selectedAudit && (
        <div className="grc-card p-12 text-center">
          <BarChart3 size={48} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Pilih audit untuk melihat compliance score</p>
        </div>
      )}
    </div>
  );
}
