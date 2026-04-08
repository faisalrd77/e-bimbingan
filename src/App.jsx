import { useState, useEffect, useCallback, useMemo } from "react";

const DB = {
  async get(k) { try { const r = await window.storage.get(k); return r ? JSON.parse(r.value) : null; } catch { return null; } },
  async set(k, v) { try { await window.storage.set(k, JSON.stringify(v)); return true; } catch { return false; } },
  async del(k) { try { await window.storage.delete(k); return true; } catch { return false; } },
};

const BAB_NAMES = ["Bab I — Pendahuluan", "Bab II — Kajian Pustaka", "Bab III — Metodologi", "Bab IV — Hasil & Pembahasan", "Bab V — Kesimpulan"];
const LEVELS = ["S1 — Skripsi", "S2 — Tesis", "S3 — Disertasi"];
const STATUS = { none: "Belum Mulai", draft: "Draft Diajukan", revisi: "Revisi", approved: "Disetujui" };
const SC = {
  none: { bg: "#F1EFE8", text: "#5F5E5A", dot: "#B4B2A9" },
  draft: { bg: "#FAEEDA", text: "#854F0B", dot: "#EF9F27" },
  revisi: { bg: "#FAECE7", text: "#993C1D", dot: "#D85A30" },
  approved: { bg: "#E1F5EE", text: "#085041", dot: "#1D9E75" },
};
const DOSEN_KEY_DEFAULT = "frd77";
const C = {
  bg: "#f8f7f4", bg2: "#ffffff", accent: "#1a5632", accent2: "#2d8a4e", al: "#e8f5ee",
  text: "#1a1a1a", t2: "#5f5e5a", t3: "#888780", bdr: "#e8e6e1", danger: "#c53030",
};

function newBabs() { return BAB_NAMES.map(() => ({ status: "none", links: [], comments: [], supervisionLogs: [] })); }

export default function App() {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("landing");
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [selId, setSelId] = useState(null);
  const [rk, setRk] = useState(0);
  const refresh = () => setRk(k => k + 1);

  useEffect(() => {
    (async () => {
      const sList = await DB.get("students-list") || [];
      const loaded = [];
      for (const nim of sList) { const s = await DB.get(`student:${nim}`); if (s) loaded.push(s); }
      setStudents(loaded);
      const sess = await DB.get("session");
      if (sess?.type === "student") { const s = await DB.get(`student:${sess.nim}`); if (s) { setUser(s); setView("student"); } }
      else if (sess?.type === "dosen") setView("dosen");
      setLoading(false);
    })();
  }, [rk]);

  const saveStu = async (s) => {
    await DB.set(`student:${s.nim}`, s);
    const list = await DB.get("students-list") || [];
    if (!list.includes(s.nim)) { list.push(s.nim); await DB.set("students-list", list); }
    refresh();
  };
  const addLog = async (nim, text) => {
    const logs = await DB.get(`logs:${nim}`) || [];
    logs.unshift({ time: new Date().toISOString(), text });
    await DB.set(`logs:${nim}`, logs);
  };
  const logout = async () => { await DB.del("session"); setUser(null); setView("landing"); setSelId(null); refresh(); };

  const doLogin = async (nim, pass) => {
    const s = await DB.get(`student:${nim}`);
    if (!s) return "NIM tidak ditemukan";
    if (s.password !== pass) return "Password salah";
    await DB.set("session", { type: "student", nim }); setUser(s); setView("student"); return null;
  };
  const doRegister = async (data) => {
    if (await DB.get(`student:${data.nim}`)) return "NIM sudah terdaftar";
    const s = { ...data, babs: newBabs(), sk: null, approvals: [], createdAt: new Date().toISOString() };
    await saveStu(s); await addLog(s.nim, "Registrasi akun baru");
    await DB.set("session", { type: "student", nim: s.nim }); setUser(s); setView("student"); return null;
  };
  const doDosenLogin = async (key) => {
    const customKey = await DB.get("dosen-key");
    const activeKey = customKey || DOSEN_KEY_DEFAULT;
    if (key !== activeKey) return "Kode akses salah";
    await DB.set("session", { type: "dosen" }); setView("dosen"); return null;
  };

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}><p style={{ color: C.t3, fontFamily: "DM Sans,sans-serif", fontSize: 14 }}>Memuat e-Bimbingan...</p></div>;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Source Serif 4',Georgia,serif", color: C.text }}>
      <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      {view === "landing" && <Landing onS={() => setView("login")} onD={() => setView("dosen-login")} />}
      {view === "login" && <Login onLogin={doLogin} onReg={() => setView("register")} onForgot={() => setView("forgot")} onBack={() => setView("landing")} />}
      {view === "forgot" && <ForgotPassword onBack={() => setView("login")} />}
      {view === "register" && <Register onReg={doRegister} onBack={() => setView("login")} />}
      {view === "dosen-login" && <DosenLogin onLogin={doDosenLogin} onBack={() => setView("landing")} />}
      {view === "student" && user && <StudentView user={user} saveStu={saveStu} addLog={addLog} logout={logout} rk={rk} refresh={refresh} />}
      {view === "dosen" && <DosenView students={students} selId={selId} setSelId={setSelId} saveStu={saveStu} addLog={addLog} logout={logout} rk={rk} refresh={refresh} />}
    </div>
  );
}

/* ═══════ LANDING ═══════ */
function Landing({ onS, onD }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em" }}>e-Bimbingan</h1>
      <p style={{ fontSize: 15, color: C.t2, margin: "0 0 32px", fontFamily: "DM Sans,sans-serif", maxWidth: 360, lineHeight: 1.6 }}>Sistem manajemen bimbingan akademik terstruktur untuk skripsi, tesis, dan disertasi</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 300 }}>
        <button onClick={onS} style={{ ...btn(C.accent, "#fff"), padding: "14px 24px", fontSize: 15, fontWeight: 600 }}>Masuk sebagai Mahasiswa</button>
        <button onClick={onD} style={{ ...btn("transparent", C.accent), padding: "14px 24px", fontSize: 15, fontWeight: 500, border: `1.5px solid ${C.accent}` }}>Dashboard Dosen</button>
      </div>
      <p style={{ fontSize: 12, color: C.t3, marginTop: 40, fontFamily: "DM Sans,sans-serif" }}>by frd77</p>
    </div>
  );
}

/* ═══════ AUTH PAGES ═══════ */
function Login({ onLogin, onReg, onForgot, onBack }) {
  const [nim, setNim] = useState(""); const [pass, setPass] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const go = async () => { if (!nim || !pass) { setErr("Isi NIM dan password"); return; } setBusy(true); setErr(""); const e = await onLogin(nim.trim(), pass); if (e) setErr(e); setBusy(false); };
  return <AuthWrap onBack={onBack} title="Masuk" sub="Gunakan NIM dan password anda">
    {err && <Err>{err}</Err>}
    <Lbl>NIM</Lbl><Inp v={nim} set={setNim} ph="NIM" />
    <Lbl mt>Password</Lbl><Inp v={pass} set={setPass} ph="Password" pw onKey={go} />
    <div style={{ textAlign: "right", marginTop: 6 }}><span onClick={onForgot} style={{ fontSize: 12, color: C.accent, cursor: "pointer", fontFamily: "DM Sans,sans-serif", fontWeight: 500 }}>Lupa password?</span></div>
    <Btn onClick={go} disabled={busy} full mt>{busy ? "Memproses..." : "Masuk"}</Btn>
    <p style={{ fontSize: 13, color: C.t2, marginTop: 16, textAlign: "center", fontFamily: "DM Sans,sans-serif" }}>Belum punya akun? <span onClick={onReg} style={{ color: C.accent, cursor: "pointer", fontWeight: 600 }}>Daftar di sini</span></p>
  </AuthWrap>;
}

function ForgotPassword({ onBack }) {
  const [nim, setNim] = useState("");
  const [step, setStep] = useState("input"); // input | confirm | done
  const [nama, setNama] = useState("");
  const [err, setErr] = useState("");

  const findStudent = async () => {
    if (!nim.trim()) { setErr("Masukkan NIM anda"); return; }
    const s = await DB.get(`student:${nim.trim()}`);
    if (!s) { setErr("NIM tidak ditemukan. Pastikan NIM yang dimasukkan benar."); return; }
    setNama(s.nama);
    setStep("confirm");
    setErr("");
  };

  const resetPassword = async () => {
    const s = await DB.get(`student:${nim.trim()}`);
    if (!s) return;
    s.password = nim.trim();
    await DB.set(`student:${s.nim}`, s);
    const logs = await DB.get(`logs:${s.nim}`) || [];
    logs.unshift({ time: new Date().toISOString(), text: "Password di-reset oleh mahasiswa (lupa password)" });
    await DB.set(`logs:${s.nim}`, logs);
    setStep("done");
  };

  return <AuthWrap onBack={onBack} title="Lupa Password" sub="Reset password anda ke default (NIM)">
    {step === "input" && <>
      {err && <Err>{err}</Err>}
      <Lbl>NIM</Lbl>
      <Inp v={nim} set={setNim} ph="Masukkan NIM anda" onKey={findStudent} />
      <Btn onClick={findStudent} full mt>Cari Akun</Btn>
    </>}
    {step === "confirm" && <>
      <div style={{ padding: 14, borderRadius: 10, background: "#FAEEDA", marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontFamily: "DM Sans,sans-serif", color: "#854F0B", margin: 0, lineHeight: 1.6 }}>
          Akun ditemukan: <strong>{nama}</strong> ({nim}). Password akan di-reset menjadi NIM anda. Setelah login, segera ganti password.
        </p>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={resetPassword} full>Ya, Reset Password</Btn>
        <button onClick={() => { setStep("input"); setNim(""); }} style={{ ...btn("transparent", C.t2), padding: "10px 18px", fontSize: 13, border: `1px solid ${C.bdr}`, borderRadius: 8, flex: 1 }}>Batal</button>
      </div>
    </>}
    {step === "done" && <>
      <div style={{ padding: 14, borderRadius: 10, background: "#E1F5EE", marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontFamily: "DM Sans,sans-serif", color: "#085041", margin: 0, lineHeight: 1.6 }}>
          Password berhasil di-reset. Gunakan <strong>NIM ({nim})</strong> sebagai password untuk login. Segera ganti password setelah masuk.
        </p>
      </div>
      <Btn onClick={onBack} full>Kembali ke Login</Btn>
    </>}
  </AuthWrap>;
}

function Register({ onReg, onBack }) {
  const [f, sf] = useState({ nim: "", nama: "", universitas: "", prodi: "", level: LEVELS[0], judul: "", password: "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const s = (k, v) => sf(p => ({ ...p, [k]: v }));
  const go = async () => {
    if (!f.nim || !f.nama || !f.universitas || !f.prodi || !f.judul || !f.password) { setErr("Semua field wajib diisi"); return; }
    if (f.password.length < 4) { setErr("Password minimal 4 karakter"); return; }
    setBusy(true); setErr(""); const e = await onReg(f); if (e) setErr(e); setBusy(false);
  };
  return <AuthWrap onBack={onBack} title="Registrasi Mahasiswa" sub="Isi data diri untuk membuat akun">
    {err && <Err>{err}</Err>}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <div><Lbl>NIM</Lbl><Inp v={f.nim} set={v => s("nim", v)} ph="NIM" /></div>
      <div><Lbl>Nama Lengkap</Lbl><Inp v={f.nama} set={v => s("nama", v)} ph="Nama" /></div>
    </div>
    <Lbl mt>Universitas</Lbl><Inp v={f.universitas} set={v => s("universitas", v)} ph="Nama universitas" />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
      <div><Lbl>Program Studi</Lbl><Inp v={f.prodi} set={v => s("prodi", v)} ph="Prodi" /></div>
      <div><Lbl>Level</Lbl><select value={f.level} onChange={e => s("level", e.target.value)} style={{ ...iStyle(), appearance: "auto" }}>{LEVELS.map(l => <option key={l}>{l}</option>)}</select></div>
    </div>
    <Lbl mt>Judul Penelitian</Lbl>
    <textarea value={f.judul} onChange={e => s("judul", e.target.value)} rows={3} placeholder="Judul penelitian (bisa diubah nanti)" style={{ ...iStyle(), resize: "vertical", fontFamily: "inherit" }} />
    <Lbl mt>Password</Lbl><Inp v={f.password} set={v => s("password", v)} ph="Minimal 4 karakter" pw />
    <Btn onClick={go} disabled={busy} full mt>{busy ? "Mendaftar..." : "Daftar"}</Btn>
  </AuthWrap>;
}

function DosenLogin({ onLogin, onBack }) {
  const [key, setKey] = useState(""); const [err, setErr] = useState("");
  const go = async () => { const e = await onLogin(key.trim()); if (e) setErr(e); };
  return <AuthWrap onBack={onBack} title="Dashboard Dosen" sub="Masukkan kode akses dosen">
    {err && <Err>{err}</Err>}
    <Lbl>Kode Akses</Lbl><Inp v={key} set={setKey} ph="Masukkan kode" pw onKey={go} />
    <Btn onClick={go} full mt>Masuk</Btn>
  </AuthWrap>;
}

/* ═══════ STUDENT VIEW ═══════ */
function StudentView({ user, saveStu, addLog, logout, rk, refresh }) {
  const [tab, setTab] = useState("progress");
  const [ab, setAb] = useState(-1); // -1=sk, -2=approvals, 0-4=babs
  const [ud, setUd] = useState(user);
  const [logs, setLogs] = useState([]);

  useEffect(() => { (async () => { const s = await DB.get(`student:${user.nim}`); if (s) { if (!s.sk) s.sk = null; if (!s.approvals) s.approvals = []; if (!s.babs[0].supervisionLogs) s.babs = s.babs.map(b => ({...b, supervisionLogs: b.supervisionLogs || []})); setUd(s); } const l = await DB.get(`logs:${user.nim}`) || []; setLogs(l); })(); }, [rk, user.nim]);

  const skApproved = ud.sk?.status === "approved";
  const approved = ud.babs.filter(b => b.status === "approved").length;
  const progress = Math.round((approved / 5) * 100);
  const canBab = (i) => { if (!skApproved) return false; if (i === 0) return true; return ud.babs[i-1].status === "revisi" || ud.babs[i-1].status === "approved"; };

  const submitSK = async (link, note) => {
    const s = { ...ud, sk: { link, note, time: new Date().toISOString(), status: "pending" } };
    await saveStu(s); await addLog(s.nim, "Mengunggah SK Pembimbingan"); setUd(s); refresh();
  };

  const submitLink = async (babIdx, link, note) => {
    const s = { ...ud };
    const b = s.babs[babIdx];
    b.links.push({ url: link, note, time: new Date().toISOString(), version: b.links.length + 1 });
    if (b.status === "none" || b.status === "revisi") b.status = "draft";
    await saveStu(s); await addLog(s.nim, `Mengirim link ${BAB_NAMES[babIdx]} v${b.links.length}`); setUd(s); refresh();
  };

  const submitComment = async (babIdx, text) => {
    const s = { ...ud };
    s.babs[babIdx].comments.push({ from: "student", text, time: new Date().toISOString() });
    await saveStu(s); await addLog(s.nim, `Membalas komentar di ${BAB_NAMES[babIdx]}`); setUd(s); refresh();
  };

  const submitApproval = async (link, note, docType) => {
    const s = { ...ud };
    s.approvals.push({ link, note, docType, from: "student", time: new Date().toISOString(), status: "pending" });
    await saveStu(s); await addLog(s.nim, `Mengunggah dokumen pengesahan: ${docType}`); setUd(s); refresh();
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <Header title="e-Bimbingan" sub={`${ud.nama} — ${ud.nim}`} onLogout={logout} />
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "16px 16px 60px" }}>
        {/* Profile */}
        <Card>
          <span style={badge(C.al, C.accent)}>{ud.level}</span>
          <p style={{ fontSize: 15, fontWeight: 600, margin: "8px 0 2px" }}>{ud.judul || "Judul belum ditentukan"}</p>
          <p style={sub()}>{ud.universitas ? `${ud.universitas} — ` : ""}{ud.prodi}</p>
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={sub()}>Progres keseluruhan</span>
              <span style={{ ...sub(), fontWeight: 600, color: C.accent }}>{progress}%</span>
            </div>
            <div style={{ height: 6, background: C.bdr, borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${progress}%`, background: C.accent, borderRadius: 3, transition: "width 0.4s" }} /></div>
          </div>
        </Card>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.bdr}`, marginBottom: 16 }}>
          {[{ id: "progress", l: "Progres" }, { id: "approvals", l: "Pengesahan" }, { id: "logs", l: "Log" }, { id: "settings", l: "Pengaturan" }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(tab === t.id)}>{t.l}</button>
          ))}
        </div>

        {tab === "progress" && <>
          {/* Navigation: SK + Bab I-V */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
            {/* SK Button */}
            <button onClick={() => setAb(-1)} style={{ ...babBtn(ab === -1, ud.sk?.status === "approved" ? "#1D9E75" : ud.sk ? "#EF9F27" : "#B4B2A9"), minWidth: 100 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: ud.sk?.status === "approved" ? "#1D9E75" : ud.sk ? "#EF9F27" : "#B4B2A9" }} />
                <span style={babLabel()}>SK</span>
              </div>
              <span style={{ fontSize: 9, fontFamily: "DM Sans,sans-serif", color: ud.sk?.status === "approved" ? "#085041" : C.t3 }}>{!ud.sk ? "Belum" : ud.sk.status === "approved" ? "Disetujui" : "Menunggu"}</span>
            </button>
            {/* Bab buttons */}
            {BAB_NAMES.map((_, i) => {
              const bs = ud.babs[i]; const locked = !canBab(i);
              return <button key={i} onClick={() => !locked && setAb(i)} style={{ ...babBtn(ab === i, SC[bs.status].dot), opacity: locked ? 0.4 : 1, cursor: locked ? "not-allowed" : "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: SC[bs.status].dot }} />
                  <span style={babLabel()}>Bab {i + 1}</span>
                </div>
                <span style={{ fontSize: 9, fontFamily: "DM Sans,sans-serif", color: SC[bs.status].text, background: SC[bs.status].bg, padding: "1px 5px", borderRadius: 3 }}>{STATUS[bs.status]}</span>
              </button>;
            })}
          </div>

          {/* SK Panel */}
          {ab === -1 && <Card>
            <h3 style={h3()}>SK Persetujuan Pembimbing</h3>
            <p style={{ ...sub(), marginBottom: 12 }}>Unggah link SK penetapan/persetujuan pembimbing dari pimpinan. SK harus disetujui sebelum bisa mengakses Bab I-V.</p>
            {ud.sk ? (
              <div style={{ padding: 12, borderRadius: 8, background: ud.sk.status === "approved" ? "#E1F5EE" : "#FAEEDA" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontFamily: "DM Sans,sans-serif", fontWeight: 600, color: ud.sk.status === "approved" ? "#085041" : "#854F0B" }}>{ud.sk.status === "approved" ? "Disetujui" : "Menunggu Persetujuan"}</span>
                  <span style={timeLabel()}>{fmtDate(ud.sk.time)}</span>
                </div>
                <a href={ud.sk.link} target="_blank" rel="noopener" style={linkStyle()}>{ud.sk.link}</a>
                {ud.sk.note && <p style={{ ...sub(), marginTop: 2 }}>{ud.sk.note}</p>}
                {ud.sk.dosenNote && <div style={{ marginTop: 8, padding: 8, borderRadius: 6, background: "#EEEDFE" }}>
                  <span style={{ fontSize: 11, fontFamily: "DM Sans,sans-serif", fontWeight: 600, color: "#534AB7" }}>Catatan Dosen:</span>
                  <p style={{ fontSize: 13, margin: "2px 0 0", fontFamily: "DM Sans,sans-serif" }}>{ud.sk.dosenNote}</p>
                </div>}
              </div>
            ) : (
              <LinkForm onSubmit={submitSK} label="Link SK" placeholder="https://drive.google.com/..." btnLabel="Unggah SK" />
            )}
          </Card>}

          {/* Bab Panel */}
          {ab >= 0 && ab <= 4 && <BabPanel bab={ud.babs[ab]} babIdx={ab} role="student" onSubmitLink={(l, n) => submitLink(ab, l, n)} onComment={(t) => submitComment(ab, t)} userName={ud.nama} />}
        </>}

        {tab === "approvals" && <ApprovalsPanel approvals={ud.approvals || []} role="student" onSubmit={submitApproval} />}

        {tab === "logs" && <Card>
          <SectionLabel>Log aktivitas</SectionLabel>
          {logs.length === 0 ? <Empty>Belum ada aktivitas</Empty> : logs.map((l, i) => <LogRow key={i} l={l} last={i === logs.length - 1} />)}
        </Card>}

        {tab === "settings" && <StudentSettings ud={ud} saveStu={saveStu} addLog={addLog} onUpdate={(s) => setUd(s)} refresh={refresh} />}
      </div>
    </div>
  );
}

/* ═══════ STUDENT SETTINGS ═══════ */
function StudentSettings({ ud, saveStu, addLog, onUpdate, refresh }) {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState(null);
  const [judul, setJudul] = useState(ud.judul || "");
  const [judulMsg, setJudulMsg] = useState(null);

  const changePassword = async () => {
    if (!oldPw || !newPw || !confirmPw) { setPwMsg({ type: "err", text: "Semua field wajib diisi" }); return; }
    if (oldPw !== ud.password) { setPwMsg({ type: "err", text: "Password lama salah" }); return; }
    if (newPw.length < 4) { setPwMsg({ type: "err", text: "Password baru minimal 4 karakter" }); return; }
    if (newPw !== confirmPw) { setPwMsg({ type: "err", text: "Konfirmasi password tidak cocok" }); return; }
    const s = { ...ud, password: newPw };
    await saveStu(s); await addLog(s.nim, "Mengubah password");
    onUpdate(s); refresh(); setOldPw(""); setNewPw(""); setConfirmPw("");
    setPwMsg({ type: "ok", text: "Password berhasil diubah" });
  };

  const updateJudul = async () => {
    if (!judul.trim()) { setJudulMsg({ type: "err", text: "Judul tidak boleh kosong" }); return; }
    if (judul.trim() === ud.judul) { setJudulMsg({ type: "err", text: "Judul tidak berubah" }); return; }
    const s = { ...ud, judul: judul.trim() };
    await saveStu(s); await addLog(s.nim, `Mengubah judul penelitian menjadi: "${judul.trim()}"`);
    onUpdate(s); refresh();
    setJudulMsg({ type: "ok", text: "Judul berhasil diperbarui" });
  };

  return <>
    {/* Ubah Judul */}
    <Card>
      <SectionLabel>Judul penelitian</SectionLabel>
      <p style={{ ...sub(), marginBottom: 10 }}>Judul dapat diubah jika ada perubahan selama proses bimbingan.</p>
      {judulMsg && <div style={{ padding: "8px 12px", borderRadius: 6, marginBottom: 10, background: judulMsg.type === "ok" ? "#E1F5EE" : "#FCEBEB", color: judulMsg.type === "ok" ? "#085041" : "#A32D2D", fontSize: 12, fontFamily: "DM Sans,sans-serif" }}>{judulMsg.text}</div>}
      <textarea value={judul} onChange={e => setJudul(e.target.value)} rows={3} style={{ ...iStyle(), resize: "vertical", fontFamily: "DM Sans,sans-serif" }} />
      <Btn onClick={updateJudul} mt>Simpan Judul</Btn>
    </Card>

    {/* Ganti Password */}
    <Card>
      <SectionLabel>Ganti password</SectionLabel>
      {pwMsg && <div style={{ padding: "8px 12px", borderRadius: 6, marginBottom: 10, background: pwMsg.type === "ok" ? "#E1F5EE" : "#FCEBEB", color: pwMsg.type === "ok" ? "#085041" : "#A32D2D", fontSize: 12, fontFamily: "DM Sans,sans-serif" }}>{pwMsg.text}</div>}
      <Lbl>Password Lama</Lbl><Inp v={oldPw} set={setOldPw} ph="Masukkan password lama" pw />
      <Lbl mt>Password Baru</Lbl><Inp v={newPw} set={setNewPw} ph="Minimal 4 karakter" pw />
      <Lbl mt>Konfirmasi Password Baru</Lbl><Inp v={confirmPw} set={setConfirmPw} ph="Ulangi password baru" pw />
      <Btn onClick={changePassword} mt>Ubah Password</Btn>
    </Card>

    {/* Info Akun */}
    <Card>
      <SectionLabel>Informasi akun</SectionLabel>
      <div style={{ fontSize: 13, fontFamily: "DM Sans,sans-serif", lineHeight: 2 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.t2 }}>NIM</span><span style={{ fontWeight: 500 }}>{ud.nim}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.t2 }}>Nama</span><span style={{ fontWeight: 500 }}>{ud.nama}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.t2 }}>Universitas</span><span style={{ fontWeight: 500 }}>{ud.universitas || "-"}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.t2 }}>Program Studi</span><span style={{ fontWeight: 500 }}>{ud.prodi}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.t2 }}>Level</span><span style={{ fontWeight: 500 }}>{ud.level}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.t2 }}>Terdaftar</span><span style={{ fontWeight: 500 }}>{fmtDate(ud.createdAt)}</span></div>
      </div>
    </Card>
  </>;
}

/* ═══════ REKAPITULASI PEMBIMBINGAN (DOSEN) ═══════ */
function RekapitulasiTab({ students }) {
  const [filter, setFilter] = useState("all");
  const [logs, setLogs] = useState({});

  useEffect(() => {
    (async () => {
      const allLogs = {};
      for (const s of students) {
        const l = await DB.get(`logs:${s.nim}`) || [];
        allLogs[s.nim] = l;
      }
      setLogs(allLogs);
    })();
  }, [students]);

  const fs = filter === "all" ? students : students.filter(s => s.level.startsWith(filter));

  const totalBimbingan = students.reduce((n, s) => n + s.babs.reduce((m, b) => m + (b.supervisionLogs?.length || 0), 0), 0);
  const totalLinks = students.reduce((n, s) => n + s.babs.reduce((m, b) => m + b.links.length, 0), 0);
  const totalComments = students.reduce((n, s) => n + s.babs.reduce((m, b) => m + b.comments.filter(c => c.from === "dosen").length, 0), 0);
  const totalApproved = students.reduce((n, s) => n + s.babs.filter(b => b.status === "approved").length, 0);

  return <>
    {/* Summary metrics */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
      <MetricCard label="Total Bimbingan" value={totalBimbingan} color={C.accent} />
      <MetricCard label="Draft Diterima" value={totalLinks} color="#185FA5" />
      <MetricCard label="Feedback Dosen" value={totalComments} color="#534AB7" />
      <MetricCard label="Bab Disetujui" value={totalApproved} color="#1D9E75" />
    </div>

    {/* Filter */}
    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
      {["all", "S1", "S2", "S3"].map(f => <button key={f} onClick={() => setFilter(f)} style={filterBtn(filter === f)}>{f === "all" ? "Semua" : f}</button>)}
    </div>

    {/* Per-student recap */}
    {fs.length === 0 ? <Card><Empty>Belum ada mahasiswa</Empty></Card> : fs.map(s => {
      const babApproved = s.babs.filter(b => b.status === "approved").length;
      const babDraft = s.babs.filter(b => b.status === "draft").length;
      const babRevisi = s.babs.filter(b => b.status === "revisi").length;
      const totalSupLogs = s.babs.reduce((n, b) => n + (b.supervisionLogs?.length || 0), 0);
      const totalStuLinks = s.babs.reduce((n, b) => n + b.links.length, 0);
      const totalDosenFb = s.babs.reduce((n, b) => n + b.comments.filter(c => c.from === "dosen").length, 0);
      const stuLogs = logs[s.nim] || [];
      const lastActivity = stuLogs.length > 0 ? stuLogs[0] : null;

      return (
        <Card key={s.nim}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 2px", fontFamily: "DM Sans,sans-serif" }}>{s.nama}</p>
              <p style={sub()}>{s.nim} — {s.universitas ? `${s.universitas}, ` : ""}{s.prodi}</p>
            </div>
            <span style={badge(C.al, C.accent)}>{s.level.split(" — ")[0]}</span>
          </div>

          <p style={{ fontSize: 13, margin: "0 0 8px", lineHeight: 1.5, fontStyle: "italic", color: C.t2, fontFamily: "DM Sans,sans-serif" }}>{s.judul}</p>

          {/* Progress bar */}
          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
            {s.babs.map((b, i) => <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: SC[b.status].dot }} title={`${BAB_NAMES[i]}: ${STATUS[b.status]}`} />)}
          </div>

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 10 }}>
            <div style={{ background: "#E1F5EE", borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
              <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "#085041" }}>{babApproved}/5</p>
              <p style={{ fontSize: 10, margin: 0, color: "#0F6E56", fontFamily: "DM Sans,sans-serif" }}>Disetujui</p>
            </div>
            <div style={{ background: "#EEEDFE", borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
              <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "#3C3489" }}>{totalSupLogs}</p>
              <p style={{ fontSize: 10, margin: 0, color: "#534AB7", fontFamily: "DM Sans,sans-serif" }}>Bimbingan</p>
            </div>
            <div style={{ background: "#E6F1FB", borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
              <p style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "#0C447C" }}>{totalDosenFb}</p>
              <p style={{ fontSize: 10, margin: 0, color: "#185FA5", fontFamily: "DM Sans,sans-serif" }}>Feedback</p>
            </div>
          </div>

          {/* Status per bab */}
          <div style={{ marginTop: 10 }}>
            {s.babs.map((b, i) => {
              const supCount = b.supervisionLogs?.length || 0;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: i < 4 ? `0.5px solid ${C.bdr}` : "none" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: SC[b.status].dot, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontFamily: "DM Sans,sans-serif", flex: 1 }}>Bab {i + 1}</span>
                  <span style={{ fontSize: 10, fontFamily: "DM Sans,sans-serif", color: SC[b.status].text, background: SC[b.status].bg, padding: "1px 6px", borderRadius: 3 }}>{STATUS[b.status]}</span>
                  <span style={{ fontSize: 10, fontFamily: "DM Sans,sans-serif", color: C.t3 }}>{b.links.length} draft · {supCount} bimbingan</span>
                </div>
              );
            })}
          </div>

          {/* Last activity */}
          {lastActivity && <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 6, background: "#fafaf8", border: `0.5px solid ${C.bdr}` }}>
            <p style={{ fontSize: 11, fontFamily: "DM Sans,sans-serif", color: C.t3, margin: 0 }}>Aktivitas terakhir: <span style={{ color: C.text }}>{lastActivity.text}</span> — {fmtDate(lastActivity.time)}</p>
          </div>}
        </Card>
      );
    })}
  </>;
}

/* ═══════ DOSEN VIEW ═══════ */
function DosenView({ students, selId, setSelId, saveStu, addLog, logout, rk, refresh }) {
  const [sd, setSd] = useState(null);
  const [logs, setLogs] = useState([]);
  const [ab, setAb] = useState(-1);
  const [tab, setTab] = useState("progress");
  const [filter, setFilter] = useState("all");
  const [dosenTab, setDosenTab] = useState("list"); // list | rekap

  useEffect(() => {
    if (!selId) { setSd(null); return; }
    (async () => {
      const s = await DB.get(`student:${selId}`);
      if (s) { if (!s.sk) s.sk = null; if (!s.approvals) s.approvals = []; if (!s.babs[0].supervisionLogs) s.babs = s.babs.map(b => ({...b, supervisionLogs: b.supervisionLogs || []})); setSd(s); }
      const l = await DB.get(`logs:${selId}`) || [];
      setLogs(l);
    })();
  }, [selId, rk]);

  const updateStatus = async (babIdx, st) => {
    const s = { ...sd }; s.babs[babIdx].status = st;
    await saveStu(s); await addLog(s.nim, `Dosen mengubah status ${BAB_NAMES[babIdx]} → "${STATUS[st]}"`); setSd(s); refresh();
  };

  const dosenComment = async (babIdx, text, link) => {
    const s = { ...sd };
    s.babs[babIdx].comments.push({ from: "dosen", text, link: link || null, time: new Date().toISOString() });
    await saveStu(s); await addLog(s.nim, `Dosen memberikan feedback di ${BAB_NAMES[babIdx]}`); setSd(s); refresh();
  };

  const addSupervisionLog = async (babIdx, data) => {
    const s = { ...sd };
    s.babs[babIdx].supervisionLogs.push({ ...data, time: new Date().toISOString() });
    await saveStu(s); await addLog(s.nim, `Dosen mencatat riwayat bimbingan ${BAB_NAMES[babIdx]}`); setSd(s); refresh();
  };

  const approveSK = async (note) => {
    const s = { ...sd }; s.sk.status = "approved"; s.sk.dosenNote = note || "";
    await saveStu(s); await addLog(s.nim, "Dosen menyetujui SK Pembimbing"); setSd(s); refresh();
  };

  const handleApproval = async (idx, link, note) => {
    const s = { ...sd };
    s.approvals[idx] = { ...s.approvals[idx], responseLink: link, responseNote: note, status: "signed", responseTime: new Date().toISOString() };
    await saveStu(s); await addLog(s.nim, `Dosen menandatangani dokumen: ${s.approvals[idx].docType}`); setSd(s); refresh();
  };

  // Student list
  if (!sd) {
    const fs = filter === "all" ? students : students.filter(s => s.level.startsWith(filter));
    const totalDraft = students.reduce((n, s) => n + s.babs.filter(b => b.status === "draft").length, 0);
    const totalApproved = students.reduce((n, s) => n + s.babs.filter(b => b.status === "approved").length, 0);
    const pendingSK = students.filter(s => s.sk && s.sk.status === "pending").length;

    return (
      <div style={{ minHeight: "100vh" }}>
        <Header title="e-Bimbingan" sub="Dashboard Dosen" onLogout={logout} />
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "16px 16px 60px" }}>
          {/* Dosen Tabs */}
          <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.bdr}`, marginBottom: 16 }}>
            {[{ id: "list", l: "Daftar Mahasiswa" }, { id: "rekap", l: "Rekapitulasi" }, { id: "settings", l: "Pengaturan" }].map(t => <button key={t.id} onClick={() => setDosenTab(t.id)} style={tabStyle(dosenTab === t.id)}>{t.l}</button>)}
          </div>

          {dosenTab === "rekap" && <RekapitulasiTab students={students} />}

          {dosenTab === "settings" && <DosenSettings />}

          {dosenTab === "list" && <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
            <MetricCard label="Mahasiswa" value={students.length} />
            <MetricCard label="Draft Masuk" value={totalDraft} color="#EF9F27" />
            <MetricCard label="Bab Disetujui" value={totalApproved} color={C.accent} />
            <MetricCard label="SK Pending" value={pendingSK} color="#D85A30" />
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {["all", "S1", "S2", "S3"].map(f => <button key={f} onClick={() => setFilter(f)} style={filterBtn(filter === f)}>{f === "all" ? "Semua" : f}</button>)}
          </div>
          {fs.length === 0 ? <Card><Empty>Belum ada mahasiswa terdaftar</Empty></Card> : fs.map(s => {
            const ap = s.babs.filter(b => b.status === "approved").length;
            const hasDraft = s.babs.some(b => b.status === "draft");
            const skPending = s.sk && s.sk.status === "pending";
            return (
              <div key={s.nim} onClick={() => { setSelId(s.nim); setAb(-1); setTab("progress"); }} style={{
                background: C.bg2, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: 14, marginBottom: 8, cursor: "pointer",
                borderLeft: skPending ? "3px solid #D85A30" : hasDraft ? "3px solid #EF9F27" : `1px solid ${C.bdr}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 2px", fontFamily: "DM Sans,sans-serif" }}>{s.nama}</p>
                    <p style={sub()}>{s.nim} — {s.prodi}</p>
                  </div>
                  <span style={badge(C.al, C.accent)}>{s.level.split(" — ")[0]}</span>
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 10 }}>{s.babs.map((b, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: SC[b.status].dot }} />)}</div>
                <p style={{ fontSize: 11, color: C.t3, margin: "6px 0 0", fontFamily: "DM Sans,sans-serif" }}>
                  {ap}/5 bab disetujui
                  {hasDraft && <span style={{ color: "#EF9F27", fontWeight: 600 }}> • Draft baru</span>}
                  {skPending && <span style={{ color: "#D85A30", fontWeight: 600 }}> • SK menunggu</span>}
                </p>
              </div>
            );
          })}
          </>}
        </div>
      </div>
    );
  }

  // Detail
  return (
    <div style={{ minHeight: "100vh" }}>
      <Header title={sd.nama} sub={`${sd.nim} — ${sd.level}`} onLogout={logout} onBack={() => { setSelId(null); setSd(null); }} />
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "16px 16px 60px" }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={badge(C.al, C.accent)}>{sd.level}</span>
              <p style={{ fontSize: 15, fontWeight: 600, margin: "8px 0 2px" }}>{sd.judul}</p>
              <p style={sub()}>{sd.universitas ? `${sd.universitas} — ` : ""}{sd.prodi}</p>
            </div>
            <ResetPasswordBtn student={sd} saveStu={saveStu} addLog={addLog} onDone={(s) => { setSd(s); refresh(); }} />
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 10 }}>{sd.babs.map((b, i) => <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: SC[b.status].dot }} />)}</div>
          <p style={{ fontSize: 11, color: C.t3, margin: "4px 0 0", fontFamily: "DM Sans,sans-serif" }}>{sd.babs.filter(b => b.status === "approved").length}/5 bab disetujui</p>
        </Card>

        <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.bdr}`, marginBottom: 16 }}>
          {[{ id: "progress", l: "Progres" }, { id: "approvals", l: "Pengesahan" }, { id: "logs", l: "Log" }].map(t => <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(tab === t.id)}>{t.l}</button>)}
        </div>

        {tab === "progress" && <>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
            <button onClick={() => setAb(-1)} style={{ ...babBtn(ab === -1, sd.sk?.status === "approved" ? "#1D9E75" : sd.sk ? "#EF9F27" : "#B4B2A9"), minWidth: 80 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 7, height: 7, borderRadius: "50%", background: sd.sk?.status === "approved" ? "#1D9E75" : sd.sk ? "#EF9F27" : "#B4B2A9" }} /><span style={babLabel()}>SK</span></div>
            </button>
            {BAB_NAMES.map((_, i) => <button key={i} onClick={() => setAb(i)} style={babBtn(ab === i, SC[sd.babs[i].status].dot)}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 7, height: 7, borderRadius: "50%", background: SC[sd.babs[i].status].dot }} /><span style={babLabel()}>Bab {i + 1}</span></div>
            </button>)}
          </div>

          {ab === -1 && <Card>
            <h3 style={h3()}>SK Persetujuan Pembimbing</h3>
            {!sd.sk ? <Empty>Mahasiswa belum mengunggah SK</Empty> : (
              <div style={{ padding: 12, borderRadius: 8, background: sd.sk.status === "approved" ? "#E1F5EE" : "#FAEEDA" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontFamily: "DM Sans,sans-serif", fontWeight: 600, color: sd.sk.status === "approved" ? "#085041" : "#854F0B" }}>{sd.sk.status === "approved" ? "Disetujui" : "Menunggu Persetujuan"}</span>
                  <span style={timeLabel()}>{fmtDate(sd.sk.time)}</span>
                </div>
                <a href={sd.sk.link} target="_blank" rel="noopener" style={linkStyle()}>{sd.sk.link}</a>
                {sd.sk.note && <p style={sub()}>{sd.sk.note}</p>}
                {sd.sk.status === "pending" && <div style={{ marginTop: 10 }}>
                  <ApproveForm onApprove={approveSK} />
                </div>}
              </div>
            )}
          </Card>}

          {ab >= 0 && ab <= 4 && <>
            <BabPanel bab={sd.babs[ab]} babIdx={ab} role="dosen" userName={sd.nama}
              onComment={(text, link) => dosenComment(ab, text, link)}
              onStatusChange={(st) => updateStatus(ab, st)} />
            {/* Supervision Log */}
            <Card mt>
              <SectionLabel>Riwayat pembimbingan — {BAB_NAMES[ab]}</SectionLabel>
              <p style={{ ...sub(), marginBottom: 12 }}>Catatan pembimbingan terstruktur sebagai bukti pelaksanaan bimbingan.</p>
              {sd.babs[ab].supervisionLogs.map((log, i) => (
                <div key={i} style={{ padding: 12, borderRadius: 8, background: "#EEEDFE", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontFamily: "DM Sans,sans-serif", fontWeight: 600, color: "#534AB7" }}>{fmtDate(log.time)}</span>
                  </div>
                  <div style={{ fontSize: 13, fontFamily: "DM Sans,sans-serif", lineHeight: 1.6 }}>
                    <p style={{ margin: "0 0 4px" }}><strong>Topik:</strong> {log.topik}</p>
                    <p style={{ margin: "0 0 4px" }}><strong>Catatan/Arahan:</strong> {log.catatan}</p>
                    <p style={{ margin: "0 0 4px" }}><strong>Tindak Lanjut:</strong> {log.tindakLanjut}</p>
                    {log.deadline && <p style={{ margin: 0 }}><strong>Deadline Revisi:</strong> {log.deadline}</p>}
                  </div>
                </div>
              ))}
              <SupervisionForm onSubmit={(data) => addSupervisionLog(ab, data)} />
            </Card>
          </>}
        </>}

        {tab === "approvals" && <ApprovalsPanel approvals={sd.approvals || []} role="dosen" onSign={handleApproval} />}

        {tab === "logs" && <Card>
          <SectionLabel>Log aktivitas</SectionLabel>
          {logs.slice(0, 20).map((l, i) => <LogRow key={i} l={l} last={i === Math.min(logs.length, 20) - 1} />)}
        </Card>}
      </div>
    </div>
  );
}

/* ═══════ BAB PANEL ═══════ */
function BabPanel({ bab, babIdx, role, onSubmitLink, onComment, onStatusChange, userName }) {
  const [li, setLi] = useState(""); const [ni, setNi] = useState("");
  const [ci, setCi] = useState(""); const [cli, setCli] = useState("");
  const st = SC[bab.status];

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h3 style={h3()}>{BAB_NAMES[babIdx]}</h3>
          <span style={{ fontSize: 12, fontFamily: "DM Sans,sans-serif", color: st.text, fontWeight: 500, background: st.bg, padding: "2px 8px", borderRadius: 4 }}>{STATUS[bab.status]}</span>
        </div>
        {role === "dosen" && bab.status !== "none" && <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => onStatusChange("revisi")} style={{ ...btn("transparent", "#D85A30"), padding: "6px 12px", fontSize: 11, fontWeight: 600, border: "1px solid #D85A30" }}>Revisi</button>
          <button onClick={() => onStatusChange("approved")} style={{ ...btn(C.accent, "#fff"), padding: "6px 12px", fontSize: 11, fontWeight: 600 }}>Setujui</button>
        </div>}
      </div>

      {/* Submit link (student only) */}
      {role === "student" && <div style={{ padding: 12, borderRadius: 8, background: "#fafaf8", marginBottom: 12, border: `1px solid ${C.bdr}` }}>
        <Lbl>Kirim link Google Drive</Lbl>
        <Inp v={li} set={setLi} ph="https://drive.google.com/..." />
        <Lbl mt>Catatan (opsional)</Lbl>
        <Inp v={ni} set={setNi} ph="Catatan untuk pembimbing..." />
        <Btn onClick={() => { if (li.trim()) { onSubmitLink(li.trim(), ni.trim()); setLi(""); setNi(""); } }} disabled={!li.trim()} mt>Kirim Link</Btn>
      </div>}

      {/* Links */}
      <SectionLabel>Link dokumen ({bab.links.length} versi)</SectionLabel>
      {bab.links.length === 0 ? <Empty>Belum ada link</Empty> : [...bab.links].reverse().map((lnk, i) => (
        <div key={i} style={{ padding: "8px 0", borderBottom: i < bab.links.length - 1 ? `0.5px solid ${C.bdr}` : "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontFamily: "DM Sans,sans-serif", fontWeight: 600, color: C.accent }}>v{lnk.version}</span>
            <span style={timeLabel()}>{fmtDate(lnk.time)}</span>
          </div>
          <a href={lnk.url} target="_blank" rel="noopener" style={linkStyle()}>{lnk.url}</a>
          {lnk.note && <p style={sub()}>{lnk.note}</p>}
        </div>
      ))}

      {/* Comments */}
      <SectionLabel mt>Komentar & feedback</SectionLabel>
      {bab.comments.length === 0 && <Empty>Belum ada komentar</Empty>}
      {[...bab.comments].reverse().map((c, i) => (
        <div key={i} style={{ padding: "10px 12px", borderRadius: 8, background: c.from === "dosen" ? "#EEEDFE" : C.al, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontFamily: "DM Sans,sans-serif", fontWeight: 600, color: c.from === "dosen" ? "#534AB7" : C.accent }}>{c.from === "dosen" ? "Pembimbing" : (role === "student" ? "Anda" : userName)}</span>
            <span style={timeLabel()}>{fmtDate(c.time)}</span>
          </div>
          <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5, fontFamily: "DM Sans,sans-serif" }}>{c.text}</p>
          {c.link && <a href={c.link} target="_blank" rel="noopener" style={{ ...linkStyle(), fontSize: 12, marginTop: 4, display: "inline-block" }}>📎 {c.link}</a>}
        </div>
      ))}

      {/* Reply */}
      {role === "student" && <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Inp v={ci} set={setCi} ph="Balas komentar..." flex onKey={() => { if (ci.trim()) { onComment(ci.trim()); setCi(""); } }} />
        <Btn onClick={() => { if (ci.trim()) { onComment(ci.trim()); setCi(""); } }} disabled={!ci.trim()}>Kirim</Btn>
      </div>}
      {role === "dosen" && <div style={{ marginTop: 8, padding: 12, borderRadius: 8, background: "#fafaf8", border: `1px solid ${C.bdr}` }}>
        <Lbl>Feedback untuk mahasiswa</Lbl>
        <Inp v={ci} set={setCi} ph="Tulis feedback..." />
        <Lbl mt>Link file komentar/koreksi (opsional)</Lbl>
        <Inp v={cli} set={setCli} ph="https://drive.google.com/..." />
        <Btn onClick={() => { if (ci.trim()) { onComment(ci.trim(), cli.trim() || null); setCi(""); setCli(""); } }} disabled={!ci.trim()} mt>Kirim Feedback</Btn>
      </div>}
    </Card>
  );
}

/* ═══════ SUPERVISION FORM ═══════ */
function SupervisionForm({ onSubmit }) {
  const [f, sf] = useState({ topik: "", catatan: "", tindakLanjut: "", deadline: "" });
  const [open, setOpen] = useState(false);
  const s = (k, v) => sf(p => ({ ...p, [k]: v }));
  const go = () => {
    if (!f.topik || !f.catatan || !f.tindakLanjut) return;
    onSubmit(f); sf({ topik: "", catatan: "", tindakLanjut: "", deadline: "" }); setOpen(false);
  };
  if (!open) return <button onClick={() => setOpen(true)} style={{ ...btn("transparent", C.accent), padding: "8px 14px", fontSize: 12, fontWeight: 600, border: `1px solid ${C.accent}`, width: "100%" }}>+ Tambah Catatan Bimbingan</button>;
  return (
    <div style={{ padding: 14, borderRadius: 8, border: `1px solid ${C.accent}`, background: "#fafaf8" }}>
      <Lbl>Topik Pembahasan *</Lbl><Inp v={f.topik} set={v => s("topik", v)} ph="Topik yang dibahas..." />
      <Lbl mt>Catatan/Arahan Dosen *</Lbl><textarea value={f.catatan} onChange={e => s("catatan", e.target.value)} rows={3} placeholder="Arahan dan masukan..." style={{ ...iStyle(), resize: "vertical", fontFamily: "DM Sans,sans-serif" }} />
      <Lbl mt>Tindak Lanjut Mahasiswa *</Lbl><Inp v={f.tindakLanjut} set={v => s("tindakLanjut", v)} ph="Yang harus dikerjakan mahasiswa..." />
      <Lbl mt>Deadline Revisi</Lbl><Inp v={f.deadline} set={v => s("deadline", v)} ph="Contoh: 15 April 2026" />
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Btn onClick={go} disabled={!f.topik || !f.catatan || !f.tindakLanjut}>Simpan</Btn>
        <button onClick={() => setOpen(false)} style={{ ...btn("transparent", C.t3), padding: "8px 14px", fontSize: 12 }}>Batal</button>
      </div>
    </div>
  );
}

/* ═══════ APPROVALS PANEL ═══════ */
function ApprovalsPanel({ approvals, role, onSubmit, onSign }) {
  const [li, setLi] = useState(""); const [ni, setNi] = useState(""); const [dt, setDt] = useState("");
  return (
    <Card>
      <SectionLabel>Pengesahan dokumen</SectionLabel>
      <p style={{ ...sub(), marginBottom: 12 }}>Unggah lembar pembimbingan, persetujuan, atau dokumen yang membutuhkan tanda tangan dosen.</p>

      {role === "student" && <div style={{ padding: 12, borderRadius: 8, background: "#fafaf8", border: `1px solid ${C.bdr}`, marginBottom: 16 }}>
        <Lbl>Jenis Dokumen</Lbl>
        <select value={dt} onChange={e => setDt(e.target.value)} style={{ ...iStyle(), appearance: "auto" }}>
          <option value="">— Pilih jenis dokumen —</option>
          <option>Lembar Bimbingan</option>
          <option>Lembar Persetujuan Seminar Proposal</option>
          <option>Lembar Persetujuan Sidang</option>
          <option>Lembar Persetujuan Publikasi</option>
          <option>Lainnya</option>
        </select>
        <Lbl mt>Link Dokumen</Lbl><Inp v={li} set={setLi} ph="https://drive.google.com/..." />
        <Lbl mt>Catatan (opsional)</Lbl><Inp v={ni} set={setNi} ph="Catatan..." />
        <Btn onClick={() => { if (li.trim() && dt) { onSubmit(li.trim(), ni.trim(), dt); setLi(""); setNi(""); setDt(""); } }} disabled={!li.trim() || !dt} mt>Unggah Dokumen</Btn>
      </div>}

      {approvals.length === 0 ? <Empty>Belum ada dokumen pengesahan</Empty> : [...approvals].reverse().map((a, idx) => {
        const realIdx = approvals.length - 1 - idx;
        return (
          <div key={idx} style={{ padding: 14, borderRadius: 10, border: `1px solid ${C.bdr}`, marginBottom: 10, background: a.status === "signed" ? "#E1F5EE" : "#FAEEDA" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontFamily: "DM Sans,sans-serif", fontWeight: 600 }}>{a.docType}</span>
              <span style={{ fontSize: 11, fontFamily: "DM Sans,sans-serif", fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: a.status === "signed" ? "#E1F5EE" : "#FAEEDA", color: a.status === "signed" ? "#085041" : "#854F0B" }}>{a.status === "signed" ? "Ditandatangani" : "Menunggu"}</span>
            </div>
            <a href={a.link} target="_blank" rel="noopener" style={linkStyle()}>{a.link}</a>
            {a.note && <p style={{ ...sub(), marginTop: 2 }}>{a.note}</p>}
            <span style={timeLabel()}>{fmtDate(a.time)}</span>

            {a.status === "signed" && a.responseLink && <div style={{ marginTop: 8, padding: 10, borderRadius: 6, background: "#EEEDFE" }}>
              <span style={{ fontSize: 11, fontFamily: "DM Sans,sans-serif", fontWeight: 600, color: "#534AB7" }}>Dokumen yang ditandatangani:</span>
              <a href={a.responseLink} target="_blank" rel="noopener" style={{ ...linkStyle(), display: "block", marginTop: 2 }}>{a.responseLink}</a>
              {a.responseNote && <p style={{ ...sub(), marginTop: 2 }}>{a.responseNote}</p>}
              <span style={timeLabel()}>{fmtDate(a.responseTime)}</span>
            </div>}

            {role === "dosen" && a.status === "pending" && <SignForm onSign={(link, note) => onSign(realIdx, link, note)} />}
          </div>
        );
      })}
    </Card>
  );
}

function SignForm({ onSign }) {
  const [li, setLi] = useState(""); const [ni, setNi] = useState(""); const [open, setOpen] = useState(false);
  if (!open) return <button onClick={() => setOpen(true)} style={{ ...btn(C.accent, "#fff"), padding: "6px 14px", fontSize: 11, fontWeight: 600, marginTop: 8 }}>Tandatangani</button>;
  return (
    <div style={{ marginTop: 8, padding: 10, borderRadius: 6, background: "#fafaf8", border: `1px solid ${C.bdr}` }}>
      <Lbl>Link dokumen yang sudah ditandatangani</Lbl><Inp v={li} set={setLi} ph="https://drive.google.com/..." />
      <Lbl mt>Catatan (opsional)</Lbl><Inp v={ni} set={setNi} ph="Catatan..." />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Btn onClick={() => { if (li.trim()) { onSign(li.trim(), ni.trim()); } }} disabled={!li.trim()}>Kirim</Btn>
        <button onClick={() => setOpen(false)} style={{ ...btn("transparent", C.t3), padding: "6px 12px", fontSize: 11 }}>Batal</button>
      </div>
    </div>
  );
}

function ApproveForm({ onApprove }) {
  const [note, setNote] = useState(""); const [open, setOpen] = useState(false);
  if (!open) return <button onClick={() => setOpen(true)} style={{ ...btn(C.accent, "#fff"), padding: "8px 16px", fontSize: 12, fontWeight: 600, marginTop: 8 }}>Setujui SK</button>;
  return (
    <div style={{ marginTop: 8 }}>
      <Lbl>Catatan (opsional)</Lbl><Inp v={note} set={setNote} ph="Catatan persetujuan..." />
      <Btn onClick={() => onApprove(note.trim())} mt>Konfirmasi Persetujuan</Btn>
    </div>
  );
}

function LinkForm({ onSubmit, label, placeholder, btnLabel }) {
  const [li, setLi] = useState(""); const [ni, setNi] = useState("");
  return (
    <div style={{ padding: 12, borderRadius: 8, background: "#fafaf8", border: `1px solid ${C.bdr}` }}>
      <Lbl>{label}</Lbl><Inp v={li} set={setLi} ph={placeholder} />
      <Lbl mt>Catatan (opsional)</Lbl><Inp v={ni} set={setNi} ph="Catatan..." />
      <Btn onClick={() => { if (li.trim()) { onSubmit(li.trim(), ni.trim()); setLi(""); setNi(""); } }} disabled={!li.trim()} mt>{btnLabel}</Btn>
    </div>
  );
}

/* ═══════ DOSEN SETTINGS ═══════ */
function DosenSettings() {
  const [oldKey, setOldKey] = useState("");
  const [newKey, setNewKey] = useState("");
  const [confirmKey, setConfirmKey] = useState("");
  const [msg, setMsg] = useState(null);

  const changeKey = async () => {
    if (!oldKey || !newKey || !confirmKey) { setMsg({ type: "err", text: "Semua field wajib diisi" }); return; }
    const customKey = await DB.get("dosen-key");
    const activeKey = customKey || DOSEN_KEY_DEFAULT;
    if (oldKey !== activeKey) { setMsg({ type: "err", text: "Kode akses lama salah" }); return; }
    if (newKey.length < 4) { setMsg({ type: "err", text: "Kode akses baru minimal 4 karakter" }); return; }
    if (newKey !== confirmKey) { setMsg({ type: "err", text: "Konfirmasi kode akses tidak cocok" }); return; }
    await DB.set("dosen-key", newKey);
    setOldKey(""); setNewKey(""); setConfirmKey("");
    setMsg({ type: "ok", text: "Kode akses berhasil diubah" });
  };

  return <>
    <Card>
      <SectionLabel>Ubah kode akses dosen</SectionLabel>
      <p style={{ ...sub(), marginBottom: 12 }}>Kode akses digunakan untuk login ke dashboard dosen. Pastikan anda mengingat kode baru.</p>
      {msg && <div style={{ padding: "8px 12px", borderRadius: 6, marginBottom: 10, background: msg.type === "ok" ? "#E1F5EE" : "#FCEBEB", color: msg.type === "ok" ? "#085041" : "#A32D2D", fontSize: 12, fontFamily: "DM Sans,sans-serif" }}>{msg.text}</div>}
      <Lbl>Kode Akses Lama</Lbl><Inp v={oldKey} set={setOldKey} ph="Masukkan kode lama" pw />
      <Lbl mt>Kode Akses Baru</Lbl><Inp v={newKey} set={setNewKey} ph="Minimal 4 karakter" pw />
      <Lbl mt>Konfirmasi Kode Baru</Lbl><Inp v={confirmKey} set={setConfirmKey} ph="Ulangi kode baru" pw />
      <Btn onClick={changeKey} mt>Ubah Kode Akses</Btn>
    </Card>

    <Card>
      <SectionLabel>Informasi sistem</SectionLabel>
      <div style={{ fontSize: 13, fontFamily: "DM Sans,sans-serif", lineHeight: 2 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.t2 }}>Aplikasi</span><span style={{ fontWeight: 500 }}>e-Bimbingan v3</span></div>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.t2 }}>Pengembang</span><span style={{ fontWeight: 500 }}>frd77</span></div>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: C.t2 }}>Penyimpanan</span><span style={{ fontWeight: 500 }}>Browser Storage (lokal)</span></div>
      </div>
    </Card>
  </>;
}

/* ═══════ RESET PASSWORD (DOSEN) ═══════ */
function ResetPasswordBtn({ student, saveStu, addLog, onDone }) {
  const [step, setStep] = useState("idle"); // idle | confirm | done
  if (step === "idle") return <button onClick={() => setStep("confirm")} style={{ ...btn("transparent", C.danger), padding: "5px 10px", fontSize: 11, fontWeight: 500, border: `1px solid ${C.danger}`, borderRadius: 6 }}>Reset Password</button>;
  if (step === "confirm") return (
    <div style={{ padding: 10, borderRadius: 8, background: "#FCEBEB", border: "1px solid #F09595" }}>
      <p style={{ fontSize: 12, fontFamily: "DM Sans,sans-serif", color: "#791F1F", margin: "0 0 8px", lineHeight: 1.5 }}>Reset password <strong>{student.nama}</strong> ke NIM ({student.nim})?</p>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={async () => {
          const s = { ...student, password: student.nim };
          await saveStu(s); await addLog(s.nim, "Password di-reset oleh dosen"); onDone(s); setStep("done");
        }} style={{ ...btn("#c53030", "#fff"), padding: "5px 12px", fontSize: 11, fontWeight: 600, borderRadius: 6 }}>Ya, Reset</button>
        <button onClick={() => setStep("idle")} style={{ ...btn("transparent", C.t3), padding: "5px 12px", fontSize: 11, borderRadius: 6 }}>Batal</button>
      </div>
    </div>
  );
  return <span style={{ fontSize: 11, fontFamily: "DM Sans,sans-serif", color: "#085041", background: "#E1F5EE", padding: "4px 10px", borderRadius: 5, fontWeight: 500 }}>Password di-reset</span>;
}

/* ═══════ SHARED COMPONENTS ═══════ */
function Header({ title, sub: subtitle, onLogout, onBack }) {
  return (
    <header style={{ background: C.bg2, borderBottom: `1px solid ${C.bdr}`, padding: "12px 16px", position: "sticky", top: 0, zIndex: 30 }}>
      <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {onBack && <button onClick={onBack} style={{ ...btn("transparent", C.accent), padding: 0, fontSize: 13, fontWeight: 500 }}>←</button>}
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 600, margin: 0, fontFamily: "DM Sans,sans-serif" }}>{title}</h1>
            {subtitle && <p style={{ fontSize: 12, color: C.t3, margin: 0, fontFamily: "DM Sans,sans-serif" }}>{subtitle}</p>}
          </div>
        </div>
        <button onClick={onLogout} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 12, fontFamily: "DM Sans,sans-serif", fontWeight: 500 }}>Keluar</button>
      </div>
    </header>
  );
}
function Card({ children, mt }) { return <div style={{ background: C.bg2, border: `1px solid ${C.bdr}`, borderRadius: 12, padding: 16, marginBottom: mt ? 0 : 16, marginTop: mt ? 16 : 0 }}>{children}</div>; }
function MetricCard({ label, value, color }) { return <div style={{ background: C.bg2, border: `1px solid ${C.bdr}`, borderRadius: 10, padding: 12, textAlign: "center" }}><p style={{ fontSize: 10, color: C.t3, margin: "0 0 2px", fontFamily: "DM Sans,sans-serif" }}>{label}</p><p style={{ fontSize: 20, fontWeight: 600, margin: 0, color: color || C.text }}>{value}</p></div>; }
function SectionLabel({ children, mt }) { return <p style={{ fontSize: 11, fontFamily: "DM Sans,sans-serif", fontWeight: 600, color: C.t2, margin: mt ? "16px 0 8px" : "0 0 8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{children}</p>; }
function Empty({ children }) { return <p style={{ fontSize: 13, color: C.t3, fontFamily: "DM Sans,sans-serif", fontStyle: "italic" }}>{children}</p>; }
function LogRow({ l, last }) { return <div style={{ padding: "6px 0", borderBottom: last ? "none" : `0.5px solid ${C.bdr}`, display: "flex", justifyContent: "space-between", gap: 12 }}><p style={{ fontSize: 12, margin: 0, fontFamily: "DM Sans,sans-serif" }}>{l.text}</p><span style={timeLabel()}>{fmtDate(l.time)}</span></div>; }
function AuthWrap({ children, onBack, title, sub: subtitle }) { return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}><div style={{ width: "100%", maxWidth: 420 }}>{onBack && <button onClick={onBack} style={{ ...btn("transparent", C.accent), padding: 0, fontSize: 13, fontWeight: 500, marginBottom: 20 }}>← Kembali</button>}<h2 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 4px" }}>{title}</h2><p style={{ fontSize: 14, color: C.t2, margin: "0 0 20px", fontFamily: "DM Sans,sans-serif" }}>{subtitle}</p>{children}</div></div>; }
function Err({ children }) { return <div style={{ padding: "10px 12px", borderRadius: 8, background: "#FCEBEB", color: "#A32D2D", fontSize: 13, fontFamily: "DM Sans,sans-serif", marginBottom: 12 }}>{children}</div>; }
function Lbl({ children, mt }) { return <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 4, marginTop: mt ? 12 : 0, fontFamily: "DM Sans,sans-serif" }}>{children}</label>; }
function Inp({ v, set, ph, pw, onKey, flex }) { return <input value={v} onChange={e => set(e.target.value)} placeholder={ph} type={pw ? "password" : "text"} onKeyDown={onKey ? e => e.key === "Enter" && onKey() : undefined} style={{ ...iStyle(), flex: flex ? 1 : undefined }} />; }
function Btn({ children, onClick, disabled, full, mt }) { return <button onClick={onClick} disabled={disabled} style={{ ...btn(C.accent, "#fff"), padding: "10px 18px", fontSize: 13, fontWeight: 600, width: full ? "100%" : undefined, marginTop: mt ? 12 : 0, opacity: disabled ? 0.4 : 1 }}>{children}</button>; }

/* ═══════ STYLE HELPERS ═══════ */
function btn(bg, color) { return { background: bg, color, border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "DM Sans,sans-serif", transition: "opacity 0.15s" }; }
function iStyle() { return { width: "100%", padding: "10px 12px", background: "#fff", border: `1px solid ${C.bdr}`, borderRadius: 8, fontSize: 14, color: C.text, outline: "none", boxSizing: "border-box", fontFamily: "DM Sans,sans-serif" }; }
function badge(bg, color) { return { fontSize: 11, fontFamily: "DM Sans,sans-serif", padding: "2px 8px", borderRadius: 4, background: bg, color, fontWeight: 600 }; }
function sub() { return { fontSize: 13, color: C.t2, margin: 0, fontFamily: "DM Sans,sans-serif" }; }
function h3() { return { margin: "0 0 6px", fontSize: 16, fontWeight: 600 }; }
function babBtn(active, dot) { return { flexShrink: 0, padding: "8px 12px", borderRadius: 8, border: active ? `1.5px solid ${C.accent}` : `1px solid ${C.bdr}`, background: active ? C.al : C.bg2, cursor: "pointer" }; }
function babLabel() { return { fontSize: 12, fontFamily: "DM Sans,sans-serif", fontWeight: 500 }; }
function tabStyle(active) { return { padding: "10px 16px", background: "none", border: "none", borderBottom: active ? `2px solid ${C.accent}` : "2px solid transparent", cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 400, color: active ? C.accent : C.t2, fontFamily: "DM Sans,sans-serif" }; }
function filterBtn(active) { return { padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontFamily: "DM Sans,sans-serif", fontWeight: active ? 600 : 400, background: active ? C.al : "transparent", color: active ? C.accent : C.t3 }; }
function linkStyle() { return { fontSize: 13, color: "#185FA5", wordBreak: "break-all", fontFamily: "DM Sans,sans-serif" }; }
function timeLabel() { return { fontSize: 10, fontFamily: "DM Sans,sans-serif", color: C.t3 }; }
function fmtDate(iso) { return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
