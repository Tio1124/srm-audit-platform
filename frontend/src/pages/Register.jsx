import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Shield, User, Mail, Lock, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', full_name: '', password: '', role: 'auditee' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.register(form);
      toast.success('Akun berhasil dibuat! Silakan login.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registrasi gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
  <img
    src="/logo.png"
    alt="SRM Audit"
    className="h-10 w-auto object-contain"
  />
  <span className="text-primary-900 font-bold text-xl">SRM Audit Platform</span>
</div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Buat Akun Baru</h2>
          <p className="text-slate-500 text-sm mb-6">Pengguna pertama otomatis menjadi Admin</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'full_name', label: 'Nama Lengkap', icon: User, type: 'text', placeholder: 'John Doe' },
              { key: 'username', label: 'Username', icon: User, type: 'text', placeholder: 'johndoe' },
              { key: 'email', label: 'Email', icon: Mail, type: 'email', placeholder: 'john@company.com' },
              { key: 'password', label: 'Password', icon: Lock, type: 'password', placeholder: 'Min. 6 karakter' },
            ].map(({ key, label, icon: Icon, type, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                <div className="relative">
                  <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={type}
                    value={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="form-input pl-9"
                    required
                  />
                </div>
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <div className="relative">
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  className="form-select pr-8"
                >
                  <option value="auditor">Auditor</option>
                  <option value="auditee">Auditee (Staff Organisasi)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary-900 text-white rounded-lg font-semibold hover:bg-primary-800 transition-colors disabled:opacity-60 mt-2"
            >
              {loading ? 'Memproses...' : 'Buat Akun'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm">
              Sudah punya akun?{' '}
              <Link to="/login" className="text-primary-700 font-semibold hover:underline">Masuk</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
