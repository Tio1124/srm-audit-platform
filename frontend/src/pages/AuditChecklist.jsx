import { useState, useEffect, useRef } from 'react';
import { auditAPI, orgAPI } from '../services/api';
import { ClipboardCheck, Plus, X, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const STATUS_CONFIG = {
  'Compliant': { label: 'Compliant', cls: 'badge-compliant', icon: '✅' },
  'Partially Compliant': { label: 'Partial', cls: 'badge-partial', icon: '⚠️' },
  'Non-Compliant': { label: 'Non-Compliant', cls: 'badge-non-compliant', icon: '❌' },
  'Not Applicable': { label: 'N/A', cls: 'badge-na', icon: '—' },
};

const FUNC_COLORS = {
  Identify: 'bg-blue-600', Protect: 'bg-purple-600',
  Detect: 'bg-green-600', Respond: 'bg-yellow-600', Recover: 'bg-red-600'
};

export default function AuditChecklist() {
  const [audits, setAudits] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedAudit, setSelectedAudit] = useState('');
  const [checklist, setChecklist] = useState({});
  const [activeFunc, setActiveFunc] = useState('Identify');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAudit, setNewAudit] = useState({ organization_id: '', audit_name: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState({});
  const [uploadingItem, setUploadingItem] = useState(null);
  const fileInputRef = useRef();
  const { user, isAuditor } = useAuth();

  const NIST_FUNCTIONS = ['Identify', 'Protect', 'Detect', 'Respond', 'Recover'];

  useEffect(() => {
    Promise.all([auditAPI.listAssignments(), orgAPI.list()]).then(([a, o]) => { setAudits(a.data); setOrgs(o.data); });
  }, []);

  const handleAuditSelect = async (auditId) => {
    setSelectedAudit(auditId);
    setChecklist({});
    if (!auditId) return;
    setLoading(true);
    try {
      const res = await auditAPI.getChecklist(auditId);
      setChecklist(res.data.checklist || {});
    } catch { toast.error('Gagal memuat checklist'); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (itemId, status) => {
    setSaving(prev => ({ ...prev, [itemId]: true }));
    try {
      await auditAPI.updateChecklistItem(itemId, { status, auditor_notes: null });
      // Update local state
      setChecklist(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(func => {
          updated[func] = updated[func].map(item => item.id === itemId ? { ...item, status } : item);
        });
        return updated;
      });
    } catch { toast.error('Gagal update status'); }
    finally { setSaving(prev => ({ ...prev, [itemId]: false })); }
  };

  const handleNoteUpdate = async (itemId, status, notes) => {
    try {
      await auditAPI.updateChecklistItem(itemId, { status, auditor_notes: notes });
    } catch { /* silent */ } 
  };

  const handleFileUpload = async (e, itemId) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingItem(itemId);
    try {
      await auditAPI.uploadEvidence(itemId, file, 'Evidence file');
      toast.success(`${file.name} berhasil diupload!`);
    } catch (err) { toast.error(err.response?.data?.detail || 'Upload gagal'); }
    finally { setUploadingItem(null); }
  };

  const handleCreateAudit = async (e) => {
    e.preventDefault();
    try {
      await auditAPI.createAssignment({ ...newAudit, organization_id: parseInt(newAudit.organization_id), auditor_id: user.id });
      toast.success('Audit berhasil dibuat! 28 checklist items digenerate otomatis.');
      setShowCreateForm(false);
      const res = await auditAPI.listAssignments();
      setAudits(res.data);
    } catch (err) { toast.error(err.response?.data?.detail || 'Gagal membuat audit'); }
  };

  const autoGenerateFindings = async () => {
    if (!selectedAudit) return;
    try {
      const res = await auditAPI.generateFindings(selectedAudit);
      toast.success(res.data.message);
    } catch (err) { toast.error('Gagal generate findings'); }
  };

  const currentItems = checklist[activeFunc] || [];

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><ClipboardCheck size={24} className="text-primary-700" />Audit Checklist NIST CSF</h1>
          <p className="text-slate-500 text-sm mt-1">Verifikasi 28 kontrol keamanan berdasarkan 5 fungsi NIST CSF (Module 6-9)</p>
        </div>
        {isAuditor && <button onClick={() => setShowCreateForm(true)} className="btn-primary"><Plus size={16} />Buat Audit Baru</button>}
      </div>

      {/* Create Audit Form */}
      {showCreateForm && (
        <div className="grc-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Buat Assignment Audit Baru</h2>
            <button onClick={() => setShowCreateForm(false)}><X size={18} className="text-slate-400" /></button>
          </div>
          <form onSubmit={handleCreateAudit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Nama Audit *</label><input type="text" value={newAudit.audit_name} onChange={e => setNewAudit({...newAudit, audit_name: e.target.value})} className="form-input" placeholder="Audit Q1 2024 — PT ABC" required /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Organisasi *</label><select value={newAudit.organization_id} onChange={e => setNewAudit({...newAudit, organization_id: e.target.value})} className="form-select" required><option value="">Pilih...</option>{orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
            <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-500">👤 Auditor: <span className="font-semibold text-slate-700">{user?.full_name || user?.username}</span> (Anda)</div>
            <div className="md:col-span-3 flex gap-3"><button type="submit" className="btn-primary">Buat & Generate Checklist</button><button type="button" onClick={() => setShowCreateForm(false)} className="btn-secondary">Batal</button></div>
          </form>
        </div>
      )}

      {/* Audit Selector */}
      <div className="grc-card p-4 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-48">
          <select value={selectedAudit} onChange={e => handleAuditSelect(e.target.value)} className="form-select">
            <option value="">Pilih audit untuk dikerjakan...</option>
            {audits.map(a => <option key={a.id} value={a.id}>#{a.id} · {a.audit_name}</option>)}
          </select>
        </div>
        {selectedAudit && isAuditor && (
          <button onClick={autoGenerateFindings} className="btn-secondary text-xs">
            🤖 Auto-Generate Findings
          </button>
        )}
      </div>

      {/* Checklist */}
      {selectedAudit && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Function Tabs */}
          <div className="lg:col-span-1 space-y-1">
            <p className="text-xs font-bold text-slate-500 px-1 mb-2 uppercase tracking-wider">Fungsi NIST CSF</p>
            {NIST_FUNCTIONS.map(func => {
              const items = checklist[func] || [];
              const compliant = items.filter(i => i.status === 'Compliant').length;
              const pct = items.length > 0 ? Math.round((compliant / items.length) * 100) : 0;
              return (
                <button key={func} onClick={() => setActiveFunc(func)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all ${activeFunc === func ? 'bg-primary-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-700 hover:border-primary-300'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${FUNC_COLORS[func]}`} />
                      <span className="text-sm font-semibold">{func}</span>
                    </div>
                    <span className={`text-xs font-bold ${activeFunc === func ? 'text-primary-200' : pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>{pct}%</span>
                  </div>
                  <p className={`text-[10px] mt-1 ${activeFunc === func ? 'text-primary-300' : 'text-slate-400'}`}>{items.length} kontrol</p>
                </button>
              );
            })}
          </div>

          {/* Control Items */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-3 h-3 rounded-full ${FUNC_COLORS[activeFunc]}`} />
              <h2 className="font-bold text-slate-900">{activeFunc}</h2>
              <span className="text-slate-400 text-sm">({currentItems.length} kontrol)</span>
            </div>

            {currentItems.map(item => {
              const ctrl = item.control;
              const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG['Non-Compliant'];
              return (
                <div key={item.id} className={`grc-card p-4 border-l-4 ${item.status === 'Compliant' ? 'border-l-green-500' : item.status === 'Partially Compliant' ? 'border-l-yellow-500' : item.status === 'Not Applicable' ? 'border-l-slate-300' : 'border-l-red-500'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{ctrl.control_id}</span>
                        <span className="text-xs font-semibold text-slate-800">{ctrl.control_name}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed"><b className="text-slate-600">Pertanyaan:</b> {ctrl.audit_question}</p>
                      {ctrl.evidence_required && <p className="text-xs text-slate-400 mt-1"><b>Bukti:</b> {ctrl.evidence_required}</p>}
                    </div>

                    {/* Status Selector */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {saving[item.id] && <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />}
                      <div className="relative">
                        <select
                          value={item.status}
                          onChange={e => handleStatusChange(item.id, e.target.value)}
                          disabled={saving[item.id] || !isAuditor}
                          className={`text-xs font-semibold border-0 rounded-lg px-3 py-1.5 pr-6 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                            item.status === 'Compliant' ? 'bg-green-100 text-green-800' :
                            item.status === 'Partially Compliant' ? 'bg-yellow-100 text-yellow-800' :
                            item.status === 'Not Applicable' ? 'bg-slate-100 text-slate-600' :
                            'bg-red-100 text-red-800'
                          }`}
                        >
                          <option value="Compliant">✅ Compliant</option>
                          <option value="Partially Compliant">⚠️ Partially Compliant</option>
                          <option value="Non-Compliant">❌ Non-Compliant</option>
                          <option value="Not Applicable">— Not Applicable</option>
                        </select>
                      </div>

                      {/* Upload Evidence */}
                      {isAuditor && (
                        <label className="btn-secondary text-xs cursor-pointer py-1.5">
                          {uploadingItem === item.id ? <span>Uploading...</span> : <><Upload size={12} />Bukti</>}
                          <input type="file" className="hidden" onChange={e => handleFileUpload(e, item.id)} accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx" />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Evidence count */}
                  {item.evidence_count > 0 && (
                    <p className="text-[10px] text-green-600 mt-2">📎 {item.evidence_count} file bukti terupload</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading && <div className="skeleton h-64 rounded-xl" />}

      {!selectedAudit && !showCreateForm && (
        <div className="grc-card p-12 text-center">
          <ClipboardCheck size={48} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Pilih audit atau buat yang baru untuk memulai</p>
        </div>
      )}
    </div>
  );
}
