/**
 * pages/Organizations.jsx
 */
import { useState, useEffect } from 'react';
import { orgAPI } from '../services/api';
import { Building2, Plus, X, ChevronDown, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const SECTORS = ['Pendidikan', 'Perbankan & Keuangan', 'Kesehatan', 'Pemerintahan', 'Manufaktur', 'Ritel', 'Teknologi', 'Transportasi', 'Lainnya'];
const SYSTEM_TYPES = ['web', 'mobile', 'internal', 'cloud', 'hybrid'];
const EXPOSURE_COLORS = { High: 'badge-non-compliant', Medium: 'badge-partial', Low: 'badge-compliant' };

export function Organizations() {
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
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Building2 size={24} className="text-primary-700" />Profil Organisasi</h1>
        {isAuditor && <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16} />Tambah Organisasi</button>}
      </div>
      {showForm && (
        <div className="grc-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Tambah Organisasi Baru</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Nama Organisasi *</label><input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="form-input" placeholder="PT Universitas ABC" required /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Sektor Bisnis *</label><select value={form.business_sector} onChange={e => setForm({...form, business_sector: e.target.value})} className="form-select" required><option value="">Pilih sektor...</option>{SECTORS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Jumlah Karyawan *</label><input type="number" value={form.employee_count} onChange={e => setForm({...form, employee_count: e.target.value})} className="form-input" placeholder="500" required min="1" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Tipe Sistem *</label><select value={form.system_type} onChange={e => setForm({...form, system_type: e.target.value})} className="form-select">{SYSTEM_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}</select></div>
            <div className="md:col-span-2 flex gap-3"><button type="submit" disabled={saving} className="btn-primary">{saving ? 'Menyimpan...' : 'Simpan Organisasi'}</button><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Batal</button></div>
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
              <h3 className="font-bold text-slate-900 text-sm">{org.name}</h3>
              <p className="text-slate-500 text-xs mt-1">{org.business_sector}</p>
              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                <div><p className="text-[10px] text-slate-400">KARYAWAN</p><p className="text-sm font-semibold text-slate-800">{org.employee_count.toLocaleString()}</p></div>
                <div><p className="text-[10px] text-slate-400">SISTEM</p><p className="text-sm font-semibold text-slate-800 capitalize">{org.system_type}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * pages/Assets.jsx
 */
export function Assets() {
  const [assets, setAssets] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', owner: '', location: '', asset_type: 'Application', confidentiality: 'Medium', integrity: 'Medium', availability: 'Medium', organization_id: '' });
  const { isAuditor } = useAuth();
  const CIA = ['High', 'Medium', 'Low'];
  const TYPES = ['Application', 'Server', 'Database', 'Network', 'Endpoint', 'Cloud Service', 'Data'];
  const CIA_COLORS = { High: 'bg-red-100 text-red-700', Medium: 'bg-yellow-100 text-yellow-700', Low: 'bg-green-100 text-green-700' };

  useEffect(() => { Promise.all([assetAPI.list(), orgAPI.list()]).then(([a, o]) => { setAssets(a.data); setOrgs(o.data); }).finally(() => setLoading(false)); }, []);

  const { assetAPI: assetMod, orgAPI: orgMod } = { assetAPI: require ? null : null }; // placeholder

  const load = async () => {
    const [aRes, oRes] = await Promise.all([
      fetch('/assets', { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }).then(r => r.json()).catch(() => []),
      fetch('/organizations', { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }).then(r => r.json()).catch(() => []),
    ]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const { default: api } = await import('../services/api');
      await api.default.post('/assets', { ...form, organization_id: parseInt(form.organization_id) });
      toast.success('Aset berhasil ditambahkan!');
      setShowForm(false);
      const res = await api.default.get('/assets');
      setAssets(res.data);
    } catch (err) { toast.error(err.response?.data?.detail || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const score = (c, i, a) => {
    const m = { High: 3, Medium: 2, Low: 1 };
    return (((m[c] || 2) + (m[i] || 2) + (m[a] || 2)) / 9 * 10).toFixed(1);
  };

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">📦 Inventaris Aset</h1>
        {isAuditor && <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16} />Tambah Aset</button>}
      </div>
      {showForm && (
        <div className="grc-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Tambah Aset Baru</h2>
            <button onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Organisasi *</label><select value={form.organization_id} onChange={e => setForm({...form, organization_id: e.target.value})} className="form-select" required><option value="">Pilih organisasi...</option>{orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Nama Aset *</label><input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="form-input" placeholder="Student Database" required /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Pemilik (Departemen) *</label><input type="text" value={form.owner} onChange={e => setForm({...form, owner: e.target.value})} className="form-input" placeholder="IT Department" required /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Lokasi *</label><input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="form-input" placeholder="Cloud Server / Data Center" required /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Tipe Aset</label><select value={form.asset_type} onChange={e => setForm({...form, asset_type: e.target.value})} className="form-select">{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Nilai CIA (Confidentiality · Integrity · Availability)</p>
              <div className="grid grid-cols-3 gap-2">
                {['confidentiality', 'integrity', 'availability'].map(field => (
                  <div key={field}><label className="block text-xs text-slate-500 mb-1 capitalize">{field[0].toUpperCase()}</label><select value={form[field]} onChange={e => setForm({...form, [field]: e.target.value})} className="form-select text-xs">{CIA.map(c => <option key={c}>{c}</option>)}</select></div>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 flex gap-3"><button type="submit" disabled={saving} className="btn-primary">{saving ? 'Menyimpan...' : 'Simpan Aset'}</button><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Batal</button></div>
          </form>
        </div>
      )}
      {loading ? <div className="skeleton h-40 rounded-xl" /> : assets.length === 0 ? (
        <div className="grc-card p-12 text-center"><p className="text-slate-500">Belum ada aset terdaftar.</p></div>
      ) : (
        <div className="grc-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-primary-900 text-white">
              <tr>{['Nama Aset', 'Pemilik', 'Lokasi', 'Tipe', 'C', 'I', 'A', 'Skor'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assets.map(a => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{a.name}</td>
                  <td className="px-4 py-3 text-slate-600">{a.owner}</td>
                  <td className="px-4 py-3 text-slate-600">{a.location}</td>
                  <td className="px-4 py-3"><span className="bg-primary-100 text-primary-800 text-xs px-2 py-0.5 rounded-full">{a.asset_type}</span></td>
                  {['confidentiality', 'integrity', 'availability'].map(f => <td key={f} className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CIA_COLORS[a[f]]}`}>{a[f][0]}</span></td>)}
                  <td className="px-4 py-3 font-bold text-primary-800">{a.criticality_score?.toFixed(1)}/10</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Imports used in Assets component above — resolved via dynamic import in handlers
import { orgAPI } from '../services/api';
import { assetAPI } from '../services/api';
