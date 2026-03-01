/**
 * pages/RiskAssessment.jsx — Module 4 & 5: Risk Assessment
 * Risk Score = Likelihood (1-5) × Impact (1-5)
 */

import { useState, useEffect } from 'react';
import { assetAPI, vulnAPI, riskAPI, orgAPI } from '../services/api';
import { AlertTriangle, Play, Loader2, RefreshCw } from 'lucide-react';
import RiskMatrix from '../components/RiskMatrix';
import toast from 'react-hot-toast';

const RISK_BADGES = {
  Critical: 'badge-critical',
  High: 'badge-high',
  Medium: 'badge-medium',
  Low: 'badge-low',
};

export default function RiskAssessment() {
  const [orgs, setOrgs] = useState([]);
  const [assets, setAssets] = useState([]);
  const [vulns, setVulns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [selectedVulns, setSelectedVulns] = useState([]);
  const [assetRisk, setAssetRisk] = useState(null);
  const [matrixData, setMatrixData] = useState([]);

  const [initLoading, setInitLoading] = useState(true);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [riskLoading, setRiskLoading] = useState(false);
  const [assessing, setAssessing] = useState(false);
  const [filterCat, setFilterCat] = useState('');

  // ── Load orgs & vulns on mount ──────────────────────────
  useEffect(() => {
    setInitLoading(true);
    Promise.all([orgAPI.list(), vulnAPI.list(), vulnAPI.categories()])
      .then(([o, v, c]) => {
        setOrgs(o.data);
        setVulns(v.data);
        setCategories(c.data);
      })
      .catch(err => {
        console.error('Init error:', err);
        toast.error('Gagal memuat data. Pastikan kamu sudah login.');
      })
      .finally(() => setInitLoading(false));
  }, []);

  // ── Select Organisasi → load assets + risk matrix ───────
  const handleOrgSelect = async (orgId) => {
    setSelectedOrg(orgId);
    setSelectedAsset('');
    setAssetRisk(null);
    setMatrixData([]);
    setAssets([]);

    if (!orgId) return;

    setAssetsLoading(true);
    try {
      const [assetsRes, matrixRes] = await Promise.all([
        assetAPI.list(orgId),
        riskAPI.getRiskMatrix(orgId),
      ]);
      setAssets(assetsRes.data);
      setMatrixData(matrixRes.data.matrix_data || []);

      if (assetsRes.data.length === 0) {
        toast('Organisasi ini belum punya aset. Tambahkan aset terlebih dahulu.', { icon: 'ℹ️' });
      }
    } catch (err) {
      console.error('Load assets error:', err);
      toast.error('Gagal memuat aset organisasi');
    } finally {
      setAssetsLoading(false);
    }
  };

  // ── Select Aset → load existing risk assessments ────────
  const handleAssetSelect = async (assetId) => {
    setSelectedAsset(assetId);
    setSelectedVulns([]);
    setAssetRisk(null);

    if (!assetId) return;

    setRiskLoading(true);
    try {
      const res = await riskAPI.getAssetRisk(assetId);
      setAssetRisk(res.data);
    } catch (err) {
      // 404 = no assessment yet, that's OK
      if (err.response?.status !== 404) {
        console.error('Load risk error:', err);
      }
      setAssetRisk(null);
    } finally {
      setRiskLoading(false);
    }
  };

  // ── Toggle kerentanan ────────────────────────────────────
  const toggleVuln = (id) => {
    setSelectedVulns(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  // ── Jalankan Risk Assessment ─────────────────────────────
  const handleAssess = async () => {
    if (!selectedAsset) {
      toast.error('Pilih aset terlebih dahulu');
      return;
    }
    if (selectedVulns.length === 0) {
      toast.error('Pilih minimal satu kerentanan');
      return;
    }

    setAssessing(true);
    try {
      const payload = {
        asset_id: parseInt(selectedAsset),
        vulnerability_ids: selectedVulns.map(Number),  // pastikan semua integer
      };

      console.log('Risk assess payload:', payload); // debug
      await riskAPI.assess(payload);

      toast.success(`✅ Risk assessment selesai untuk ${selectedVulns.length} kerentanan!`);

      // Reload data
      const [riskRes, matRes] = await Promise.all([
        riskAPI.getAssetRisk(selectedAsset),
        riskAPI.getRiskMatrix(selectedOrg),
      ]);
      setAssetRisk(riskRes.data);
      setMatrixData(matRes.data.matrix_data || []);
      setSelectedVulns([]);

    } catch (err) {
      console.error('Risk assess error full:', err.response?.data || err);

      // Tampilkan error yang informatif
      let msg = 'Gagal melakukan risk assessment';
      if (err.response?.data?.detail) {
        msg = err.response.data.detail;
      } else if (err.response?.data?.vulnerability_ids) {
        msg = `Format salah: ${JSON.stringify(err.response.data.vulnerability_ids)}`;
      } else if (err.response?.status === 422) {
        msg = `Validasi gagal (422): ${JSON.stringify(err.response?.data || {})}`;
      } else if (err.response?.status === 404) {
        msg = 'Aset tidak ditemukan. Refresh halaman dan coba lagi.';
      } else if (err.message) {
        msg = err.message;
      }

      toast.error(msg, { duration: 8000 });
    } finally {
      setAssessing(false);
    }
  };

  const filteredVulns = filterCat ? vulns.filter(v => v.category === filterCat) : vulns;

  // ── RENDER ───────────────────────────────────────────────
  return (
    <div className="page-enter space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle size={24} className="text-orange-500" />
          Risk Assessment
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Identifikasi kerentanan OWASP dan hitung Risk Score = Likelihood × Impact (Module 4 & 5)
        </p>
      </div>

      {/* Loading state */}
      {initLoading && <div className="skeleton h-20 rounded-xl" />}

      {!initLoading && (
        <>
          {/* Step 1: Pilih Org & Aset */}
          <div className="grc-card p-5">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary-900 text-white text-xs rounded-full flex items-center justify-center font-bold">1</span>
              Pilih Organisasi &amp; Aset Target
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Organisasi</label>
                <select
                  value={selectedOrg}
                  onChange={e => handleOrgSelect(e.target.value)}
                  className="form-select"
                >
                  <option value="">— Pilih organisasi —</option>
                  {orgs.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
                {orgs.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    Belum ada organisasi. Tambahkan di menu <a href="/organizations" className="underline">Organisasi</a> dulu.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Aset {assetsLoading && <span className="text-xs text-slate-400">(loading...)</span>}
                </label>
                <select
                  value={selectedAsset}
                  onChange={e => handleAssetSelect(e.target.value)}
                  className="form-select"
                  disabled={!selectedOrg || assetsLoading}
                >
                  <option value="">— Pilih aset —</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.asset_type})</option>
                  ))}
                </select>
                {selectedOrg && assets.length === 0 && !assetsLoading && (
                  <p className="text-xs text-orange-500 mt-1">
                    Tidak ada aset. Tambahkan di menu <a href="/assets" className="underline">Inventaris Aset</a>.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Pilih Kerentanan */}
          {selectedAsset && (
            <div className="grc-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <span className="w-6 h-6 bg-primary-900 text-white text-xs rounded-full flex items-center justify-center font-bold">2</span>
                  Pilih Kerentanan OWASP yang Ditemukan
                  <span className="text-xs text-slate-400">({vulns.length} tersedia)</span>
                </h2>
                <select
                  value={filterCat}
                  onChange={e => setFilterCat(e.target.value)}
                  className="form-select w-auto text-xs"
                >
                  <option value="">Semua Kategori</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {vulns.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
                  <p className="text-sm">Memuat daftar kerentanan...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto pr-1">
                  {filteredVulns.map(v => {
                    const checked = selectedVulns.includes(v.id);
                    const score = v.default_likelihood * v.default_impact;
                    const level = score >= 20 ? 'Critical' : score >= 10 ? 'High' : score >= 5 ? 'Medium' : 'Low';
                    return (
                      <label
                        key={v.id}
                        className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          checked ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleVuln(v.id)}
                          className="mt-0.5 accent-primary-700 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 leading-tight">{v.name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{v.category}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-400">L:{v.default_likelihood} × I:{v.default_impact} = {score}</span>
                            <span className={`text-[10px] font-bold px-1.5 rounded ${RISK_BADGES[level]}`}>{level}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Action Bar */}
              {selectedVulns.length > 0 && (
                <div className="mt-4 flex items-center justify-between bg-primary-50 border border-primary-100 rounded-lg p-3">
                  <div>
                    <span className="text-sm text-primary-800 font-semibold">
                      {selectedVulns.length} kerentanan dipilih
                    </span>
                    <p className="text-xs text-primary-600 mt-0.5">
                      IDs: {selectedVulns.join(', ')}
                    </p>
                  </div>
                  <button
                    onClick={handleAssess}
                    disabled={assessing}
                    className="btn-primary"
                  >
                    {assessing
                      ? <><Loader2 size={14} className="animate-spin" /> Menghitung...</>
                      : <><Play size={14} /> Jalankan Risk Assessment</>
                    }
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Hasil Risk Assessment */}
          {riskLoading && <div className="skeleton h-32 rounded-xl" />}

          {assetRisk && !riskLoading && (
            <div className="grc-card p-5">
              <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-primary-900 text-white text-xs rounded-full flex items-center justify-center font-bold">3</span>
                Hasil Risk Assessment — <span className="text-primary-700">{assetRisk.asset?.name}</span>
              </h2>

              {assetRisk.risk_assessments?.length === 0 ? (
                <p className="text-slate-500 text-sm py-4 text-center">
                  Belum ada assessment untuk aset ini. Pilih kerentanan di atas dan jalankan assessment.
                </p>
              ) : (
                <>
                  {/* Summary */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {['Critical', 'High', 'Medium', 'Low'].map(lvl => (
                      <div key={lvl} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${RISK_BADGES[lvl]}`}>
                        {lvl}: {assetRisk.summary?.[lvl.toLowerCase()] || 0}
                      </div>
                    ))}
                    <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                      Total: {assetRisk.risk_assessments?.length || 0}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-primary-900 text-white">
                        <tr>
                          {['Kerentanan', 'Kategori', 'Likelihood', 'Impact', 'Score', 'Level', 'Dampak'].map(h => (
                            <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {assetRisk.risk_assessments?.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">{r.vulnerability}</td>
                            <td className="px-3 py-2.5 text-slate-500">{r.category}</td>
                            <td className="px-3 py-2.5 text-center font-mono font-bold">{r.likelihood}</td>
                            <td className="px-3 py-2.5 text-center font-mono font-bold">{r.impact}</td>
                            <td className="px-3 py-2.5 text-center font-bold text-lg">{r.risk_score}</td>
                            <td className="px-3 py-2.5">
                              <span className={`${RISK_BADGES[r.risk_level]} text-[10px] whitespace-nowrap`}>
                                {r.risk_level}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-slate-600 max-w-xs">{r.impact_description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Risk Matrix */}
          {matrixData.length > 0 && (
            <div className="grc-card p-5">
              <h2 className="font-semibold text-slate-800 mb-1">
                Risk Matrix — {orgs.find(o => o.id == selectedOrg)?.name}
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Heatmap 5×5: sumbu X = Impact, sumbu Y = Likelihood
              </p>
              <RiskMatrix data={matrixData} />
            </div>
          )}

          {/* Empty state */}
          {!selectedOrg && !initLoading && (
            <div className="grc-card p-12 text-center">
              <AlertTriangle size={48} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Pilih organisasi untuk memulai risk assessment</p>
              <p className="text-slate-400 text-sm mt-1">
                Pastikan sudah menambahkan organisasi dan aset terlebih dahulu
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
