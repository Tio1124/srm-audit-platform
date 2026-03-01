/**
 * pages/Assets.jsx
 */
import { useState, useEffect } from 'react';
import { assetAPI, orgAPI } from '../services/api';
import { Package, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const CIA = ['High', 'Medium', 'Low'];
const TYPES = ['Application', 'Server', 'Database', 'Network', 'Endpoint', 'Cloud Service', 'Data'];
const CIA_COLORS = { High: 'bg-red-100 text-red-700', Medium: 'bg-yellow-100 text-yellow-700', Low: 'bg-green-100 text-green-700' };

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', owner: '', location: '', asset_type: 'Application', confidentiality: 'Medium', integrity: 'Medium', availability: 'Medium', organization_id: '' });
  const { isAuditor } = useAuth();

  useEffect(() => {
    Promise.all([assetAPI.list(), orgAPI.list()])
      .then(([a, o]) => { setAssets(a.data); setOrgs(o.data); })
      .catch(() => toast.error('Gagal memuat data'))
      .finally(() => setLoading(false));
  }, []);

  const load = () => assetAPI.list().then(res => setAssets(res.data));

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await assetAPI.create({ ...form, organization_id: parseInt(form.organization_id) });
      toast.success('Aset berhasil ditambahkan!');
      setShowForm(false); setForm({ name: '', owner: '', location: '', asset_type: 'Application', confidentiality: 'Medium', integrity: 'Medium', availability: 'Medium', organization_id: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Package size={24} className="text-primary-700" />Inventaris Aset</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola aset organisasi dengan nilai CIA (Module 3)</p>
        </div>
        {isAuditor && <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16} />Tambah Aset</button>}
      </div>

      {showForm && (
        <div className="grc-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Tambah Aset Baru</h2>
            <button onClick={() => setShowForm(false)}><X size={18} className="text-slate-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Organisasi *</label>
              <select value={form.organization_id} onChange={e => setForm({...form, organization_id: e.target.value})} className="form-select" required>
                <option value="">Pilih organisasi...</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Nama Aset *</label><input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="form-input" placeholder="Student Database Server" required /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Pemilik *</label><input type="text" value={form.owner} onChange={e => setForm({...form, owner: e.target.value})} className="form-input" placeholder="IT Department" required /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Lokasi *</label><input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="form-input" placeholder="Cloud Server / Gedung A" required /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Tipe Aset</label><select value={form.asset_type} onChange={e => setForm({...form, asset_type: e.target.value})} className="form-select">{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nilai CIA</label>
              <div className="grid grid-cols-3 gap-2">
                {[['confidentiality', 'C — Confidentiality'], ['integrity', 'I — Integrity'], ['availability', 'A — Availability']].map(([field, label]) => (
                  <div key={field}><p className="text-xs text-slate-500 mb-1">{label}</p><select value={form[field]} onChange={e => setForm({...form, [field]: e.target.value})} className="form-select text-xs">{CIA.map(c => <option key={c}>{c}</option>)}</select></div>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 flex gap-3"><button type="submit" disabled={saving} className="btn-primary">{saving ? 'Menyimpan...' : 'Simpan Aset'}</button><button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Batal</button></div>
          </form>
        </div>
      )}

      {loading ? <div className="skeleton h-40 rounded-xl" /> : assets.length === 0 ? (
        <div className="grc-card p-12 text-center"><Package size={48} className="text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Belum ada aset terdaftar.</p></div>
      ) : (
        <div className="grc-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-primary-900 text-white"><tr>{['Nama Aset', 'Pemilik', 'Lokasi', 'Tipe', 'C', 'I', 'A', 'Skor Kritis'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {assets.map(a => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{a.name}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{a.owner}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{a.location}</td>
                  <td className="px-4 py-3"><span className="bg-primary-100 text-primary-800 text-xs px-2 py-0.5 rounded-full whitespace-nowrap">{a.asset_type}</span></td>
                  {['confidentiality', 'integrity', 'availability'].map(f => <td key={f} className="px-4 py-3 text-center"><span className={`text-xs px-1.5 py-0.5 rounded font-bold ${CIA_COLORS[a[f]]}`}>{a[f]?.[0]}</span></td>)}
                  <td className="px-4 py-3 font-bold text-primary-700">{a.criticality_score?.toFixed(1)}/10</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
