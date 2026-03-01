/**
 * pages/AIAssistant.jsx — Module 10: AI Auditor Assistant
 * Fitur paling kritis: Vulnerability Explainer + AI Chat
 */

import { useState } from 'react';
import { aiAPI, vulnAPI } from '../services/api';
import {
  Bot, Send, Sparkles, AlertTriangle, ClipboardCheck,
  Lightbulb, FileText, ChevronDown, Loader2, Copy, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

// Format AI response dengan markdown-like rendering
function AIResponse({ text }) {
  if (!text) return null;

  // Simple markdown-like processing
  const lines = text.split('\n');
  return (
    <div className="prose prose-sm max-w-none">
      {lines.map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-bold text-slate-900 mt-3 mb-1">{line.slice(2, -2)}</p>;
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return <li key={i} className="text-slate-700 ml-4 text-sm">{line.slice(2)}</li>;
        }
        if (line.match(/^\d+\./)) {
          return <li key={i} className="text-slate-700 ml-4 text-sm list-decimal">{line.replace(/^\d+\./, '').trim()}</li>;
        }
        if (line.trim() === '') return <br key={i} />;
        // Handle inline bold: **text**
        const processed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return <p key={i} className="text-slate-700 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: processed }} />;
      })}
    </div>
  );
}

const QUICK_QUESTIONS = [
  { label: 'Apa bahaya SQL Injection?', mode: 'explain', vuln: 'SQL Injection' },
  { label: 'Jelaskan risiko XSS ke manajemen', mode: 'explain', vuln: 'Cross-Site Scripting (XSS)' },
  { label: 'Apa itu NIST CSF?', mode: 'advice', vuln: null },
  { label: 'Bagaimana audit password policy?', mode: 'advice', vuln: null },
  { label: 'Rekomendasi MFA implementation', mode: 'recommend', vuln: null },
  { label: 'Cara mendeteksi intrusion?', mode: 'advice', vuln: null },
];

export default function AIAssistant() {
  const [mode, setMode] = useState('chat'); // chat, explain, recommend
  const [query, setQuery] = useState('');
  const [selectedVuln, setSelectedVuln] = useState('');
  const [orgName, setOrgName] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);

  const MODES = [
    { id: 'chat', label: 'AI Chat', icon: Bot, desc: 'Tanya apa saja seputar keamanan siber' },
    { id: 'explain', label: 'Vulnerability Explainer', icon: AlertTriangle, desc: 'Jelaskan risiko ke manajemen' },
    { id: 'recommend', label: 'Control Recommendation', icon: Lightbulb, desc: 'Rekomendasi langkah mitigasi' },
    { id: 'advice', label: 'Audit Advisor', icon: ClipboardCheck, desc: 'Saran teknis audit NIST CSF' },
  ];

  const VULNS = [
    'SQL Injection', 'Command Injection', 'LDAP Injection',
    'Weak Password Policy', 'No Account Lockout', 'Session Hijacking',
    'No HTTPS / TLS', 'Weak Encryption', 'Exposed Database Backup',
    'IDOR (Insecure Direct Object Reference)', 'Privilege Escalation',
    'Default Credentials', 'Directory Listing Enabled', 'Exposed Admin Panel',
    'Open Unnecessary Ports', 'Cross-Site Scripting (XSS)',
    'Cross-Site Request Forgery (CSRF)', 'No Audit Logs', 'Outdated Server Software'
  ];

  const handleSubmit = async () => {
    if (!query.trim()) {
      toast.error('Masukkan pertanyaan terlebih dahulu');
      return;
    }
    setLoading(true);
    setResponse(null);

    try {
      let res;
      if (mode === 'explain') {
        res = await aiAPI.explainVulnerability(selectedVuln, query, orgName);
      } else if (mode === 'recommend') {
        res = await aiAPI.recommendControls(query, selectedVuln, orgName);
      } else if (mode === 'advice') {
        res = await aiAPI.auditAdvice(query);
      } else {
        res = await aiAPI.chat(query);
      }

      const aiResponse = res.data.response || res.data.executive_summary;
      setResponse(aiResponse);

      // Add to history
      setHistory(prev => [{
        id: Date.now(),
        mode,
        query,
        response: aiResponse,
        time: new Date().toLocaleTimeString('id-ID')
      }, ...prev.slice(0, 9)]);

    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || 'Koneksi ke AI gagal';
      // Tampilkan error lengkap, bukan hanya generic message
      toast.error(errMsg, { duration: 6000 });
      // Juga set di response area supaya user bisa baca dengan jelas
      setResponse(`❌ **Error:** ${errMsg}\n\n💡 **Solusi:** Buka http://localhost:8000/ai/status di browser untuk diagnosa lebih lanjut.`);
    } finally {
      setLoading(false);
    }
  };

  const checkAIStatus = async () => {
    try {
      const res = await aiAPI.checkStatus();
      const d = res.data;
      const msg = d['step_5_connection']?.includes('SUCCESS')
        ? '✅ AI terhubung dan siap!'
        : `❌ ${d.diagnosis}\n💡 ${d.fix}`;
      toast(msg, { duration: 8000, icon: d['step_5_connection']?.includes('SUCCESS') ? '🤖' : '⚠️' });
    } catch (err) {
      toast.error(`Status check gagal: ${err.response?.data?.detail || err.message}`, { duration: 6000 });
    }
  };

  const copyResponse = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Disalin ke clipboard');
  };

  const handleQuickQuestion = (q) => {
    setMode(q.mode);
    setQuery(q.label);
    if (q.vuln) setSelectedVuln(q.vuln);
  };

  return (
    <div className="page-enter h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Bot size={24} className="text-primary-700" />
          ARIA — AI Security Assistant
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Powered by Groq Cloud (LLaMA 3.3 70B) · Asisten audit keamanan berbasis AI
        </p>
        <button onClick={checkAIStatus} className="mt-1 text-xs text-primary-600 hover:underline flex items-center gap-1">
          🔍 Cek status koneksi AI
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Controls */}
        <div className="space-y-4">
          {/* Mode Selection */}
          <div className="grc-card p-4">
            <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Mode AI</p>
            <div className="space-y-2">
              {MODES.map(({ id, label, icon: Icon, desc }) => (
                <button
                  key={id}
                  onClick={() => setMode(id)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    mode === id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <Icon size={14} className={mode === id ? 'text-primary-600' : 'text-slate-400'} />
                    <span className={`text-xs font-semibold ${mode === id ? 'text-primary-800' : 'text-slate-700'}`}>
                      {label}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 pl-5">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Context (optional) */}
          {(mode === 'explain' || mode === 'recommend') && (
            <div className="grc-card p-4 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Konteks</p>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Kerentanan</label>
                <div className="relative">
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedVuln}
                    onChange={e => setSelectedVuln(e.target.value)}
                    className="form-select text-xs pr-7"
                  >
                    <option value="">Pilih kerentanan...</option>
                    {VULNS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nama Organisasi (opsional)</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  placeholder="contoh: PT Bank ABC"
                  className="form-input text-xs"
                />
              </div>
            </div>
          )}

          {/* Quick Questions */}
          <div className="grc-card p-4">
            <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Pertanyaan Cepat</p>
            <div className="space-y-1.5">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q.label}
                  onClick={() => handleQuickQuestion(q)}
                  className="w-full text-left text-xs text-slate-600 hover:text-primary-700 hover:bg-primary-50 px-3 py-2 rounded-lg transition-colors flex items-start gap-2"
                >
                  <Sparkles size={10} className="text-primary-400 mt-0.5 flex-shrink-0" />
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Chat Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Input */}
          <div className="grc-card p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot size={18} className="text-primary-700" />
              </div>
              <div className="flex-1">
                <textarea
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && e.ctrlKey) handleSubmit();
                  }}
                  placeholder={
                    mode === 'explain' ? 'Jelaskan risiko SQL Injection kepada direksi bank kami dalam bahasa yang mudah dipahami...' :
                    mode === 'recommend' ? 'Apa yang harus kami lakukan untuk melindungi dari brute force attack?' :
                    mode === 'advice' ? 'Bagaimana cara memverifikasi implementasi patch management dalam audit?' :
                    'Tanyakan apa saja seputar keamanan siber, audit, atau compliance...'
                  }
                  rows={4}
                  className="w-full resize-none text-sm text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none leading-relaxed"
                />
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-400">Ctrl+Enter untuk kirim</span>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !query.trim()}
                    className="btn-primary text-xs px-4 py-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>ARIA berpikir...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Kirim</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* AI Response */}
          {loading && (
            <div className="grc-card p-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                  <Bot size={18} className="text-white" />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="skeleton h-4 rounded w-3/4" />
                  <div className="skeleton h-4 rounded w-full" />
                  <div className="skeleton h-4 rounded w-5/6" />
                  <div className="skeleton h-4 rounded w-2/3" />
                </div>
              </div>
            </div>
          )}

          {response && !loading && (
            <div className="grc-card overflow-hidden">
              {/* Response header */}
              <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-primary-900 to-primary-700">
                <div className="flex items-center gap-2">
                  <Bot size={16} className="text-white" />
                  <span className="text-white text-sm font-semibold">Respons ARIA</span>
                  <span className="text-primary-200 text-xs">· {MODES.find(m => m.id === mode)?.label}</span>
                </div>
                <button
                  onClick={copyResponse}
                  className="flex items-center gap-1.5 text-primary-200 hover:text-white text-xs transition-colors"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? 'Tersalin!' : 'Salin'}</span>
                </button>
              </div>

              {/* Response content */}
              <div className="p-5">
                <AIResponse text={response} />
              </div>

              {/* Response footer */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Powered by Groq · LLaMA 3.3 70B · NIST CSF Framework
                </span>
                <span className="text-xs text-slate-400">
                  ⚠️ Verifikasi dengan auditor bersertifikat
                </span>
              </div>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="grc-card p-4">
              <p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Riwayat Sesi Ini</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.map(h => (
                  <button
                    key={h.id}
                    onClick={() => { setQuery(h.query); setResponse(h.response); setMode(h.mode); }}
                    className="w-full text-left p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                  >
                    <p className="text-xs font-medium text-slate-700 truncate">{h.query}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400">{h.time}</span>
                      <span className="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">
                        {MODES.find(m => m.id === h.mode)?.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
