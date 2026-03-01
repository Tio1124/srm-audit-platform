/**
 * pages/Reports.jsx — Module 11: Laporan & PDF Export
 *
 * Fitur:
 * - Pilih audit → tampilkan ringkasan compliance
 * - AI Generate Executive Summary (Module 10B)
 * - Download PDF laporan lengkap
 * - Breakdown per fungsi NIST CSF
 * - Tabel findings
 */

import { useState, useEffect } from 'react';
import { auditAPI, aiAPI, reportAPI } from '../services/api';
import {
  FileText, Download, Loader2, Bot, AlertTriangle,
  Shield, BarChart3, RefreshCw, Sparkles, CheckCircle2,
  XCircle, MinusCircle, HelpCircle, TrendingUp, Eye
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, Cell
} from 'recharts';
import toast from 'react-hot-toast';

// ── Helper: Render teks AI dengan format markdown sederhana ──

function AIResponseText({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];

  lines.forEach((line, i) => {
    if (!line.trim()) {
      elements.push(<div key={i} className="h-2" />);
      return;
    }

    // Bold header: **Text**
    if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(
        <p key={i} className="font-bold text-slate-900 mt-3 mb-1 text-sm">
          {line.slice(2, -2)}
        </p>
      );
      return;
    }

    // Bullet list: - item atau • item
    if (line.match(/^[-•]\s/)) {
      elements.push(
        <li key={i} className="text-slate-700 text-sm ml-4 leading-relaxed list-disc">
          <span dangerouslySetInnerHTML={{
            __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          }} />
        </li>
      );
      return;
    }

    // Numbered list: 1. item
    if (line.match(/^\d+\.\s/)) {
      elements.push(
        <li key={i} className="text-slate-700 text-sm ml-4 leading-relaxed list-decimal">
          <span dangerouslySetInnerHTML={{
            __html: line.replace(/^\d+\.\s/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          }} />
        </li>
      );
      return;
    }

    // Normal paragraph — proses inline bold
    elements.push(
      <p key={i} className="text-slate-700 text-sm leading-relaxed"
        dangerouslySetInnerHTML={{
          __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        }}
      />
    );
  });

  return <div className="space-y-0.5">{elements}</div>;
}

// ── Helper: warna berdasarkan persentase ──────────────────

function getScoreColor(pct) {
  if (pct >= 85) return { text: 'text-green-600', bg: 'bg-green-500', badge: 'bg-green-100 text-green-800' };
  if (pct >= 60) return { text: 'text-yellow-600', bg: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-800' };
  return { text: 'text-red-600', bg: 'bg-red-500', badge: 'bg-red-100 text-red-800' };
}

function getFinalOpinion(pct) {
  if (pct >= 85) return { label: 'SECURE', icon: '✅', color: 'bg-green-600', light: 'bg-green-50 border-green-200 text-green-800' };
  if (pct >= 60) return { label: 'ACCEPTABLE RISK', icon: '⚠️', color: 'bg-yellow-500', light: 'bg-yellow-50 border-yellow-200 text-yellow-800' };
  return { label: 'NEEDS IMMEDIATE ACTION', icon: '🚨', color: 'bg-red-600', light: 'bg-red-50 border-red-200 text-red-800' };
}

// Warna per fungsi NIST CSF
const FUNC_COLORS = {
  Identify: '#3B82F6',
  Protect: '#8B5CF6',
  Detect: '#10B981',
  Respond: '#F59E0B',
  Recover: '#EF4444',
};

const SEVERITY_CONFIG = {
  Critical: { cls: 'bg-red-600 text-white', dot: 'bg-red-600' },
  High: { cls: 'bg-orange-500 text-white', dot: 'bg-orange-500' },
  Medium: { cls: 'bg-yellow-500 text-white', dot: 'bg-yellow-500' },
  Low: { cls: 'bg-green-500 text-white', dot: 'bg-green-500' },
};

// ── Main Component ────────────────────────────────────────

export default function Reports() {
  const [audits, setAudits] = useState([]);
  const [selectedAuditId, setSelectedAuditId] = useState('');
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [findings, setFindings] = useState([]);
  const [execSummary, setExecSummary] = useState('');

  const [loadingData, setLoadingData] = useState(false);
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Load daftar audit saat komponen pertama kali dibuka
  useEffect(() => {
    auditAPI.listAssignments()
      .then(res => setAudits(res.data))
      .catch(() => toast.error('Gagal memuat daftar audit'));
  }, []);

  // ── Pilih Audit ─────────────────────────────────────────
  const handleAuditSelect = async (auditId) => {
    setSelectedAuditId(auditId);
    setCompliance(null);
    setFindings([]);
    setExecSummary('');
    setSelectedAudit(null);

    if (!auditId) return;

    setLoadingData(true);
    try {
      // Load compliance score + findings secara paralel
      const [compRes, findRes] = await Promise.all([
        auditAPI.getCompliance(auditId),
        auditAPI.getFindings(auditId),
      ]);
      setCompliance(compRes.data);
      setFindings(findRes.data);
      setSelectedAudit(audits.find(a => a.id === parseInt(auditId)));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Gagal memuat data audit');
    } finally {
      setLoadingData(false);
    }
  };

  // ── Generate AI Executive Summary ───────────────────────
  const generateExecSummary = async () => {
    if (!selectedAuditId) return;
    setLoadingSummary(true);
    setExecSummary('');
    try {
      const res = await aiAPI.generateExecSummary(selectedAuditId);
      setExecSummary(res.data.executive_summary);
      toast.success('Executive summary berhasil digenerate!');
    } catch (err) {
      const msg = err.response?.data?.detail || 'AI tidak tersedia';
      toast.error(msg, { duration: 6000 });
      setExecSummary(`❌ Gagal generate: ${msg}\n\n💡 Pastikan GROQ_API_KEY sudah diset di .env dan cek http://localhost:8000/ai/status`);
    } finally {
      setLoadingSummary(false);
    }
  };

  // ── Download PDF ─────────────────────────────────────────
  const handleDownloadPDF = async () => {
    if (!selectedAuditId) return;
    setLoadingPDF(true);
    try {
      await reportAPI.downloadPDF(selectedAuditId);
      toast.success('PDF berhasil didownload!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Gagal generate PDF');
    } finally {
      setLoadingPDF(false);
    }
  };

  // ── Data untuk chart ──────────────────────────────────────
  const radarData = compliance
    ? Object.entries(compliance.by_function).map(([name, data]) => ({
        function: name.substring(0, 3).toUpperCase(),
        fullName: name,
        value: data.percentage,
      }))
    : [];

  const barData = compliance
    ? Object.entries(compliance.by_function).map(([name, data]) => ({
        name: name.substring(0, 3),
        fullName: name,
        value: data.percentage,
        color: FUNC_COLORS[name] || '#64748B',
      }))
    : [];

  // ════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════

  return (
    <div className="page-enter space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText size={24} className="text-primary-700" />
            Laporan Audit
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Generate executive summary dengan AI dan export laporan PDF profesional (Module 11)
          </p>
        </div>
        {selectedAuditId && (
          <button
            onClick={handleDownloadPDF}
            disabled={loadingPDF}
            className="btn-primary"
          >
            {loadingPDF
              ? <><Loader2 size={16} className="animate-spin" /> Generating PDF...</>
              : <><Download size={16} /> Download PDF</>
            }
          </button>
        )}
      </div>

      {/* ── Audit Selector ── */}
      <div className="grc-card p-5">
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Pilih Audit
        </label>
        <select
          value={selectedAuditId}
          onChange={e => handleAuditSelect(e.target.value)}
          className="form-select max-w-lg"
        >
          <option value="">— Pilih audit untuk dilihat laporannya —</option>
          {audits.map(a => (
            <option key={a.id} value={a.id}>
              #{a.id} · {a.audit_name} · {new Date(a.started_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </option>
          ))}
        </select>

        {audits.length === 0 && (
          <p className="text-slate-400 text-sm mt-3">
            Belum ada audit. Buat terlebih dahulu di menu{' '}
            <a href="/audit" className="text-primary-700 underline">Audit Checklist</a>.
          </p>
        )}
      </div>

      {/* ── Loading State ── */}
      {loadingData && (
        <div className="grc-card p-10 flex flex-col items-center justify-center gap-3">
          <Loader2 size={32} className="animate-spin text-primary-600" />
          <p className="text-slate-500 text-sm">Memuat data audit...</p>
        </div>
      )}

      {/* ── Konten Laporan (hanya tampil jika data sudah ada) ── */}
      {compliance && !loadingData && (
        <>

          {/* ── Section 1: Overall Score ── */}
          <div className="grc-card overflow-hidden">
            {/* Banner header */}
            <div className="bg-gradient-to-r from-primary-900 to-primary-700 px-6 py-4">
              <p className="text-primary-200 text-xs font-semibold uppercase tracking-wider mb-1">
                {selectedAudit?.framework || 'NIST CSF'} · {selectedAudit?.audit_name}
              </p>
              <p className="text-white text-lg font-bold">Hasil Audit Keamanan</p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">

                {/* Score besar */}
                <div className="text-center">
                  <div className={`text-6xl font-black mb-2 ${getScoreColor(compliance.compliance_percentage).text}`}>
                    {compliance.compliance_percentage}%
                  </div>
                  <p className="text-slate-500 text-sm font-medium">Overall Compliance Score</p>
                  <div className="mt-3">
                    {(() => {
                      const op = getFinalOpinion(compliance.compliance_percentage);
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold border ${op.light}`}>
                          {op.icon} {op.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Progress bar detail */}
                <div className="md:col-span-2 space-y-3">
                  <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                    <div
                      className={`h-4 rounded-full transition-all duration-700 ${getScoreColor(compliance.compliance_percentage).bg}`}
                      style={{ width: `${compliance.compliance_percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>0% · Non-Compliant</span>
                    <span>60% · Needs Improvement</span>
                    <span>85% · Compliant</span>
                  </div>

                  {/* Stat boxes */}
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {[
                      { label: 'Total', value: compliance.total_controls, color: 'bg-slate-100 text-slate-800' },
                      { label: 'Compliant', value: compliance.compliant, color: 'bg-green-100 text-green-800' },
                      { label: 'Partial', value: compliance.partially_compliant, color: 'bg-yellow-100 text-yellow-800' },
                      { label: 'Non-Compliant', value: compliance.non_compliant, color: 'bg-red-100 text-red-800' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className={`rounded-xl p-3 text-center ${color}`}>
                        <p className="text-xl font-black">{value}</p>
                        <p className="text-[10px] font-semibold mt-0.5 opacity-80">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 2: Charts ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Radar Chart */}
            <div className="grc-card p-5">
              <h3 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
                <TrendingUp size={16} className="text-primary-700" />
                Radar Chart — 5 Fungsi NIST CSF
              </h3>
              <p className="text-xs text-slate-400 mb-4">Visualisasi coverage per fungsi</p>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis
                    dataKey="function"
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#475569' }}
                  />
                  <Radar
                    name="Compliance"
                    dataKey="value"
                    stroke="#1E3A8A"
                    fill="#1E3A8A"
                    fillOpacity={0.15}
                    strokeWidth={2}
                    dot={{ fill: '#1E3A8A', r: 4 }}
                  />
                  <Tooltip
                    formatter={(val, _, props) => [`${val}%`, props.payload.fullName]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Bar Chart per fungsi */}
            <div className="grc-card p-5">
              <h3 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
                <BarChart3 size={16} className="text-primary-700" />
                Compliance per Fungsi
              </h3>
              <p className="text-xs text-slate-400 mb-4">Skor tiap domain NIST CSF</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} domain={[0, 100]} />
                  <Tooltip
                    formatter={(val, _, props) => [`${val}%`, props.payload.fullName]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Detail list */}
              <div className="mt-4 space-y-2">
                {Object.entries(compliance.by_function).map(([func, data]) => {
                  const col = getScoreColor(data.percentage);
                  return (
                    <div key={func} className="flex items-center gap-3">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: FUNC_COLORS[func] }}
                      />
                      <span className="text-xs text-slate-600 w-20">{func}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${data.percentage}%`, backgroundColor: FUNC_COLORS[func] }}
                        />
                      </div>
                      <span className={`text-xs font-bold w-10 text-right ${col.text}`}>
                        {data.percentage}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Section 3: Findings Table ── */}
          <div className="grc-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <AlertTriangle size={16} className="text-orange-500" />
                Temuan Audit
                <span className="text-xs font-normal text-slate-400">
                  ({findings.length} temuan total)
                </span>
              </h3>

              {/* Severity summary */}
              <div className="flex gap-2">
                {['Critical', 'High', 'Medium', 'Low'].map(sev => {
                  const count = findings.filter(f => f.severity === sev).length;
                  if (count === 0) return null;
                  return (
                    <span key={sev} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SEVERITY_CONFIG[sev].cls}`}>
                      {sev}: {count}
                    </span>
                  );
                })}
              </div>
            </div>

            {findings.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 size={40} className="text-green-400 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Belum ada findings.</p>
                <p className="text-slate-400 text-xs mt-1">
                  Klik "Auto-Generate Findings" di halaman Audit Checklist terlebih dahulu.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {findings.map((f, idx) => (
                  <div
                    key={f.id}
                    className={`border-l-4 rounded-r-lg p-4 bg-slate-50 ${
                      f.severity === 'Critical' ? 'border-l-red-600' :
                      f.severity === 'High' ? 'border-l-orange-500' :
                      f.severity === 'Medium' ? 'border-l-yellow-500' :
                      'border-l-green-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SEVERITY_CONFIG[f.severity]?.cls || 'bg-slate-200 text-slate-700'}`}>
                            {f.severity}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 truncate">
                            {f.title}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed mb-1">
                          <span className="font-medium">Temuan:</span> {f.issue}
                        </p>

                        {f.affected_asset && (
                          <p className="text-xs text-slate-500">
                            <span className="font-medium">Aset:</span> {f.affected_asset}
                          </p>
                        )}

                        <p className="text-xs text-primary-700 mt-1.5 leading-relaxed">
                          <span className="font-medium">Rekomendasi:</span> {f.recommendation}
                        </p>
                      </div>

                      <span className={`text-[10px] px-2 py-1 rounded-full flex-shrink-0 font-medium ${
                        f.status === 'Closed' ? 'bg-green-100 text-green-700' :
                        f.status === 'In Remediation' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {f.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Section 4: AI Executive Summary ── */}
          <div className="grc-card overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Bot size={16} className="text-primary-700" />
                  AI Executive Summary
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Generate ringkasan eksekutif otomatis berbasis data audit (Module 10B)
                </p>
              </div>
              <button
                onClick={generateExecSummary}
                disabled={loadingSummary}
                className="btn-secondary text-xs"
              >
                {loadingSummary ? (
                  <><Loader2 size={13} className="animate-spin" /> Generating...</>
                ) : execSummary ? (
                  <><RefreshCw size={13} /> Regenerate</>
                ) : (
                  <><Sparkles size={13} /> Generate dengan AI</>
                )}
              </button>
            </div>

            {/* Content */}
            <div className="p-5">

              {/* Empty state */}
              {!execSummary && !loadingSummary && (
                <div className="text-center py-10">
                  <Bot size={44} className="mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-500 text-sm font-medium">Executive Summary belum digenerate</p>
                  <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
                    Klik tombol "Generate dengan AI" untuk membuat ringkasan eksekutif otomatis
                    berdasarkan data compliance dan findings audit ini.
                  </p>
                  <p className="text-slate-300 text-xs mt-3">
                    ⚠️ Memerlukan GROQ_API_KEY yang valid di file .env
                  </p>
                </div>
              )}

              {/* Loading skeleton */}
              {loadingSummary && (
                <div className="space-y-3 py-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Bot size={18} className="text-primary-600 animate-pulse" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 rounded w-2/3" />
                      <div className="skeleton h-3 rounded w-1/3" />
                    </div>
                  </div>
                  {[100, 85, 95, 70, 88, 60].map((w, i) => (
                    <div key={i} className={`skeleton h-3.5 rounded`} style={{ width: `${w}%` }} />
                  ))}
                </div>
              )}

              {/* Summary content */}
              {execSummary && !loadingSummary && (
                <>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4 flex items-start gap-3">
                    <Bot size={18} className="text-primary-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-primary-800 mb-0.5">ARIA — AI Executive Summary</p>
                      <p className="text-[10px] text-primary-500">
                        Generated oleh LLaMA 3.3 70B via Groq · Berdasarkan data audit real-time
                      </p>
                    </div>
                  </div>
                  <AIResponseText text={execSummary} />
                  <p className="text-[10px] text-slate-400 mt-4 pt-3 border-t border-slate-100">
                    ⚠️ Executive summary ini digenerate secara otomatis oleh AI. Harap diverifikasi
                    oleh auditor bersertifikat sebelum digunakan dalam laporan resmi.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* ── Section 5: Export Actions ── */}
          <div className="grc-card p-5">
            <h3 className="font-semibold text-slate-800 mb-1">Export Laporan</h3>
            <p className="text-slate-500 text-xs mb-4">
              Download laporan audit lengkap dalam format PDF — siap untuk presentasi ke manajemen
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDownloadPDF}
                disabled={loadingPDF}
                className="btn-primary"
              >
                {loadingPDF ? (
                  <><Loader2 size={16} className="animate-spin" /> Generating PDF...</>
                ) : (
                  <><Download size={16} /> Download PDF Laporan Lengkap</>
                )}
              </button>
            </div>

            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold text-slate-600 mb-2">📄 Konten PDF mencakup:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                {[
                  '1. Halaman Cover',
                  '2. Ruang Lingkup & Metodologi',
                  '3. Inventaris Aset',
                  '4. Penilaian Risiko OWASP',
                  '5. Hasil Compliance NIST CSF',
                  '6. Tabel Temuan Audit',
                  '7. Rekomendasi',
                  '8. Opini Audit Akhir',
                ].map(item => (
                  <div key={item} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <CheckCircle2 size={11} className="text-green-500 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </>
      )}

      {/* ── Empty State (belum pilih audit) ── */}
      {!selectedAuditId && !loadingData && (
        <div className="grc-card p-14 text-center">
          <FileText size={52} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Pilih audit untuk melihat laporan</p>
          <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
            Pilih dari dropdown di atas untuk melihat compliance score, findings,
            dan generate executive summary menggunakan AI.
          </p>
        </div>
      )}

    </div>
  );
}