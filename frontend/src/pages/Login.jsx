/**
 * pages/Login.jsx — Halaman login
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Eye, EyeOff, Lock, User, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      toast.success('Login berhasil! Selamat datang.');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login gagal. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-950 flex-col justify-between p-12">
        {/* Logo */}
        {/* Logo */}
<div className="flex items-center gap-3">
  <img
    src="/logo.png"
    alt="SRM Audit"
    className="h-10 w-auto object-contain"
  />
  <span className="text-white font-bold text-xl">SRM Audit Platform</span>
</div>

        {/* Center content */}
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            AI-Assisted<br/>Cybersecurity<br/>
            <span className="text-primary-300">Risk & Audit</span>
          </h1>
          <p className="text-primary-300 text-lg leading-relaxed mb-10">
            Platform GRC berbasis NIST CSF untuk penilaian risiko dan audit keamanan yang cerdas.
          </p>

          {/* Features */}
          <div className="space-y-4">
            {[
              { icon: '🛡️', title: 'NIST CSF Framework', desc: '28 kontrol audit terstruktur' },
              { icon: '🤖', title: 'AI Auditor Assistant', desc: 'Powered by Groq LLaMA 3.3' },
              { icon: '📊', title: 'Risk Matrix Visual', desc: 'Kalkulasi risiko otomatis' },
              { icon: '📄', title: 'PDF Report Generator', desc: 'Laporan audit profesional' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-center gap-4">
                <span className="text-2xl">{icon}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{title}</p>
                  <p className="text-primary-400 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-primary-500 text-xs">
          © 2026 SRM Audit Group 4 · NIST Cybersecurity Framework
        </p>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-primary-900 rounded-xl flex items-center justify-center">
              <Shield size={22} className="text-white" />
            </div>
            <span className="text-primary-900 font-bold text-xl">SRM Audit Platform</span>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Masuk ke Sistem</h2>
            <p className="text-slate-500 text-sm mb-8">Gunakan kredensial akun Anda</p>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-6 text-red-700 text-sm">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    className="form-input pl-9"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="form-input pl-9 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-primary-900 text-white rounded-lg font-semibold hover:bg-primary-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    <span>Masuk</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <p className="text-slate-500 text-sm">
                Belum punya akun?{' '}
                <Link to="/register" className="text-primary-700 font-semibold hover:underline">
                  Daftar sekarang
                </Link>
              </p>
            </div>
          </div>

          {/* Demo credentials hint */}
          <div className="mt-4 p-4 bg-primary-50 border border-primary-100 rounded-xl">
            <p className="text-primary-800 text-xs font-semibold mb-1">Selamat Datang!</p>
            <p className="text-primary-600 text-xs">
             Siapkan diri untuk pengalaman audit yang lebih terstruktur dan efisien. Masuk untuk mulai mengelola kepatuhan dan asesmen risiko keamanan hari ini.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
