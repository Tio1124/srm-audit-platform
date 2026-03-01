import { useState, useEffect } from 'react';
import { orgAPI } from '../services/api';
import { Building2, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const SECTORS = ['Pendidikan', 'Perbankan & Keuangan', 'Kesehatan', 'Pemerintahan', 'Manufaktur', 'Ritel', 'Teknologi', 'Transportasi', 'Lainnya'];
const SYSTEM_TYPES = ['web', 'mobile', 'internal', 'cloud', 'hybrid'];
const EXPOSURE_COLORS = { High: 'badge-non-compliant', Medium: 'badge-partial', Low: 'badge-compliant' };

export default function Organizations() {
  const [orgs, setOrgs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', business_sector: '', employee_count: '', system_type: 'web' });
  const { isAuditor } = useAuth();

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { const res = await orgAPI.list(); setOrgs(res.data); }
    catch { toast.error('Gagal memuat data'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await orgAPI.create({ ...form, employee_count: parseInt(form.employee_count) });
      toast.success('Organisasi berhasil ditambahkan!');
      setShowForm(false); setForm({ name: '', business_sector: '', employee_count: '', system_type: 'web' });
      load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Building2 size={24} className="text-primary-700" />Profil Organisasi</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola profil organisasi yang diaudit (Module 2)</p>
        </div>
        {isAuditor && <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16} />Tambah Organisasi</button>}
      </div>

      {showForm && (
        <div className="grc-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Tambah Organisasi Baru</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Organisasi *</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="form-input" placeholder="PT Universitas ABC" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sektor Bisnis *</label>
              <select value={form.business_sector} onChange={e => setForm({...form, business_sector: e.target.value})} className="form-select" required>
                <option value="">Pilih sektor...</option>
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah Karyawan *</label>
              <input type="number" value={form.employee_count} onChange={e => setForm({...form, employee_count: e.target.value})} className="form-input" placeholder="500" required min="1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipe Sistem *</label>
              <select value={form.system_type} onChange={e => setForm({...form, system_type: e.target.value})} className="form-select">
                {SYSTEM_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Menyimpan...' : 'Simpan'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Batal</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="skeleton h-40 rounded-xl" /> : orgs.length === 0 ? (
        <div className="grc-card p-12 text-center"><Building2 size={48} className="text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Belum ada organisasi. Tambahkan yang pertama!</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orgs.map(org => (
            <div key={org.id} className="grc-card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center"><Building2 size={18} className="text-primary-700" /></div>
                <span className={EXPOSURE_COLORS[org.exposure_level] || 'badge-na'}>{org.exposure_level} Exposure</span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm mt-2">{org.name}</h3>
              <p className="text-slate-500 text-xs mt-1">{org.business_sector}</p>
              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                <div><p className="text-[10px] text-slate-400 uppercase">Karyawan</p><p className="text-sm font-semibold text-slate-800">{org.employee_count?.toLocaleString()}</p></div>
                <div><p className="text-[10px] text-slate-400 uppercase">Sistem</p><p className="text-sm font-semibold text-slate-800 capitalize">{org.system_type}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
