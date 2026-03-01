/**
 * pages/Dashboard.jsx — Dashboard utama dengan ringkasan statistik
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { orgAPI, assetAPI, auditAPI, riskAPI } from '../services/api';
import {
  Building2, Package, Shield, AlertTriangle, ClipboardCheck,
  TrendingUp, ArrowRight, Activity, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ orgs: 0, assets: 0, audits: 0, risks: 0 });
  const [recentAudits, setRecentAudits] = useState([]);
  const [riskSummary, setRiskSummary] = useState({ Critical: 0, High: 0, Medium: 0, Low: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [orgsRes, assetsRes, auditsRes] = await Promise.all([
        orgAPI.list(),
        assetAPI.list(),
        auditAPI.listAssignments(),
      ]);

      // Fetch risk matrix untuk semua organisasi
      const orgs = orgsRes.data;
      let allRisks = [];
      if (orgs.length > 0) {
        const riskResults = await Promise.all(
          orgs.map(org => riskAPI.getRiskMatrix(org.id).catch(() => ({ data: [] })))
        );
        allRisks = riskResults.flatMap(r => r.data || []);
      }

      // Hitung risk summary per level
      const summary = { Critical: 0, High: 0, Medium: 0, Low: 0 };
      allRisks.forEach(r => {
        if (summary[r.risk_level] !== undefined) summary[r.risk_level]++;
      });

      setStats({
        orgs:   orgsRes.data.length,
        assets: assetsRes.data.length,
        audits: auditsRes.data.length,
        risks:  allRisks.length,
      });
      setRiskSummary(summary);
      setRecentAudits(auditsRes.data.slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false)
    }
  };

  const complianceChartData = [
    { name: 'Identify', value: 72, color: '#3B82F6' },
    { name: 'Protect',  value: 65, color: '#8B5CF6' },
    { name: 'Detect',   value: 80, color: '#10B981' },
    { name: 'Respond',  value: 55, color: '#F59E0B' },
    { name: 'Recover',  value: 40, color: '#EF4444' },
  ];

  const quickActions = [
    { label: 'Tambah Organisasi',     to: '/organizations', icon: Building2,     color: 'bg-blue-500' },
    { label: 'Tambah Aset',           to: '/assets',        icon: Package,        color: 'bg-purple-500' },
    { label: 'Mulai Risk Assessment', to: '/risk',          icon: AlertTriangle,  color: 'bg-orange-500' },
    { label: 'Buat Audit Baru',       to: '/audit',         icon: ClipboardCheck, color: 'bg-green-500' },
  ];

  return (
    <div className="page-enter space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-900 to-primary-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              Selamat datang, {user?.full_name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-primary-200 text-sm">
              Platform GRC berbasis NIST Cybersecurity Framework
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl">
            <Shield size={18} />
            <span className="text-sm font-medium">NIST CSF Framework</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Organisasi',           value: stats.orgs,   icon: Building2,     color: 'text-blue-600',   bg: 'bg-blue-50',   to: '/organizations' },
          { label: 'Total Aset',           value: stats.assets, icon: Package,        color: 'text-purple-600', bg: 'bg-purple-50', to: '/assets' },
          { label: 'Audit Berjalan',       value: stats.audits, icon: ClipboardCheck, color: 'text-green-600',  bg: 'bg-green-50',  to: '/audit' },
          { label: 'Risk Teridentifikasi', value: stats.risks,  icon: AlertTriangle,  color: 'text-orange-600', bg: 'bg-orange-50', to: '/risk' },
        ].map(({ label, value, icon: Icon, color, bg, to }) => (
          <Link key={label} to={to} className="grc-card p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center`}>
                <Icon size={20} className={color} />
              </div>
              <ArrowRight size={16} className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {loading ? <span className="skeleton h-7 w-10 inline-block" /> : value}
            </p>
            <p className="text-slate-500 text-sm mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance by NIST Function Chart */}
        <div className="grc-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Activity size={18} className="text-primary-700" />
              Compliance per Fungsi NIST CSF
            </h2>
            <span className="text-xs text-slate-400">Demo Data</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={complianceChartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} domain={[0, 100]} />
              <Tooltip
                formatter={(val) => [`${val}%`, 'Compliance']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {complianceChartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Actions */}
        <div className="grc-card p-5">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-primary-700" />
            Aksi Cepat
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(({ label, to, icon: Icon, color }) => (
              <Link
                key={label}
                to={to}
                className="flex items-center gap-3 p-3.5 border border-slate-200 rounded-xl hover:border-primary-300 hover:bg-primary-50 transition-all group"
              >
                <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon size={17} className="text-white" />
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-primary-800 leading-tight">
                  {label}
                </span>
              </Link>
            ))}
          </div>

          {/* Risk Level Summary */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-2">RISK SUMMARY</p>
            <div className="flex gap-2">
              {[
                { label: 'Critical', count: riskSummary.Critical, color: 'bg-red-600' },
                { label: 'High',     count: riskSummary.High,     color: 'bg-orange-500' },
                { label: 'Medium',   count: riskSummary.Medium,   color: 'bg-yellow-500' },
                { label: 'Low',      count: riskSummary.Low,      color: 'bg-green-500' },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex-1 text-center p-2 bg-slate-50 rounded-lg">
                  <div className={`w-2 h-2 ${color} rounded-full mx-auto mb-1`} />
                  <p className="text-xs font-bold text-slate-900">
                    {loading ? '-' : count}
                  </p>
                  <p className="text-[10px] text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Audits */}
      <div className="grc-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck size={18} className="text-primary-700" />
            Audit Terbaru
          </h2>
          <Link to="/audit" className="text-sm text-primary-700 hover:underline font-medium flex items-center gap-1">
            Lihat semua <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-12 rounded-lg" />)}
          </div>
        ) : recentAudits.length === 0 ? (
          <div className="text-center py-8">
            <ClipboardCheck size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Belum ada audit yang dibuat</p>
            <Link to="/audit" className="btn-primary mt-3 text-xs inline-flex">
              Buat Audit Pertama
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentAudits.map(audit => (
              <div key={audit.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Shield size={14} className="text-primary-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{audit.audit_name}</p>
                    <p className="text-xs text-slate-500">
                      {audit.framework} · {new Date(audit.started_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  audit.status === 'Completed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {audit.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}