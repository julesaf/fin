import { useState, useEffect, useMemo, useRef, createContext, useContext } from "react";
import { ComposedChart, Area, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RT, ResponsiveContainer, Legend, ReferenceArea, ReferenceLine } from "recharts";
import { Plus, Download, Upload, X, Trash2, ArrowLeft, TrendingUp, TrendingDown, Sun, Moon, ArrowUpRight, ArrowDownRight, LayoutDashboard, Layers, Pencil, Check, LogOut, ShieldCheck, CloudOff, AlertCircle, PieChart as PieChartIcon } from "lucide-react";

const ACC = '#E8364A';
const VALC = '#38BDF8';
const GRN = '#10B981';
const LOSSC = '#FB7185';
const AMB = '#F59E0B';
const PCOLS = ['#E8364A', '#38BDF8', '#10B981', '#F59E0B', '#8B5CF6', '#F97316', '#06B6D4', '#EC4899'];

function mkDark() {
    return { dark: true, bg: '#0A0A0E', s1: '#15151C', s2: '#1C1C26', s3: '#252530', brd: 'rgba(255,255,255,0.11)', brd2: `${ACC}40`, t1: '#EEEEFF', t2: '#8080A8', t3: '#404060', inp: '#10101A' };
}
function mkLight() {
    return { dark: false, bg: '#F0EFF8', s1: '#FFFFFF', s2: '#F5F4FC', s3: '#EBEAF5', brd: 'rgba(0,0,0,0.07)', brd2: `${ACC}30`, t1: '#0A0A14', t2: '#6060A0', t3: '#B0B0CC', inp: '#FFFFFF' };
}

const TX_IN = [{ v: 'apport', l: 'Apport', c: '#818CF8' }, { v: 'retrait', l: 'Retrait', c: AMB }];
const TX_ALL = [...TX_IN, { v: 'dividende', l: 'Dividende', c: '#22D3EE' }, { v: 'frais', l: 'Frais', c: LOSSC }, { v: 'achat', l: 'Achat', c: '#60A5FA' }, { v: 'vente', l: 'Vente', c: GRN }, { v: 'transfert', l: 'Transfert', c: '#A78BFA' }, { v: 'correction', l: 'Correction', c: '#94A3B8' }];
const txL = v => TX_ALL.find(t => t.v === v)?.l || v;
const txC = v => TX_ALL.find(t => t.v === v)?.c || '#64748B';

const TC = createContext(mkDark());
const useT = () => useContext(TC);
const uid = () => '_' + Math.random().toString(36).slice(2, 9);
const TODAY = new Date().toISOString().split('T')[0];
const CY = new Date().getFullYear();

const fEUR = v => v == null ? '–' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
const fPctS = v => v == null ? '–' : (v >= 0 ? '+' : '') + (v * 100).toFixed(2) + ' %';
const fEURS = v => v == null ? '–' : (v > 0 ? '+' : '') + fEUR(v);
const fDt = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-FR') : '–';
const gc = v => v == null ? undefined : v >= 0 ? GRN : LOSSC;

function useBreakpoint() {
    const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
    useEffect(() => { const fn = () => setW(window.innerWidth); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn); }, []);
    return { isMobile: w < 640, isTablet: w < 960, w };
}

const D_P = [{ id: 'p1', nom: 'PEA', couleur: ACC, createdAt: '2023-01-01' }, { id: 'p2', nom: 'Crypto', couleur: AMB, createdAt: '2023-06-01' }, { id: 'p3', nom: 'SCPI', couleur: GRN, createdAt: '2023-03-01' }];
const D_T = [
    { id: 't1', type: 'apport', montant: 5000, timestamp: '2023-01-15', pocheId: 'p1' }, { id: 't2', type: 'apport', montant: 1000, timestamp: '2023-07-01', pocheId: 'p1' },
    { id: 't3', type: 'dividende', montant: 180, timestamp: '2023-09-15', pocheId: 'p1' }, { id: 't4', type: 'apport', montant: 1500, timestamp: '2024-01-10', pocheId: 'p1' },
    { id: 't5', type: 'frais', montant: 30, timestamp: '2024-12-31', pocheId: 'p1' }, { id: 't6', type: 'dividende', montant: 200, timestamp: '2024-09-15', pocheId: 'p1' },
    { id: 't7', type: 'apport', montant: 2000, timestamp: '2023-06-01', pocheId: 'p2' }, { id: 't8', type: 'apport', montant: 500, timestamp: '2024-02-01', pocheId: 'p2' },
    { id: 't9', type: 'retrait', montant: 800, timestamp: '2024-10-15', pocheId: 'p2' }, { id: 't10', type: 'apport', montant: 20000, timestamp: '2023-03-01', pocheId: 'p3' },
    { id: 't11', type: 'dividende', montant: 450, timestamp: '2023-09-30', pocheId: 'p3' }, { id: 't12', type: 'dividende', montant: 455, timestamp: '2024-01-15', pocheId: 'p3' },
    { id: 't13', type: 'dividende', montant: 460, timestamp: '2024-06-30', pocheId: 'p3' }, { id: 't14', type: 'dividende', montant: 465, timestamp: '2024-12-30', pocheId: 'p3' },
];
const D_V = [
    { id: 'v1', pocheId: 'p1', valeur: 5100, date: '2023-03-01' }, { id: 'v2', pocheId: 'p1', valeur: 5800, date: '2023-06-01' }, { id: 'v3', pocheId: 'p1', valeur: 6400, date: '2023-09-01' }, { id: 'v4', pocheId: 'p1', valeur: 7100, date: '2023-12-31' },
    { id: 'v5', pocheId: 'p1', valeur: 8200, date: '2024-04-01' }, { id: 'v6', pocheId: 'p1', valeur: 8900, date: '2024-08-01' }, { id: 'v7', pocheId: 'p1', valeur: 9400, date: '2024-12-31' }, { id: 'v8', pocheId: 'p1', valeur: 9800, date: '2025-04-01' },
    { id: 'v9', pocheId: 'p2', valeur: 2100, date: '2023-08-01' }, { id: 'v10', pocheId: 'p2', valeur: 3200, date: '2023-12-31' }, { id: 'v11', pocheId: 'p2', valeur: 4100, date: '2024-04-01' }, { id: 'v12', pocheId: 'p2', valeur: 2800, date: '2024-08-01' },
    { id: 'v13', pocheId: 'p2', valeur: 3500, date: '2024-12-31' }, { id: 'v14', pocheId: 'p2', valeur: 3800, date: '2025-04-01' },
    { id: 'v15', pocheId: 'p3', valeur: 20300, date: '2023-06-01' }, { id: 'v16', pocheId: 'p3', valeur: 20700, date: '2023-12-31' }, { id: 'v17', pocheId: 'p3', valeur: 21100, date: '2024-06-01' }, { id: 'v18', pocheId: 'p3', valeur: 21600, date: '2024-12-31' }, { id: 'v19', pocheId: 'p3', valeur: 22000, date: '2025-04-01' },
];

function calcXIRR(cfs) {
    if (!cfs || cfs.length < 2) return null;
    const s = [...cfs].sort((a, b) => a.date.localeCompare(b.date));
    const t0 = new Date(s[0].date).getTime(), yr = d => (new Date(d).getTime() - t0) / 31557600000;
    if (!s.some(c => c.a > 0) || !s.some(c => c.a < 0)) return null;
    const npv = rate => {
        if (rate <= -1) return null;
        let f = 0;
        for (const c of s) { const pv = Math.pow(1 + rate, yr(c.date)); if (!isFinite(pv) || pv === 0) return null; f += c.a / pv; }
        return f;
    };
    let r = 0.1;
    for (let i = 0; i < 600; i++) {
        let f = 0, df = 0;
        for (const c of s) { const t = yr(c.date), b = 1 + r; if (b <= 0) return null; const pv = Math.pow(b, t); if (!isFinite(pv)) continue; f += c.a / pv; df -= t * c.a / (pv * b); }
        if (Math.abs(f) < 1e-7) return r > -1 ? r : null;
        if (!df || !isFinite(df)) break;
        const r2 = r - f / df; if (!isFinite(r2)) break;
        if (Math.abs(r2 - r) < 1e-9) { const f2 = npv(r2); if (f2 != null && Math.abs(f2) < 1e-7) return r2 > -1 ? r2 : null; break; }
        r = Math.max(-0.9999, r2);
    }
    let lo = -0.9999, hi = 1, flo = npv(lo), fhi = npv(hi);
    for (let i = 0; i < 60 && flo != null && fhi != null && flo * fhi > 0; i++) { hi *= 2; fhi = npv(hi); }
    if (flo == null || fhi == null || flo * fhi > 0) return null;
    for (let i = 0; i < 120; i++) {
        const mid = (lo + hi) / 2, fmid = npv(mid); if (fmid == null) return null;
        if (Math.abs(fmid) < 1e-7) return mid;
        if (flo * fmid <= 0) { hi = mid; fhi = fmid; } else { lo = mid; flo = fmid; }
    }
    return (lo + hi) / 2;
}
function dietzCalc(bmv, emv, flows, sd, ed, resultAdj = 0) {
    const cd = (new Date(ed) - new Date(sd)) / 86400000; if (cd <= 0) return null;
    let net = 0, wc = 0;
    for (const f of flows) { const di = (new Date(f.date) - new Date(sd)) / 86400000, w = Math.max(0, Math.min(1, (cd - di) / cd)); net += f.a; wc += f.a * w; }
    const dn = bmv + wc; return dn > 0.01 ? (emv + resultAdj - bmv - net) / dn : null;
}
function getPocheMetrics(pid, txs, vals) {
    const pt = txs.filter(t => t.pocheId === pid), pv = vals.filter(v => v.pocheId === pid).sort((a, b) => a.date.localeCompare(b.date));
    const sm = type => pt.filter(t => t.type === type).reduce((s, t) => s + t.montant, 0);
    const apports = sm('apport'), retraits = sm('retrait'), dividendes = sm('dividende'), frais = sm('frais');
    const capital = apports - retraits, valActu = pv.length ? pv[pv.length - 1].valeur : 0;
    const xCFs = pt.filter(t => ['apport', 'retrait', 'dividende', 'frais'].includes(t.type)).map(t => ({ date: t.timestamp, a: (t.type === 'apport' || t.type === 'frais') ? -t.montant : t.montant }));
    if (valActu > 0 && xCFs.length) xCFs.push({ date: pv[pv.length - 1].date, a: valActu });
    const xirr = xCFs.length >= 2 ? calcXIRR(xCFs) : null;
    let dietz = null;
    if (pv.length >= 2) { const sd = pv[0].date, ed = pv[pv.length - 1].date; const dCFs = pt.filter(t => ['apport', 'retrait'].includes(t.type) && t.timestamp > sd && t.timestamp <= ed).map(t => ({ date: t.timestamp, a: t.type === 'apport' ? t.montant : -t.montant })); const resAdj = pt.filter(t => ['dividende', 'frais'].includes(t.type) && t.timestamp > sd && t.timestamp <= ed).reduce((s, t) => s + (t.type === 'dividende' ? t.montant : -t.montant), 0); dietz = dietzCalc(pv[0].valeur, valActu, dCFs, sd, ed, resAdj); }
    const gainNonRealise = valActu - capital, gainRealise = dividendes - frais;
    return { apports, retraits, dividendes, frais, capital, valActu, gainNonRealise, gainRealise, gainLatent: gainNonRealise + gainRealise, xirr, dietz };
}
function getAnnualRows(pid, txs, vals) {
    const isAll = pid === 'all', pids = isAll ? [...new Set([...vals.map(v => v.pocheId), ...txs.map(t => t.pocheId)])] : [pid];
    const pt = txs.filter(t => pids.includes(t.pocheId));
    const getV = date => pids.reduce((s, p) => { const l = vals.filter(v => v.pocheId === p && v.date <= date).sort((a, b) => b.date.localeCompare(a.date)); return s + (l.length ? l[0].valeur : 0); }, 0);
    const getLastValDate = y => vals.filter(v => pids.includes(v.pocheId) && v.date.slice(0, 4) === String(y)).map(v => v.date).sort().pop();
    const years = [...new Set([...pt.map(t => +t.timestamp.slice(0, 4)), ...vals.filter(v => pids.includes(v.pocheId)).map(v => +v.date.slice(0, 4))])].sort((a, b) => a - b);
    if (!years.length) return [];
    return years.reduce((rows, y) => {
        const sd = `${y}-01-01`, ed = getLastValDate(y) || `${y}-12-31`;
        const bmv = getV(`${y - 1}-12-31`), emv = getV(ed); if (bmv === 0 && emv === 0) return rows;
        const yt = pt.filter(t => t.timestamp >= sd && t.timestamp <= ed);
        const apports = yt.filter(t => t.type === 'apport').reduce((s, t) => s + t.montant, 0), retraits = yt.filter(t => t.type === 'retrait').reduce((s, t) => s + t.montant, 0);
        const resAdj = yt.filter(t => ['dividende', 'frais'].includes(t.type)).reduce((s, t) => s + (t.type === 'dividende' ? t.montant : -t.montant), 0);
        const netCF = apports - retraits, perfE = emv + resAdj - bmv - netCF;
        const cumE = rows.reduce((s, r) => s + r.perfE, 0) + perfE;
        const capitalEnd = capitalAtDate(pids, txs, ed);
        const perfPct = capitalEnd > 0.01 ? perfE / capitalEnd : null;
        const cumPct = capitalEnd > 0.01 ? cumE / capitalEnd : null;
        const dCFs = yt.filter(t => ['apport', 'retrait'].includes(t.type)).map(t => ({ date: t.timestamp, a: t.type === 'apport' ? t.montant : -t.montant }));
        const d = dietzCalc(bmv, emv, dCFs, sd, ed, resAdj);
        return [...rows, { y, bmv, emv, apports, retraits, netCF, perfE, perfPct, dietz: d, cumE, cumPct, capitalEnd }];
    }, []);
}
function capitalAtDate(pids, txs, date) {
    const pt = txs.filter(t => pids.includes(t.pocheId) && t.timestamp <= date);
    const sm = type => pt.filter(t => t.type === type).reduce((s, t) => s + t.montant, 0);
    return sm('apport') - sm('retrait');
}
function perfAtDate(pids, txs, date, value) {
    const pt = txs.filter(t => pids.includes(t.pocheId) && t.timestamp <= date);
    const sm = type => pt.filter(t => t.type === type).reduce((s, t) => s + t.montant, 0);
    return value - sm('apport') + sm('retrait') + sm('dividende') - sm('frais');
}
function getDataWarnings(ps, txs, vals) {
    const today = new Date(TODAY);
    return ps.flatMap(p => {
        const pt = txs.filter(t => t.pocheId === p.id).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        const pv = vals.filter(v => v.pocheId === p.id).sort((a, b) => a.date.localeCompare(b.date));
        const capital = capitalAtDate([p.id], txs, TODAY);
        const warnings = [];
        if (!pv.length) warnings.push({ level: 'warn', text: `${p.nom} : aucune valorisation saisie.` });
        if (capital < -0.01) warnings.push({ level: 'error', text: `${p.nom} : capital net négatif, vérifiez les retraits.` });
        if (pt.length && pv.length && pv[0].date < pt[0].timestamp) warnings.push({ level: 'warn', text: `${p.nom} : valorisation antérieure au premier flux.` });
        if (pv.length) {
            const age = (today - new Date(pv[pv.length - 1].date)) / 86400000;
            if (age > 180) warnings.push({ level: 'info', text: `${p.nom} : dernière valorisation il y a ${Math.round(age)} jours.` });
        }
        for (let i = 1; i < pv.length; i++) {
            const prev = pv[i - 1], cur = pv[i];
            const perf = perfAtDate([p.id], txs, cur.date, cur.valeur) - perfAtDate([p.id], txs, prev.date, prev.valeur);
            const base = Math.max(Math.abs(prev.valeur), 1);
            const hasNearbyFlow = pt.some(t => Math.abs(new Date(t.timestamp) - new Date(cur.date)) / 86400000 <= 10);
            if (Math.abs(perf / base) > 0.4 && !hasNearbyFlow) warnings.push({ level: 'warn', text: `${p.nom} : forte variation hors flux autour du ${fDt(cur.date)}.` });
        }
        return warnings;
    }).slice(0, 8);
}

// ── Info modal ──
function InfoModal({ onClose, title, lines }) {
    const T = useT();
    const B = { fontFamily: 'system-ui,-apple-system,sans-serif', textTransform: 'none', letterSpacing: 'normal', fontStyle: 'normal', textAlign: 'left', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: 1.5 };
    const tx1 = T.dark ? '#EAEAF8' : '#111';
    const tx2 = T.dark ? '#8080AA' : '#6666AA';
    const tx3 = T.dark ? '#5050808' : '#9898C0';
    const br = T.dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
    return (
        <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ ...B, position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <div style={{ ...B, background: T.dark ? '#1C1C27' : '#fff', border: `1px solid ${br}`, borderRadius: 16, width: 310, maxWidth: 'calc(100vw - 3rem)', maxHeight: 'calc(100vh - 3rem)', overflowY: 'auto', boxShadow: T.dark ? '0 20px 60px rgba(0,0,0,0.7)' : '0 20px 60px rgba(0,0,0,0.15)', boxSizing: 'border-box' }}>

                {/* Top accent */}
                <div style={{ height: 2, background: `linear-gradient(90deg,${ACC},transparent)`, borderRadius: '16px 16px 0 0' }} />

                {/* Title */}
                <div style={{ ...B, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '1rem 1rem .85rem', borderBottom: `1px solid ${br}` }}>
                    <span style={{ ...B, fontSize: '.83rem', fontWeight: 700, color: tx1 }}>{title}</span>
                    <button onClick={onClose} style={{ ...B, width: 26, height: 26, borderRadius: 7, background: T.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1px solid ${br}`, color: tx2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>
                        <X size={12} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ ...B, padding: '.9rem 1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '.7rem' }}>
                    {lines.map((line, i) => {
                        if (line.type === 'text') return (
                            <p key={i} style={{ ...B, margin: 0, fontSize: '.79rem', color: tx2, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: line.html }} />
                        );
                        if (line.type === 'heading') return (
                            <div key={i} style={{ ...B, display: 'flex', alignItems: 'center', gap: 6, marginTop: '.2rem' }}>
                                <div style={{ width: 3, height: 12, borderRadius: 2, background: ACC, flexShrink: 0 }} />
                                <span style={{ ...B, fontSize: '.69rem', fontWeight: 700, color: ACC, textTransform: 'uppercase', letterSpacing: '.07em' }}>{line.text}</span>
                            </div>
                        );
                        if (line.type === 'callout') return (
                            <div key={i} style={{ ...B, background: T.dark ? `${line.color || ACC}12` : `${line.color || ACC}0C`, border: `1px solid ${line.color || ACC}30`, borderRadius: 8, padding: '.55rem .75rem' }}>
                                <p style={{ ...B, margin: 0, fontSize: '.77rem', color: line.color || ACC, fontWeight: 500, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: line.html }} />
                            </div>
                        );
                        // table
                        return (
                            <div key={i} style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${br}` }}>
                                {line.rows.map((r, j) => {
                                    const isLast = j === line.rows.length - 1;
                                    return (
                                        <div key={j} style={{ ...B, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: isLast ? '.55rem .8rem' : '.42rem .8rem', background: isLast ? (T.dark ? `${r.color || GRN}14` : `${r.color || GRN}09`) : (T.dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'), borderTop: j > 0 ? `1px solid ${br}` : 'none' }}>
                                            <span style={{ ...B, fontSize: '.74rem', color: isLast ? (r.color || GRN) : tx2, fontWeight: isLast ? 600 : 400, flexShrink: 0 }}>{r.label}</span>
                                            <span style={{ ...B, fontSize: isLast ? '.8rem' : '.74rem', fontWeight: 700, color: r.color || (isLast ? GRN : tx1), fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{r.value}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function InfoBtn({ title, lines }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button onClick={e => { e.stopPropagation(); setOpen(true); }} style={{ cursor: 'pointer', width: 24, height: 24, borderRadius: '50%', background: `${ACC}18`, border: `1px solid ${ACC}50`, color: ACC, fontSize: '.7rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, flexShrink: 0, marginLeft: 4, verticalAlign: 'middle', outline: 'none', padding: 0 }}>?</button>
            {open && <InfoModal title={title} lines={lines} onClose={() => setOpen(false)} />}
        </>
    );
}

const XIRR_INFO = {
    title: "XIRR — Rendement annualisé",
    lines: [
        { type: 'text', html: "Le XIRR est votre rendement annuel <strong>réel</strong>, calculé en tenant compte de la date exacte de chaque mouvement d'argent." },
        { type: 'heading', text: "Pourquoi ça diffère du gain simple ?" },
        { type: 'text', html: "Le gain brut ne dit pas <em>combien de temps</em> votre argent a travaillé. 15 % en 18 mois, ce n'est pas la même chose que 15 % en 12 mois. Le XIRR ramène tout à une base annuelle comparable." },
        { type: 'heading', text: "Exemple chiffré" },
        {
            type: 'table', rows: [
                { label: "Apport — janv. 2023", value: "10 000 €" },
                { label: "Valeur — juil. 2024 (18 m)", value: "11 500 €" },
                { label: "Gain brut total", value: "+15 %" },
                { label: "Gain simple annualisé*", value: "+10 % / an" },
                { label: "→ XIRR (avec composition)", value: "≈ +9.8 % / an", color: GRN },
            ]
        },
        { type: 'callout', color: '#8080AA', html: "*&thinsp;Le XIRR est légèrement inférieur au simple ÷ 1.5 car il tient compte de l'effet de <strong>composition</strong> : les intérêts génèrent eux-mêmes des intérêts." },
    ]
};
const DIETZ_INFO = {
    title: "Modified Dietz — Rendement de période",
    lines: [
        { type: 'text', html: "Mesure combien votre portefeuille a réellement progressé sur la période, <strong>sans être faussé</strong> par vos apports ou retraits." },
        { type: 'heading', text: "Le problème qu'il résout" },
        { type: 'text', html: "Si vous déposez 5 000 € le 1er janvier et 5 000 € supplémentaires le 31 décembre, votre valeur finale de 10 500 € n'est pas un gain de +5 % — le second apport n'a quasiment pas eu le temps de travailler." },
        { type: 'heading', text: "Exemple" },
        {
            type: 'table', rows: [
                { label: "Valeur de départ", value: "5 000 €" },
                { label: "Apport à mi-période", value: "+2 000 €" },
                { label: "Valeur finale", value: "7 800 €" },
                { label: "Gain net", value: "+800 €" },
                { label: "→ Dietz (gain réel)", value: "≈ +13.3 %", color: GRN },
            ]
        },
        { type: 'callout', color: '#8080AA', html: "La différence : l'apport de mi-période est pondéré à <strong>50 %</strong> car il n'a été investi que la moitié du temps. Le Dietz reflète ce que <em>votre capital préexistant</em> a vraiment rapporté." },
    ]
};
const PERF_ANN_INFO = {
    title: "Performance annuelle",
    lines: [
        { type: 'text', html: "Combien la poche a gagné ou perdu sur l'année, <strong>une fois les apports et retraits retirés du calcul</strong>." },
        { type: 'heading', text: "Pourquoi exclure les apports ?" },
        { type: 'text', html: "Si vous versez 10 000 € en janvier et 10 000 € en décembre, votre portefeuille a progressé de 20 000 € — mais ce n'est pas de la performance, c'est de l'épargne. On ne retient que ce que le marché a produit." },
        { type: 'heading', text: "Exemple" },
        {
            type: 'table', rows: [
                { label: "Valeur au 1er janv.", value: "10 000 €" },
                { label: "Apport en cours d'année", value: "+500 €" },
                { label: "Valeur au 31 déc.", value: "11 000 €" },
                { label: "Gain généré", value: "+500 €" },
                { label: "→ Performance", value: "≈ +4.9 %", color: GRN },
            ]
        },
        { type: 'callout', color: '#8080AA', html: "Les apports et retraits sont retirés du résultat. Le pourcentage affiché est volontairement simple : <strong>performance € ÷ capital net investi</strong>, pour rester lisible dans une app de suivi personnel." },
    ]
};
const CUMUL_INFO = {
    title: "Rendement cumulé",
    lines: [
        { type: 'text', html: "La performance <strong>totale depuis le début</strong>, rapportée au capital net encore investi dans la poche." },
        { type: 'heading', text: "Pourquoi ce calcul ?" },
        { type: 'text', html: "Avec des retraits importants, multiplier les rendements annuels peut donner un résultat très technique et peu lisible. Ici, le cumulé répond simplement à : combien ai-je gagné ou perdu par rapport à mon capital net ?" },
        { type: 'heading', text: "Exemple" },
        {
            type: 'table', rows: [
                { label: "Capital net investi", value: "16 000 €" },
                { label: "Performance cumulée", value: "+2 000 €" },
                { label: "→ Cumulé %", value: "+12.5 %", color: GRN },
            ]
        },
        { type: 'callout', color: '#8080AA', html: "Calcul : <strong>2 000 ÷ 16 000 = 12.5 %</strong>. Les retraits ne sont pas comptés comme une perte." },
    ]
};

// ── Atoms ──
function Dot({ c, sz = 8 }) { return <span style={{ width: sz, height: sz, borderRadius: '50%', background: c, display: 'inline-block', flexShrink: 0, boxShadow: `0 0 8px ${c}80` }} />; }
function Tag({ label, color }) { return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px 2px 5px', borderRadius: 5, fontSize: '.66rem', fontWeight: 600, background: `${color}15`, color, border: `1px solid ${color}25` }}><span style={{ width: 4, height: 4, borderRadius: '50%', background: color, flexShrink: 0 }} />{label}</span>; }
function Badge({ ch, c = ACC }) { return <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: '.57rem', fontWeight: 700, background: `${c}18`, color: c, letterSpacing: '.06em', textTransform: 'uppercase', border: `1px solid ${c}22` }}>{ch}</span>; }
function ChartGuide({ color, mode = 'value' }) {
    const T = useT();
    const item = (label, c, dashed) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: T.t2, fontSize: '.62rem' }}><span style={{ width: 18, borderTop: `2px ${dashed ? 'dashed' : 'solid'} ${c}`, display: 'inline-block' }} />{label}</span>;
    const capColor = T.dark ? '#F8FAFC' : '#111827';
    if (mode !== 'value') return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, margin: '0 0 .35rem', alignItems: 'center', color: T.t2, fontSize: '.62rem' }}>Courbe = Performance</div>;
    return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, margin: '0 0 .35rem', alignItems: 'center' }}>{item('Valeur réelle', color, false)}{item('Capital investi', capColor, true)}<span style={{ color: T.t3, fontSize: '.61rem' }}>Perf. = valeur - capital + revenus nets</span></div>;
}

function yearBands(data, labelKey) {
    const bands = [];
    data.forEach((d, i) => {
        const label = String(d[labelKey] || '');
        const year = label.slice(0, 4);
        if (!year) return;
        const last = bands[bands.length - 1];
        if (last?.year === year) last.end = i;
        else bands.push({ year, start: i, end: i, startLabel: label, endLabel: label });
        bands[bands.length - 1].endLabel = label;
    });
    return bands;
}

function visibleYearLabels(bands, width) {
    const maxLabels = width < 520 ? 3 : width < 760 ? 4 : width < 1100 ? 5 : 7;
    if (bands.length <= maxLabels) return new Set(bands.map((_, i) => i));
    const step = Math.ceil((bands.length - 1) / (maxLabels - 1));
    return new Set(bands.map((_, i) => i).filter(i => i === 0 || i === bands.length - 1 || i % step === 0));
}

function RechartsYearBands({ data, labelKey }) {
    const T = useT();
    const { w } = useBreakpoint();
    const bands = yearBands(data, labelKey);
    const labels = visibleYearLabels(bands, w);
    const fill = T.dark ? '#FFFFFF' : '#111827';
    const yearLabel = ({ viewBox, value }) => {
        const x = viewBox?.x || 0, y = Math.max((viewBox?.y || 0) - 18, 0);
        return <g transform={`translate(${x + 6},${y})`}>
            <rect x="-4" y="-1" width="34" height="15" rx="7" fill={T.s1} stroke={T.brd} />
            <text x="13" y="10" textAnchor="middle" fill={T.t2} fontSize="9" fontWeight="800">{value}</text>
        </g>;
    };
    return <>{bands.map((b, i) => (
        <g key={`${b.year}-${b.start}`}>
            {i % 2 === 0 && <ReferenceArea x1={b.startLabel} x2={b.endLabel} fill={fill} fillOpacity={T.dark ? 0.035 : 0.045} strokeOpacity={0} ifOverflow="extendDomain" />}
            <ReferenceLine x={b.startLabel} stroke={T.brd} strokeDasharray="3 5" label={labels.has(i) ? { value: b.year, content: yearLabel } : undefined} />
        </g>
    ))}</>;
}

function Sparkline({ pocheId, vals, txs = [], width = 100, height = 44 }) {
    const pv = vals.filter(v => v.pocheId === pocheId).sort((a, b) => a.date.localeCompare(b.date));
    if (pv.length < 2) return <div style={{ width, height }} />;
    const prices = pv.map(v => perfAtDate([pocheId], txs, v.date, v.valeur)), mn = Math.min(...prices), mx = Math.max(...prices), range = mx - mn || 1;
    const pts = prices.map((p, i) => [(i / (prices.length - 1)) * width, height - 2 - ((p - mn) / range) * (height - 4)]);
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const area = line + ` L${width},${height} L0,${height} Z`;
    const col = prices[prices.length - 1] >= prices[0] ? GRN : LOSSC;
    const gid = `sp${pocheId}`;
    return (
        <svg width={width} height={height} style={{ overflow: 'visible', display: 'block' }}>
            <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={col} stopOpacity={0.25} /><stop offset="100%" stopColor={col} stopOpacity={0} /></linearGradient></defs>
            <path d={area} fill={`url(#${gid})`} /><path d={line} fill="none" stroke={col} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function PerfLineChart({ data, dataKey, labelKey, height, pct }) {
    const T = useT();
    const wrapRef = useRef(null);
    const [measuredWidth, setMeasuredWidth] = useState(440);
    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const update = () => setMeasuredWidth(Math.max(260, Math.round(el.getBoundingClientRect().width || 440)));
        update();
        const raf = requestAnimationFrame(update);
        window.addEventListener('resize', update);
        let ro;
        if (typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(update);
            ro.observe(el);
        }
        return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', update); ro?.disconnect(); };
    }, []);
    const width = measuredWidth, left = 8, right = 4, top = 26, bottom = 25;
    const timeOf = label => new Date(`${String(label).length === 7 ? `${label}-01` : label}T00:00:00`).getTime();
    const rows = data.map(d => ({ label: d[labelKey], time: timeOf(d[labelKey]), value: Number(d[dataKey]) })).filter(d => Number.isFinite(d.value) && Number.isFinite(d.time)).sort((a, b) => a.time - b.time);
    if (rows.length < 2) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.t2, fontSize: '.74rem' }}>Données insuffisantes pour cette courbe.</div>;
    let min = Math.min(0, ...rows.map(d => d.value)), max = Math.max(0, ...rows.map(d => d.value));
    if (min === max) { const pad = Math.max(Math.abs(max), 1) * .1; min -= pad; max += pad; }
    const innerW = width - left - right, innerH = height - top - bottom;
    const minTime = rows[0].time, maxTime = rows[rows.length - 1].time, timeSpan = Math.max(maxTime - minTime, 1);
    const x = time => left + ((time - minTime) / timeSpan) * innerW;
    const y = v => top + ((max - v) / (max - min)) * innerH;
    const fmt = v => pct ? `${(v * 100).toFixed(Math.abs(v) < .1 ? 1 : 0)}%` : Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${Math.round(v)}`;
    const curve = (x1, y1, x2, y2) => { const mx = (x1 + x2) / 2; return `M${x1.toFixed(1)},${y1.toFixed(1)} C${mx.toFixed(1)},${y1.toFixed(1)} ${mx.toFixed(1)},${y2.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`; };
    const zeroY = y(0);
    const area = rows.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(d.time).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ') + ` L${x(rows[rows.length - 1].time).toFixed(1)},${zeroY.toFixed(1)} L${x(rows[0].time).toFixed(1)},${zeroY.toFixed(1)} Z`;
    const segments = [];
    for (let i = 1; i < rows.length; i++) {
        const a = rows[i - 1], b = rows[i];
        const ax = x(a.time), ay = y(a.value), bx = x(b.time), by = y(b.value);
        if ((a.value < 0 && b.value > 0) || (a.value > 0 && b.value < 0)) {
            const ratio = Math.abs(a.value) / (Math.abs(a.value) + Math.abs(b.value));
            const zx = ax + (bx - ax) * ratio, zy = y(0);
            segments.push({ x1: ax, y1: ay, x2: zx, y2: zy, color: a.value >= 0 ? GRN : LOSSC });
            segments.push({ x1: zx, y1: zy, x2: bx, y2: by, color: b.value >= 0 ? GRN : LOSSC });
        } else {
            segments.push({ x1: ax, y1: ay, x2: bx, y2: by, color: b.value >= 0 ? GRN : LOSSC });
        }
    }
    const ticks = [max, (max + min) / 2, min];
    const startYear = new Date(minTime).getFullYear(), endYear = new Date(maxTime).getFullYear();
    const bands = Array.from({ length: endYear - startYear + 1 }, (_, i) => {
        const year = startYear + i;
        return { year: String(year), startTime: Math.max(minTime, new Date(`${year}-01-01T00:00:00`).getTime()), endTime: Math.min(maxTime, new Date(`${year + 1}-01-01T00:00:00`).getTime()) };
    });
    const labels = visibleYearLabels(bands, width);
    const bandFill = T.dark ? '#FFFFFF' : '#111827';
    const dateTicks = rows
        .filter((_, i) => rows.length <= 6 || i === 0 || i === rows.length - 1 || i % Math.ceil((rows.length - 1) / 4) === 0)
        .filter((d, i, arr) => i === 0 || d.time !== arr[i - 1].time);
    const gradId = `perfFill${dataKey}${height}${pct ? 'Pct' : 'Eur'}`;
    return (
        <div ref={wrapRef} style={{ width: '100%' }}>
            <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" style={{ display: 'block', overflow: 'visible' }}>
                <defs><linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GRN} stopOpacity="0.15" /><stop offset="52%" stopColor={GRN} stopOpacity="0.03" /><stop offset="52%" stopColor={LOSSC} stopOpacity="0.04" /><stop offset="100%" stopColor={LOSSC} stopOpacity="0.14" /></linearGradient></defs>
                {bands.map((b, i) => {
                    const x1 = x(b.startTime), x2 = x(b.endTime);
                    return <g key={`${b.year}-${b.startTime}`}>
                        {i % 2 === 0 && <rect x={x1} y={top} width={Math.max(0, x2 - x1)} height={innerH} rx="8" fill={bandFill} opacity={T.dark ? 0.035 : 0.045} />}
                        <line x1={x1} x2={x1} y1={top} y2={height - bottom} stroke={T.brd} strokeDasharray="3 5" />
                        {labels.has(i) && <>
                            <rect x={x1 + 4} y="5" width="34" height="15" rx="7" fill={T.s1} stroke={T.brd} />
                            <text x={x1 + 21} y="16" textAnchor="middle" fill={T.t2} fontSize="9" fontWeight="800">{b.year}</text>
                        </>}
                    </g>;
                })}
                <path d={area} fill={`url(#${gradId})`} opacity="0.8" />
                {ticks.map((tick, i) => <g key={i}><line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke={T.brd} strokeDasharray="3 3" opacity="0.75" /><text x={left + 5} y={y(tick) + 4} textAnchor="start" fill={T.t3} fontSize="11">{fmt(tick)}</text></g>)}
                <line x1={left} x2={width - right} y1={zeroY} y2={zeroY} stroke={T.t3} strokeDasharray="4 4" />
                {segments.map((s, i) => <path key={i} d={curve(s.x1, s.y1, s.x2, s.y2)} fill="none" stroke={s.color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />)}
                {rows.map((d, i) => <circle key={i} cx={x(d.time)} cy={y(d.value)} r="3.2" fill={d.value >= 0 ? GRN : LOSSC} stroke={T.s1} strokeWidth="1.4" />)}
                {dateTicks.map((d, i) => <g key={`${d.label}-${i}`}><line x1={x(d.time)} x2={x(d.time)} y1={height - bottom + 5} y2={height - bottom + 10} stroke={T.t3} opacity="0.55" /><text x={x(d.time)} y={height - 6} textAnchor={i === 0 ? 'start' : i === dateTicks.length - 1 ? 'end' : 'middle'} fill={T.t3} fontSize="11">{d.label}</text></g>)}
            </svg>
        </div>
    );
}

function KpiCard({ label, value, sub, color, hero }) {
    const T = useT(); const c = color || T.t1;
    const valStyle = hero
        ? { fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums', background: `linear-gradient(135deg,${ACC},#FF8A8A)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
        : { fontSize: '1.55rem', fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: c };
    return (
        <div style={{ borderRadius: 12, background: T.s1, border: `1px solid ${c}1a`, overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${c}80,transparent)` }} />
            <div style={{ padding: '1rem 1rem 1rem 1.25rem', position: 'relative', minHeight: 80 }}>
                <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: '55%', borderRadius: '0 3px 3px 0', background: `linear-gradient(180deg,${c}00,${c},${c}00)` }} />
                <div style={{ fontSize: '.58rem', color: T.t2, textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 600, marginBottom: 7 }}>{label}</div>
                <div style={valStyle}>{value}</div>
                {sub && <div style={{ fontSize: '.6rem', color: T.t3, marginTop: 6, lineHeight: 1.45 }}>{sub}</div>}
            </div>
        </div>
    );
}

function SC({ title, action, children, style: xs, noPad }) {
    const T = useT();
    return (
        <div style={{ borderRadius: 12, background: T.s1, border: `1px solid ${T.brd}`, overflow: 'hidden', ...(xs || {}) }}>
            {(title || action) && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.75rem 1.1rem .4rem', borderBottom: `1px solid ${T.brd}` }}>
                {title && <span style={{ fontSize: '.62rem', color: T.t2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em' }}>{title}</span>}
                {action && <div>{action}</div>}
            </div>}
            {noPad ? children : <div style={{ padding: title || action ? '0 1.1rem 1rem' : '1.1rem' }}>{children}</div>}
        </div>
    );
}

function useTS() {
    const T = useT();
    const base = { borderBottom: `1px solid ${T.brd}`, verticalAlign: 'middle', fontVariantNumeric: 'tabular-nums', fontSize: '.75rem' };
    return {
        th: { ...base, padding: '.42rem .7rem', color: T.t2, fontWeight: 600, fontSize: '.58rem', textTransform: 'uppercase', letterSpacing: '.1em', textAlign: 'left', background: T.s2, whiteSpace: 'nowrap' },
        thR: { ...base, padding: '.42rem .7rem', color: T.t2, fontWeight: 600, fontSize: '.58rem', textTransform: 'uppercase', letterSpacing: '.1em', textAlign: 'right', background: T.s2, whiteSpace: 'nowrap' },
        td: { ...base, padding: '.48rem .7rem' },
        tdR: { ...base, padding: '.48rem .7rem', textAlign: 'right' },
    };
}
function TRow({ onClick, children }) {
    const T = useT(); const [h, setH] = useState(false);
    return <tr onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onClick={onClick} style={{ background: h ? `${ACC}08` : 'transparent', cursor: onClick ? 'pointer' : 'default', transition: 'background .1s' }}>{children}</tr>;
}

function AnnualTable({ pid, txs, vals }) {
    const T = useT(); const { th, thR, td, tdR } = useTS(); const { isMobile } = useBreakpoint();
    const rows = useMemo(() => getAnnualRows(pid, txs, vals), [pid, txs, vals]);
    if (!rows.length) return <div style={{ color: T.t2, fontSize: '.75rem', padding: '.5rem 0' }}>Données insuffisantes.</div>;
    return (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 520 : undefined }}>
                <thead>
                    <tr>
                        <th style={th}>Année</th>
                        {!isMobile && <th style={thR}>Départ</th>}
                        <th style={thR}>Fin</th>
                        <th style={thR}>Flux net</th>
                        <th style={thR}>Perf. €</th>
                        <th style={thR}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                                Perf. %<InfoBtn {...PERF_ANN_INFO} />
                            </span>
                        </th>
                        {!isMobile && <th style={thR}>Cumulé €</th>}
                        <th style={thR}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                                Cumulé %<InfoBtn {...CUMUL_INFO} />
                            </span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(r => (
                        <TRow key={r.y}>
                            <td style={{ ...td, fontWeight: 700, color: T.t1 }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{r.y}{r.y === CY && <Badge ch="en cours" />}</span></td>
                            {!isMobile && <td style={{ ...tdR, color: T.t2 }}>{r.bmv > 0 ? fEUR(r.bmv) : '–'}</td>}
                            <td style={{ ...tdR, fontWeight: 600, color: ACC }}>{r.emv > 0 ? fEUR(r.emv) : '–'}</td>
                            <td style={{ ...tdR, color: r.netCF >= 0 ? T.t1 : AMB }}>{fEUR(r.netCF)}</td>
                            <td style={{ ...tdR, fontWeight: 600, color: gc(r.perfE) }}>{fEURS(r.perfE)}</td>
                            <td style={{ ...tdR, fontWeight: 700, color: gc(r.perfPct) }}>{fPctS(r.perfPct)}</td>
                            {!isMobile && <td style={{ ...tdR, color: gc(r.cumE) }}>{fEURS(r.cumE)}</td>}
                            <td style={{ ...tdR, fontWeight: 700, color: gc(r.cumPct) }}>{fPctS(r.cumPct)}</td>
                        </TRow>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ── Form helpers ──
function Lbl({ ch }) { const T = useT(); return <label style={{ fontSize: '.68rem', color: T.t2, display: 'block', marginBottom: 4, fontWeight: 500, letterSpacing: '.04em' }}>{ch}</label>; }
function Inp({ style: xs, ...p }) { const T = useT(); return <input style={{ background: T.inp, border: `1px solid ${T.brd}`, borderRadius: 8, color: T.t1, padding: '.52rem .75rem', width: '100%', fontSize: '.84rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', fontVariantNumeric: 'tabular-nums', ...(xs || {}) }} {...p} />; }
function Sel({ children, ...p }) { const T = useT(); return <select style={{ background: T.inp, border: `1px solid ${T.brd}`, borderRadius: 8, color: T.t1, padding: '.52rem .75rem', width: '100%', fontSize: '.84rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} {...p}>{children}</select>; }
function CatInp({ value, onChange, categories, placeholder }) {
    const T = useT();
    const choose = c => onChange({ target: { value: c } });
    const current = value.trim();
    return <div style={{ display: 'grid', gap: 7 }}>
        <Inp value={value} onChange={onChange} placeholder={placeholder} />
        {!!categories.length && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {categories.map(c => {
                const active = c === current;
                return <button key={c} type="button" onClick={() => choose(c)} style={{ border: `1px solid ${active ? ACC + '70' : T.brd}`, background: active ? `${ACC}18` : T.s2, color: active ? ACC : T.t2, borderRadius: 7, padding: '.24rem .48rem', minHeight: 28, cursor: 'pointer', fontSize: '.68rem', fontWeight: active ? 700 : 600, fontFamily: 'inherit' }}>{c}</button>;
            })}
        </div>}
    </div>;
}
function Btn({ onClick, primary, danger, ghost, style: xs, children, ...rest }) {
    const T = useT(); const [h, setH] = useState(false);
    let bg, col, brd, sh;
    if (primary) { bg = h ? '#F04060' : ACC; col = '#fff'; brd = 'none'; sh = `0 4px 20px ${ACC}50`; }
    else if (danger) { bg = h ? '#EF4444' : LOSSC; col = '#fff'; brd = 'none'; sh = 'none'; }
    else if (ghost) { bg = 'transparent'; col = T.t2; brd = `1px solid ${T.brd}`; sh = 'none'; }
    else { bg = h ? T.s3 : T.s2; col = T.t1; brd = `1px solid ${T.brd}`; sh = 'none'; }
    return <button onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '.44rem .9rem', borderRadius: 8, border: brd, cursor: 'pointer', fontSize: '.76rem', fontFamily: 'inherit', fontWeight: primary ? 600 : 500, background: bg, color: col, boxShadow: sh, transition: 'all .14s', minHeight: 36, ...(xs || {}) }} {...rest}>{children}</button>;
}

// ── Sheet (bottom-sheet mobile / modal desktop) ──
function Sheet({ title, onClose, children }) {
    const T = useT(); const { isMobile } = useBreakpoint();
    const font = 'system-ui,-apple-system,sans-serif';
    const inner = (
        <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
                <strong style={{ fontSize: '.9rem', fontWeight: 700, color: T.t1 }}>{title}</strong>
                <button onClick={onClose} style={{ background: 'none', border: `1px solid ${T.brd}`, borderRadius: 7, color: T.t2, cursor: 'pointer', padding: 6, display: 'flex', lineHeight: 0, flexShrink: 0 }}><X size={14} /></button>
            </div>
            {children}
        </>
    );
    if (isMobile) return (
        <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', color: T.t1, fontFamily: font }}>
            <div style={{ background: T.s1, borderRadius: '18px 18px 0 0', width: '100%', maxHeight: '90vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', border: `1px solid ${T.brd2}`, boxShadow: '0 -24px 80px rgba(0,0,0,0.6)', color: T.t1, boxSizing: 'border-box', fontFamily: font }}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}><div style={{ width: 36, height: 4, borderRadius: 99, background: T.s3 }} /></div>
                <div style={{ padding: '1rem 1.25rem 2.5rem', fontFamily: font }}>{inner}</div>
            </div>
        </div>
    );
    return (
        <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', color: T.t1, fontFamily: font }}>
            <div style={{ background: T.s1, borderRadius: 14, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${T.brd2}`, boxShadow: '0 24px 80px rgba(0,0,0,0.7)', position: 'relative', boxSizing: 'border-box', color: T.t1, fontFamily: font }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, borderRadius: '14px 14px 0 0', background: `linear-gradient(90deg,transparent,${ACC},transparent)` }} />
                <div style={{ padding: '1.4rem 1.5rem 1.75rem', fontFamily: font }}>{inner}</div>
            </div>
        </div>
    );
}

// ── Modals ──
function ModalSaisie({ poches, defPoche, onSave, onClose }) {
    const T = useT();
    const [pocheId, setPocheId] = useState(defPoche || poches[0]?.id || '');
    const [type, setType] = useState('apport');
    const [montant, setMontant] = useState('');
    const [valeur, setValeur] = useState('');
    const [note, setNote] = useState('');
    const [date, setDate] = useState(TODAY);
    const hasTx = montant !== '' && parseFloat(montant) > 0, hasVal = valeur !== '' && parseFloat(valeur) >= 0;
    const ok = pocheId && (hasTx || hasVal);
    const status = !hasTx && !hasVal ? 'Remplissez au moins un champ' : hasTx && hasVal ? 'Transaction + valorisation' : hasTx ? 'Transaction uniquement' : 'Valorisation uniquement';
    const save = () => { if (!ok) return; onSave(pocheId, hasTx ? { type, montant: parseFloat(montant), commentaire: note.trim() } : null, hasVal ? parseFloat(valeur) : null, date, note.trim()); };
    return (
        <Sheet title="Nouvelle saisie" onClose={onClose}>
            <div style={{ display: 'grid', gap: '.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div><Lbl ch="Poche" /><Sel value={pocheId} onChange={e => setPocheId(e.target.value)}>{poches.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}</Sel></div>
                    <div><Lbl ch="Date" /><Inp type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
                </div>
                <div style={{ background: T.s2, borderRadius: 10, padding: '.85rem', border: `1px solid ${T.brd}` }}>
                    <div style={{ fontSize: '.58rem', color: T.t2, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: '.65rem' }}>Transaction <span style={{ fontWeight: 400, color: T.t3 }}>— optionnel</span></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div><Lbl ch="Type" /><Sel value={type} onChange={e => setType(e.target.value)}>{TX_IN.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}</Sel></div>
                        <div><Lbl ch="Montant (€)" /><Inp type="number" min="0" step="0.01" value={montant} onChange={e => setMontant(e.target.value)} placeholder="0" /></div>
                    </div>
                </div>
                <div style={{ background: T.s2, borderRadius: 10, padding: '.85rem', border: `1px solid ${T.brd}` }}>
                    <div style={{ fontSize: '.58rem', color: T.t2, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: '.65rem' }}>Valorisation <span style={{ fontWeight: 400, color: T.t3 }}>— optionnel</span></div>
                    <Lbl ch="Valeur totale de la poche (€)" /><Inp type="number" min="0" step="0.01" value={valeur} onChange={e => setValeur(e.target.value)} placeholder="0" />
                </div>
                <div><Lbl ch="Note" /><Inp value={note} onChange={e => setNote(e.target.value)} placeholder="Contexte, arbitrage, rachat…" /></div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: '.68rem', color: ok ? GRN : T.t3, display: 'flex', alignItems: 'center', gap: 5 }}>{ok && <span style={{ width: 6, height: 6, borderRadius: '50%', background: GRN, display: 'inline-block' }} />}{status}</span>
                    <div style={{ display: 'flex', gap: 6 }}><Btn ghost onClick={onClose}>Annuler</Btn><Btn primary onClick={save} style={{ opacity: ok ? 1 : .4 }}>Enregistrer</Btn></div>
                </div>
            </div>
        </Sheet>
    );
}
function ModalPoche({ onAdd, onClose, count, categories = [] }) {
    const [nom, setNom] = useState(''); const [col, setCol] = useState(PCOLS[count % PCOLS.length]);
    const [categorie, setCategorie] = useState('');
    const T = useT();
    return (
        <Sheet title="Nouvelle poche" onClose={onClose}>
            <div style={{ display: 'grid', gap: '.85rem' }}>
                <div><Lbl ch="Nom" /><Inp value={nom} onChange={e => setNom(e.target.value)} placeholder="PEA, CTO, Livret A…" autoFocus /></div>
                <div><Lbl ch="Catégorie" /><CatInp value={categorie} onChange={e => setCategorie(e.target.value)} categories={categories} placeholder="Nouvelle catégorie…" /></div>
                <div><Lbl ch="Couleur" />
                    <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginTop: 5 }}>
                        {PCOLS.map(c => <button key={c} onClick={() => setCol(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: col === c ? `2.5px solid ${T.t1}` : '2.5px solid transparent', cursor: 'pointer', outline: 'none', boxShadow: col === c ? `0 0 14px ${c}90` : 'none', transition: 'all .15s' }} />)}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}><Btn ghost onClick={onClose}>Annuler</Btn><Btn primary onClick={() => { if (nom.trim()) onAdd({ nom: nom.trim(), couleur: col, categorie: categorie.trim() }); }}>Créer</Btn></div>
            </div>
        </Sheet>
    );
}
function ModalEditPoche({ poche, categories = [], onSave, onClose }) {
    const [nom, setNom] = useState(poche.nom || '');
    const [categorie, setCategorie] = useState(poche.categorie || '');
    const [couleur, setCouleur] = useState(poche.couleur || PCOLS[0]);
    const T = useT();
    const ok = nom.trim().length > 0;
    return (
        <Sheet title="Modifier la poche" onClose={onClose}>
            <div style={{ display: 'grid', gap: '.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '.75rem', borderRadius: 11, background: T.s2, border: `1px solid ${T.brd}` }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${couleur}18`, border: `1px solid ${couleur}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Dot c={couleur} sz={11} /></div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ color: T.t1, fontWeight: 700, fontSize: '.86rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nom.trim() || 'Nouvelle poche'}</div>
                        <div style={{ color: T.t3, fontSize: '.66rem', marginTop: 2 }}>{categorie.trim() || 'Sans catégorie'}</div>
                    </div>
                </div>
                <div><Lbl ch="Nom" /><Inp value={nom} onChange={e => setNom(e.target.value)} autoFocus /></div>
                <div><Lbl ch="Catégorie" /><CatInp value={categorie} onChange={e => setCategorie(e.target.value)} categories={categories} placeholder="Nouvelle catégorie…" /></div>
                <div><Lbl ch="Couleur" />
                    <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginTop: 5 }}>
                        {PCOLS.map(c => <button key={c} onClick={() => setCouleur(c)} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: couleur === c ? `2.5px solid ${T.t1}` : '2.5px solid transparent', cursor: 'pointer', outline: 'none', boxShadow: couleur === c ? `0 0 14px ${c}90` : 'none', transition: 'all .15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{couleur === c && <Check size={14} color="#fff" strokeWidth={3} />}</button>)}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <Btn ghost onClick={onClose}>Annuler</Btn>
                    <Btn primary onClick={() => ok && onSave(poche.id, { nom: nom.trim(), categorie: categorie.trim(), couleur })} style={{ opacity: ok ? 1 : .45 }}><Check size={12} />Enregistrer</Btn>
                </div>
            </div>
        </Sheet>
    );
}
function ConfirmDel({ msg, onOk, onCancel }) {
    return (
        <Sheet title="Confirmer" onClose={onCancel}>
            <div style={{ textAlign: 'center', padding: '.5rem 0' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${LOSSC}15`, border: `1px solid ${LOSSC}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto .9rem', fontSize: '1.3rem' }}>⚠️</div>
                <p style={{ fontSize: '.8rem', lineHeight: 1.75, marginBottom: '1.4rem' }}>{msg}</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}><Btn ghost onClick={onCancel}>Annuler</Btn><Btn danger onClick={onOk}>Supprimer</Btn></div>
            </div>
        </Sheet>
    );
}
function LandingDemoMockup() {
    const T = useT();
    const { isMobile } = useBreakpoint();
    const ink = T.dark ? '#EEEEFF' : '#0A0A14';
    const muted = T.dark ? '#8080A8' : '#606080';
    const panel = T.dark ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.8)';
    const panel2 = T.dark ? '#15151C' : '#FFFFFF';
    const border = T.dark ? 'rgba(255,255,255,0.08)' : 'rgba(10,10,20,0.08)';
    const grid = T.dark ? 'rgba(255,255,255,.06)' : 'rgba(10,10,20,.07)';
    const demoPm = [
        { id: 'pea', nom: 'PEA', couleur: ACC, capital: 16500, valActu: 18420, lastVal: 'Avr. 2026' },
        { id: 'crypto', nom: 'Crypto', couleur: AMB, capital: 7200, valActu: 8120, lastVal: 'Avr. 2026' },
        { id: 'immo', nom: 'Immobilier', couleur: GRN, capital: 22000, valActu: 23850, lastVal: 'Mars 2026' },
    ].map(p => ({ ...p, perf: p.valActu - p.capital, perfPct: p.capital > 0 ? (p.valActu - p.capital) / p.capital : null }));
    const chart = [
        { date: '2024-01', value: 14100, capital: 13500 },
        { date: '2024-04', value: 18900, capital: 18500 },
        { date: '2024-08', value: 24700, capital: 24000 },
        { date: '2024-12', value: 31200, capital: 30000 },
        { date: '2025-04', value: 36500, capital: 35200 },
        { date: '2025-08', value: 42100, capital: 40000 },
        { date: '2025-12', value: 47300, capital: 43800 },
        { date: '2026-04', value: 50390, capital: 45700 },
    ].map(p => ({ ...p, perf: p.value - p.capital, pct: p.capital > 0 ? (p.value - p.capital) / p.capital : null }));
    const totalValue = demoPm.reduce((s, p) => s + p.valActu, 0);
    const totalCapital = demoPm.reduce((s, p) => s + p.capital, 0);
    const totalGain = totalValue - totalCapital;
    const gainPct = totalCapital > 0 ? totalGain / totalCapital : null;
    return (
        <div style={{ padding: 'clamp(1rem,3vw,2rem)', background: T.dark ? 'radial-gradient(circle at top, rgba(255,255,255,0.035) 0%, transparent 70%)' : 'radial-gradient(circle at top, rgba(232,54,74,0.06) 0%, transparent 70%)', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1.24fr) minmax(230px,.76fr)', gap: 18, minHeight: isMobile ? 0 : 430 }}>
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 15 }}>
                <div>
                    <div style={{ fontSize: '.68rem', color: muted, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, marginBottom: 6 }}>Portefeuille total</div>
                    <div style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 850, lineHeight: 1, letterSpacing: '-.04em', color: ink }}>{fEUR(totalValue)}</div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: panel, color: ink, padding: '6px 12px', borderRadius: 8, fontSize: '.78rem', border: `1px solid ${border}` }}>Performance <strong style={{ color: GRN }}>{fPctS(gainPct)}</strong></span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: panel, color: ink, padding: '6px 12px', borderRadius: 8, fontSize: '.78rem', border: `1px solid ${border}` }}>Capital net <strong>{fEUR(totalCapital)}</strong></span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${GRN}12`, color: GRN, padding: '6px 12px', borderRadius: 8, fontSize: '.78rem', border: `1px solid ${GRN}2E` }}>Gain {fEURS(totalGain)}</span>
                </div>
                <div style={{ flex: 1, minHeight: 205, borderRadius: 14, border: `1px solid ${VALC}2E`, background: T.dark ? 'linear-gradient(180deg, rgba(56,189,248,0.08) 0%, rgba(56,189,248,0.01) 100%)' : 'linear-gradient(180deg, rgba(56,189,248,0.12) 0%, rgba(56,189,248,0.02) 100%)', overflow: 'hidden' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chart} margin={{ top: 22, right: 12, left: -12, bottom: 0 }}>
                            <defs><linearGradient id="landingDemoFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={VALC} stopOpacity={0.28} /><stop offset="100%" stopColor={VALC} stopOpacity={0.02} /></linearGradient></defs>
                            <CartesianGrid stroke={grid} vertical={false} />
                            <XAxis dataKey="date" tick={{ fill: muted, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={16} />
                            <YAxis hide domain={[0, 'dataMax + 2500']} />
                            <RT contentStyle={{ background: panel2, border: `1px solid ${border}`, borderRadius: 10, color: ink, fontSize: '.75rem' }} formatter={v => fEUR(v)} />
                            <Area type="monotone" dataKey="value" fill="url(#landingDemoFill)" stroke={VALC} strokeWidth={2.4} dot={false} />
                            <Line type="monotone" dataKey="capital" stroke={T.dark ? '#F8FAFC' : '#111827'} strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 10 }}>
                    {[
                        ['Apports cumulés', fEUR(48200)],
                        ['Retraits cumulés', fEUR(2500)],
                        ['Dernière valorisation', 'Avr. 2026'],
                    ].map(([label, value]) => <div key={label} style={{ border: `1px solid ${border}`, background: panel, borderRadius: 12, padding: '.75rem' }}><div style={{ color: muted, fontSize: '.63rem', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 800 }}>{label}</div><div style={{ color: ink, fontSize: '.94rem', fontWeight: 850, marginTop: 3 }}>{value}</div></div>)}
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
                <div style={{ border: `1px solid ${border}`, borderRadius: 14, padding: 13, background: panel }}>
                    <div style={{ color: muted, fontSize: '.66rem', textTransform: 'uppercase', letterSpacing: '.09em', fontWeight: 800, marginBottom: 10 }}>Répartition</div>
                    <div style={{ display: 'grid', gap: 10 }}>
                        {demoPm.map(p => (
                            <div key={p.id}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: ink, fontSize: '.76rem', marginBottom: 5 }}><span>{p.nom}</span><strong>{Math.round((p.valActu / totalValue) * 100)}%</strong></div>
                                <div style={{ height: 6, borderRadius: 99, background: T.dark ? 'rgba(255,255,255,.07)' : 'rgba(10,10,20,.08)', overflow: 'hidden' }}><div style={{ width: `${(p.valActu / totalValue) * 100}%`, height: '100%', background: p.couleur, borderRadius: 99 }} /></div>
                            </div>
                        ))}
                    </div>
                </div>
                <div style={{ border: `1px solid ${border}`, borderRadius: 14, padding: 13, background: panel }}>
                    <div style={{ color: muted, fontSize: '.66rem', textTransform: 'uppercase', letterSpacing: '.09em', fontWeight: 800, marginBottom: 10 }}>Performance par poche</div>
                    <div style={{ display: 'grid', gap: 9 }}>
                        {demoPm.map(p => <div key={p.id} style={{ display: 'grid', gap: 4 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, color: ink, fontSize: '.75rem' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Dot c={p.couleur} sz={6} />{p.nom}</span><strong style={{ color: gc(p.perf) }}>{fPctS(p.perfPct)}</strong></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, color: muted, fontSize: '.68rem' }}><span>{p.lastVal}</span><span>{fEURS(p.perf)}</span></div>
                        </div>)}
                    </div>
                </div>
            </div>
        </div>
    );
}

function WelcomeModal({ onEmpty, canClose, onClose, mode, setMode }) {
    const T = useT(); const { isMobile } = useBreakpoint();
    const revealStyle = { opacity: 1, transform: 'translateY(0)', transition: 'all .8s cubic-bezier(.2,.8,.2,1)' };
    const openApp = () => canClose ? onClose() : onEmpty();
    const L = {
        bg: T.dark ? '#0A0A0E' : '#F7F6FC',
        surface: T.dark ? '#15151C' : '#FFFFFF',
        surfaceSoft: T.dark ? 'rgba(255,255,255,.03)' : 'rgba(10,10,20,.035)',
        border: T.dark ? 'rgba(255,255,255,.08)' : 'rgba(10,10,20,.08)',
        text: T.dark ? '#EEEEFF' : '#0A0A14',
        textSoft: T.dark ? '#8080A8' : '#606080',
        textFaint: T.dark ? '#565678' : '#8585A8',
        hero: T.dark ? 'linear-gradient(180deg,#FFFFFF 0%,rgba(255,255,255,.7) 100%)' : 'linear-gradient(180deg,#090914 0%,rgba(30,30,54,.72) 100%)',
        shadow: T.dark ? '0 30px 100px rgba(0,0,0,.8),0 0 0 1px rgba(255,255,255,.05) inset' : '0 24px 70px rgba(30,30,60,.14),0 0 0 1px rgba(255,255,255,.8) inset',
    };
    const trust = [
        { Icon: ShieldCheck, title: 'Zéro risque bancaire', text: 'Aucune connexion à votre banque n\'est demandée. Vous saisissez vos montants, c\'est vous qui avez la main.' },
        { Icon: CloudOff, title: 'Zéro serveur distant', text: 'Toutes vos données financières restent sauvegardées directement dans votre navigateur. Rien ne fuite.' },
        { Icon: Download, title: '100% portable', text: 'Exportez tout votre suivi dans un simple fichier en un seul clic. Vous n\'êtes jamais bloqué chez nous.' },
    ];
    const features = [
        { cls: 'large', Icon: TrendingUp, title: 'La vraie rentabilité', text: '1 000 € gagnés en 1 mois ou en 10 ans, ce n\'est pas la même chose. L\'application calcule automatiquement votre rendement annuel réel via le XIRR.' },
        { Icon: PieChartIcon, title: 'Où est votre argent ?', text: 'Suivez facilement le poids de chaque placement dans votre patrimoine global grâce aux graphiques de répartition.', color: GRN },
        { Icon: AlertCircle, title: 'Assistant intelligent', text: 'Oubli de mise à jour ? Capital devenu négatif par erreur ? L\'application vous alerte si elle détecte une anomalie.', color: VALC },
        { cls: 'large', Icon: Layers, title: 'Séparez les apports des gains', text: 'Voir son solde augmenter c\'est bien, mais InvestTrack distingue clairement ce que vous avez versé de ce que vos placements ont généré.' },
    ];
    return (
        <div style={{ position: 'fixed', inset: 0, width: '100vw', zIndex: 220, background: L.bg, color: L.text, overflowY: 'auto', overflowX: 'hidden', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', lineHeight: 1.6 }}>
            <style>{`@media (max-width: 760px){.landing-demo-grid{grid-template-columns:1fr!important}.landing-bento{grid-template-columns:1fr!important}.landing-feature-large{grid-column:auto!important}.landing-demo-side{display:none!important}}@media (max-width: 430px){.landing-brand-text{display:none!important}}`}</style>
            <div style={{ position: 'absolute', width: 800, height: 800, background: `radial-gradient(circle, ${ACC}${T.dark ? '66' : '30'} 0%, rgba(0,0,0,0) 60%)`, top: -300, left: '50%', transform: 'translateX(-50%)', filter: 'blur(90px)', pointerEvents: 'none', opacity: T.dark ? .5 : .75 }} />
            <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: isMobile ? '1rem' : '1.5rem 2rem', maxWidth: 1200, width: '100%', margin: '0 auto', position: 'sticky', top: 0, zIndex: 5, boxSizing: 'border-box', background: T.dark ? 'rgba(10,10,14,.72)' : 'rgba(247,246,252,.74)', borderBottom: `1px solid ${L.border}`, backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, color: L.text, fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-.03em' }}><div style={{ width: 32, height: 32, flex: '0 0 auto', background: `linear-gradient(135deg,${ACC},#FF6B6B)`, color: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', fontWeight: 900, boxShadow: `0 0 16px ${ACC}66` }}>IT</div><span className="landing-brand-text" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>InvestTrack</span></div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
                    <button type="button" onClick={() => setMode(m => m === 'dark' ? 'light' : 'dark')} title="Changer de thème" aria-label="Changer de thème" style={{ width: 36, height: 36, flex: '0 0 auto', borderRadius: 10, border: `1px solid ${L.border}`, background: L.surfaceSoft, color: L.textSoft, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{mode === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
                    <button type="button" onClick={openApp} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: isMobile ? '.55rem .8rem' : '.5rem 1rem', borderRadius: 12, fontWeight: 600, fontSize: isMobile ? '.78rem' : '.85rem', cursor: 'pointer', background: L.surfaceSoft, border: `1px solid ${L.border}`, color: L.text, whiteSpace: 'nowrap' }}>Ouvrir l'app <ArrowUpRight size={14} /></button>
                    {canClose && <button type="button" onClick={onClose} title="Fermer" aria-label="Fermer" style={{ width: 36, height: 36, flex: '0 0 auto', borderRadius: 10, border: `1px solid ${L.border}`, background: L.surfaceSoft, color: L.textSoft, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>}
                </div>
            </nav>

            <header style={{ textAlign: 'center', padding: isMobile ? '4rem 1rem 2rem' : '6rem 1rem 4rem', maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
                <div style={{ ...revealStyle, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '.4rem 1rem', background: L.surfaceSoft, border: `1px solid ${L.border}`, borderRadius: 99, fontSize: '.8rem', fontWeight: 500, color: L.textSoft, marginBottom: '2rem' }}><span style={{ color: GRN }}>●</span> 100% privé - 100% gratuit</div>
                <h1 style={{ ...revealStyle, transitionDelay: '100ms', fontSize: 'clamp(2.5rem,5vw,4.5rem)', fontWeight: 900, letterSpacing: '-.04em', lineHeight: 1.1, margin: '0 auto 1.5rem', maxWidth: 1000, background: L.hero, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Tout votre patrimoine réuni.<br />Votre vraie rentabilité révélée.</h1>
                <p style={{ ...revealStyle, transitionDelay: '200ms', fontSize: 'clamp(1rem,2vw,1.25rem)', color: L.textSoft, maxWidth: 700, margin: '0 auto 2.5rem', lineHeight: 1.6 }}>PEA, cryptos, immobilier... Regroupez tous vos placements au même endroit. Obtenez une vision globale de vos finances en quelques clics, sans jamais que vos données ne quittent votre appareil.</p>
                <div style={{ ...revealStyle, transitionDelay: '300ms', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <button onClick={openApp} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '.75rem 1.5rem', borderRadius: 12, fontWeight: 600, fontSize: '.95rem', cursor: 'pointer', background: ACC, color: '#fff', border: 'none', boxShadow: `0 4px 20px ${ACC}66` }}>Ouvrir l'application</button>
                </div>
            </header>

            <div style={{ maxWidth: 1000, margin: '0 auto 6rem', padding: '0 1rem', perspective: 1000 }}>
                <div style={{ width: '100%', maxWidth: '100%', background: L.surface, border: `1px solid ${L.border}`, borderRadius: 20, boxShadow: L.shadow, overflow: 'hidden', transform: isMobile ? 'none' : 'rotateX(4deg) scale(.98)' }}>
                    <div style={{ display: 'flex', gap: 6, padding: '1rem', borderBottom: `1px solid ${L.border}`, background: L.surfaceSoft }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F56' }} /><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }} /><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27C93F' }} /></div>
                    <div className="landing-demo-grid" style={{ display: 'grid', gridTemplateColumns: '1fr' }}><LandingDemoMockup /></div>
                </div>
            </div>

            <section style={{ padding: '6rem 1rem', maxWidth: 1100, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}><h2 style={{ fontSize: 'clamp(2rem,4vw,2.5rem)', fontWeight: 800, letterSpacing: '-.03em', margin: '0 0 1rem', color: L.text }}>Une intimité totale sur vos finances.</h2><p style={{ fontSize: 'clamp(1rem,2vw,1.25rem)', color: L.textSoft, maxWidth: 700, margin: '0 auto', lineHeight: 1.6 }}>Pas de création de compte. Pas de synchronisation bancaire requise. Vous gardez le contrôle total.</p></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '2rem' }}>
                    {trust.map(item => <div key={item.title} style={{ textAlign: 'center', padding: '2rem', background: L.surfaceSoft, borderRadius: 20, border: `1px solid ${L.border}` }}><div style={{ width: 56, height: 56, background: L.surfaceSoft, border: `1px solid ${L.border}`, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: VALC }}><item.Icon size={27} /></div><h3 style={{ fontSize: '1.2rem', margin: '0 0 .5rem', color: L.text }}>{item.title}</h3><p style={{ color: L.textSoft, fontSize: '.95rem', margin: 0 }}>{item.text}</p></div>)}
                </div>
            </section>

            <section style={{ padding: '6rem 1rem', maxWidth: 1100, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}><h2 style={{ fontSize: 'clamp(2rem,4vw,2.5rem)', fontWeight: 800, letterSpacing: '-.03em', margin: 0, color: L.text }}>Des indicateurs puissants, expliqués simplement.</h2></div>
                <div className="landing-bento" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridAutoRows: 'minmax(280px,auto)', gap: '1.5rem' }}>
                    {features.map(item => <div key={item.title} className={item.cls === 'large' ? 'landing-feature-large' : undefined} style={{ gridColumn: item.cls === 'large' ? 'span 2' : 'auto', background: L.surface, border: `1px solid ${L.border}`, borderRadius: 24, padding: '2.5rem 2rem', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: 280 }}><div style={{ position: 'absolute', top: '2rem', right: '2rem', color: item.color || ACC, background: `${item.color || ACC}1A`, padding: '1rem', borderRadius: 16 }}><item.Icon size={32} /></div><h3 style={{ fontSize: '1.4rem', margin: '0 0 .5rem', position: 'relative', color: L.text }}>{item.title}</h3><p style={{ color: L.textSoft, fontSize: '.95rem', margin: 0, maxWidth: '85%', position: 'relative' }}>{item.text}</p></div>)}
                </div>
            </section>

            <section style={{ textAlign: 'center', padding: '6rem 1rem 4rem', maxWidth: 1100, marginLeft: 'auto', marginRight: 'auto' }}>
                <h2 style={{ fontSize: 'clamp(2rem,4vw,2.5rem)', fontWeight: 800, margin: '0 0 1.5rem', color: L.text }}>Prenez vos finances en main.</h2>
                <button onClick={openApp} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '1rem 2rem', borderRadius: 12, fontWeight: 600, fontSize: '1.1rem', cursor: 'pointer', background: ACC, color: '#fff', border: 'none', boxShadow: `0 4px 20px ${ACC}66` }}>Commencer maintenant <ArrowUpRight size={20} /></button>
                <p style={{ color: L.textSoft, fontSize: '.85rem', marginTop: '1.2rem' }}>Gratuit. Sans inscription. Fonctionne instantanément.</p>
            </section>
            <footer style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem 2.5rem', borderTop: `1px solid ${L.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', color: L.textFaint, fontSize: '.78rem' }}>
                <span>InvestTrack</span>
                <span>Vos données restent locales. Pensez à exporter une sauvegarde après vos changements.</span>
            </footer>
        </div>
    );
}

// ── Bottom nav (mobile) ──
function BottomNav({ page, setPage, setSelP, setModal }) {
    const T = useT();
    const tabBtn = (k, label, Icon) => {
        const active = page === k;
        return (
            <button onClick={() => { setPage(k); setSelP(null); }} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', color: active ? ACC : T.t2, padding: '6px 0', minHeight: 50 }}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                <span style={{ fontSize: '.6rem', fontWeight: active ? 700 : 400, letterSpacing: '.03em' }}>{label}</span>
            </button>
        );
    };
    return (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: T.dark ? 'rgba(10,10,14,0.97)' : T.s1, borderTop: `1px solid ${T.brd}`, backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', height: 60, paddingBottom: 'env(safe-area-inset-bottom,0px)', boxSizing: 'content-box' }}>
            {tabBtn('dashboard', 'Dashboard', LayoutDashboard)}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <button onClick={() => setModal({ type: 'saisie' })} style={{ width: 50, height: 50, borderRadius: '50%', background: `linear-gradient(135deg,${ACC},#FF6B6B)`, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 20px ${ACC}60`, marginTop: -18, flexShrink: 0 }}>
                    <Plus size={22} color="#fff" strokeWidth={2.5} />
                </button>
            </div>
            {tabBtn('poches', 'Poches', Layers)}
        </div>
    );
}

// ── Top bar ──
function TopBar({ page, selP, setPage, setSelP, mode, setMode, setModal, expJSON, impJSON, dataMode, disconnectFile, onHome }) {
    const T = useT(); const { isMobile } = useBreakpoint();
    const activeTab = selP ? '_' : page;
    const hasData = dataMode === 'file' || dataMode === 'saved';
    const logo = (
        <button onClick={onHome} title="Revenir à l'accueil" aria-label="Revenir à l'accueil" style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg,${ACC},#FF6B6B)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.6rem', fontWeight: 900, color: '#fff', boxShadow: `0 0 16px ${ACC}55`, flexShrink: 0 }}>IT</div>
            <span style={{ fontWeight: 700, fontSize: '.82rem', color: T.t1, letterSpacing: '-.01em' }}>InvestTrack</span>
        </button>
    );
    if (isMobile) return (
        <>
            <header style={{ position: 'sticky', top: 0, zIndex: 50, height: 50, background: T.dark ? 'rgba(10,10,14,0.95)' : T.s1, borderBottom: `1px solid ${T.brd}`, backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', padding: '0 1rem', gap: 8 }}>
                {logo}
                <div style={{ flex: 1 }} />
                <button title="Exporter" aria-label="Exporter" onClick={expJSON} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${T.brd}`, background: 'transparent', color: T.t2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Download size={15} /></button>
                <label title="Importer" aria-label="Importer" style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${T.brd}`, background: 'transparent', color: T.t2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Upload size={15} /><input type="file" accept=".json" style={{ display: 'none' }} onChange={impJSON} /></label>
                {hasData && <button title="Fermer mes données" aria-label="Fermer mes données" onClick={disconnectFile} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${AMB}40`, background: `${AMB}10`, color: AMB, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><LogOut size={15} /></button>}
                <button title="Changer de thème" aria-label="Changer de thème" onClick={() => setMode(m => m === 'dark' ? 'light' : 'dark')} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${T.brd}`, background: 'transparent', color: T.t2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{mode === 'dark' ? <Sun size={15} /> : <Moon size={15} />}</button>
            </header>
            <BottomNav page={page} setPage={setPage} setSelP={setSelP} setModal={setModal} />
        </>
    );
    return (
        <header style={{ position: 'sticky', top: 0, zIndex: 50, background: T.dark ? 'rgba(10,10,14,0.92)' : T.s1, borderBottom: `1px solid ${T.brd}`, backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, padding: '.55rem 1.25rem' }}>
            {logo}
            <div style={{ display: 'inline-flex', background: T.s2, borderRadius: 10, padding: 3, gap: 2 }}>
                {[['dashboard', 'Dashboard'], ['poches', 'Poches']].map(([k, l]) => (
                    <button key={k} onClick={() => { setPage(k); setSelP(null); }} style={{ padding: '.3rem 1rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '.77rem', fontWeight: activeTab === k ? 600 : 400, background: activeTab === k ? T.s1 : 'transparent', color: activeTab === k ? T.t1 : T.t2, boxShadow: activeTab === k ? '0 1px 4px rgba(0,0,0,0.12)' : 'none', transition: 'all .14s', minHeight: 34 }}>{l}</button>
                ))}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={expJSON} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '.36rem .75rem', borderRadius: 7, border: `1px solid ${T.brd}`, background: 'transparent', color: T.t2, cursor: 'pointer', fontSize: '.72rem', minHeight: 36 }}><Download size={11} />Export</button>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '.36rem .75rem', borderRadius: 7, border: `1px solid ${T.brd}`, background: 'transparent', color: T.t2, cursor: 'pointer', fontSize: '.72rem', minHeight: 36 }}><Upload size={11} />Import<input type="file" accept=".json" style={{ display: 'none' }} onChange={impJSON} /></label>
                {hasData && <button title="Fermer mes données et revenir à l'accueil" onClick={disconnectFile} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '.36rem .75rem', borderRadius: 7, border: `1px solid ${AMB}40`, background: `${AMB}10`, color: AMB, cursor: 'pointer', fontSize: '.72rem', minHeight: 36 }}><LogOut size={11} />Déconnexion</button>}
                <Btn primary onClick={() => setModal({ type: 'saisie' })} style={{ padding: '.36rem .8rem' }}><Plus size={11} />Saisie</Btn>
                <button title="Changer de thème" aria-label="Changer de thème" onClick={() => setMode(m => m === 'dark' ? 'light' : 'dark')} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${T.brd}`, background: 'transparent', color: T.t2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{mode === 'dark' ? <Sun size={14} /> : <Moon size={14} />}</button>
            </div>
        </header>
    );
}

// ── Hero banner ──
function HeroBanner({ gm, ps, vs, ts }) {
    const T = useT(); const { isMobile } = useBreakpoint();
    const [chartMode, setChartMode] = useState('value');
    const gainPct = gm.tc > 0 ? gm.tg / gm.tc : null;
    const histo = useMemo(() => {
        const dates = [...new Set(vs.map(v => v.date))].sort();
        const pids = ps.map(p => p.id);
        return dates.map(d => { let tot = 0; ps.forEach(p => { const l = vs.filter(v => v.pocheId === p.id && v.date <= d).sort((a, b) => b.date.localeCompare(a.date)); tot += l.length ? l[0].valeur : 0; }); const p = perfAtDate(pids, ts, d, tot), c = capitalAtDate(pids, ts, d), pct = c > 0.01 ? p / c : null; return { date: d.slice(0, 7), v: tot, c, p, pct, pPos: p >= 0 ? p : null, pNeg: p < 0 ? p : null, pctPos: pct != null && pct >= 0 ? pct : null, pctNeg: pct != null && pct < 0 ? pct : null }; });
    }, [ps, ts, vs]);
    const dataKey = chartMode === 'value' ? 'v' : chartMode === 'pct' ? 'pct' : 'p';
    const chartLabel = chartMode === 'value' ? 'Valeur' : chartMode === 'pct' ? 'Perf. %' : 'Perf. €';
    const chartFmt = chartMode === 'pct' ? fPctS : fEUR;
    const capColor = T.dark ? '#F8FAFC' : '#111827';
    const lastPoint = histo[histo.length - 1];
    const chartColor = chartMode === 'value' ? VALC : gc(lastPoint?.[dataKey]) || ACC;
    return (
        <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${T.brd}`, marginBottom: '.8rem', background: T.s1, position: 'relative' }}>
            <div style={{ position: 'absolute', bottom: -80, left: -60, width: 380, height: 280, background: `radial-gradient(${ACC}18,transparent 65%)`, pointerEvents: 'none' }} />
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', position: 'relative' }}>
                <div style={{ padding: isMobile ? '1.5rem 1.25rem 1rem' : '1.75rem 1.5rem 1.75rem 2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: isMobile ? 'none' : `1px solid ${T.brd}`, borderBottom: isMobile ? `1px solid ${T.brd}` : 'none' }}>
                    <div style={{ fontSize: '.58rem', color: T.t3, textTransform: 'uppercase', letterSpacing: '.18em', fontWeight: 600, marginBottom: 6 }}>Portefeuille total</div>
                    <div style={{ fontSize: isMobile ? '2.4rem' : '3rem', fontWeight: 800, color: T.t1, letterSpacing: '-.05em', lineHeight: 1, fontVariantNumeric: 'tabular-nums', marginBottom: 12 }}>{fEUR(gm.tv)}</div>
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '.24rem .6rem', borderRadius: 6, background: T.s2, border: `1px solid ${T.brd}` }}>
                            <span style={{ fontSize: '.6rem', color: T.t3, fontWeight: 500 }}>Gain</span>
                            <span style={{ fontSize: '.78rem', fontWeight: 700, color: gc(gainPct), fontVariantNumeric: 'tabular-nums' }}>{fPctS(gainPct)}</span>
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '.24rem .6rem', borderRadius: 6, background: T.s2, border: `1px solid ${T.brd}` }}>
                            <span style={{ fontSize: '.6rem', color: T.t3, fontWeight: 500, display: 'inline-flex', alignItems: 'center' }}>XIRR<InfoBtn {...XIRR_INFO} /></span>
                            <span style={{ fontSize: '.78rem', fontWeight: 700, color: gc(gm.xirr), fontVariantNumeric: 'tabular-nums' }}>{fPctS(gm.xirr)}</span>
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '.24rem .6rem', borderRadius: 6, background: T.s2, border: `1px solid ${T.brd}` }}>
                            <span style={{ fontSize: '.6rem', color: T.t3, fontWeight: 500 }}>Capital</span>
                            <span style={{ fontSize: '.78rem', fontWeight: 700, color: T.t2, fontVariantNumeric: 'tabular-nums' }}>{fEUR(gm.tc)}</span>
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '.24rem .6rem', borderRadius: 6, background: T.s2, border: `1px solid ${T.brd}` }}>
                            <span style={{ fontSize: '.6rem', color: T.t3, fontWeight: 500 }}>Latent</span>
                            <span style={{ fontSize: '.78rem', fontWeight: 700, color: gc(gm.latent), fontVariantNumeric: 'tabular-nums' }}>{fEURS(gm.latent)}</span>
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '.24rem .6rem', borderRadius: 6, background: T.s2, border: `1px solid ${T.brd}` }}>
                            <span style={{ fontSize: '.6rem', color: T.t3, fontWeight: 500 }}>Réalisé</span>
                            <span style={{ fontSize: '.78rem', fontWeight: 700, color: gc(gm.realised), fontVariantNumeric: 'tabular-nums' }}>{fEURS(gm.realised)}</span>
                        </div>
                    </div>
                    <div style={{ fontSize: '.7rem', color: T.t3 }}>{ps.length} poche{ps.length > 1 ? 's' : ''}</div>
                </div>
                <div style={{ padding: isMobile ? '1rem 1rem .75rem' : '1.25rem 1.25rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                        <div style={{ fontSize: '.58rem', color: T.t3, textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 600 }}>Évolution</div>
                        <div style={{ display: 'inline-flex', background: T.s2, borderRadius: 8, padding: 2, border: `1px solid ${T.brd}` }}>
                            {[['perf', 'Perf. €'], ['pct', 'Perf. %'], ['value', 'Valeur']].map(([k, l]) => <button key={k} onClick={() => setChartMode(k)} style={{ border: 'none', borderRadius: 6, background: chartMode === k ? T.s1 : 'transparent', color: chartMode === k ? T.t1 : T.t2, cursor: 'pointer', fontSize: '.62rem', fontWeight: chartMode === k ? 700 : 500, padding: '.28rem .5rem', minHeight: 30 }}>{l}</button>)}
                        </div>
                    </div>
                    <ChartGuide color={chartColor} mode={chartMode} />
                    {chartMode === 'value' ? (
                        <ResponsiveContainer width="100%" height={isMobile ? 140 : 170}>
                            <ComposedChart data={histo} margin={{ top: 22, right: 4, left: -22, bottom: 0 }}>
                                <defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chartColor} stopOpacity={0.24} /><stop offset="55%" stopColor={chartColor} stopOpacity={0.08} /><stop offset="100%" stopColor={chartColor} stopOpacity={0} /></linearGradient></defs>
                                <RechartsYearBands data={histo} labelKey="date" />
                                <CartesianGrid strokeDasharray="3 3" stroke={T.brd} />
                                <XAxis dataKey="date" tick={{ fill: T.t3, fontSize: 9 }} tickLine={false} axisLine={false} />
                                <YAxis domain={['auto', 'auto']} tick={{ fill: T.t3, fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                                <RT contentStyle={{ background: T.dark ? '#0A0A0E' : '#fff', border: `1px solid ${T.brd}`, borderRadius: 8, color: T.t1, fontSize: '.73rem' }} formatter={(v, n) => [chartFmt(v), n === 'c' ? 'Capital investi' : chartLabel]} />
                                <Area type="monotone" dataKey="v" stroke={chartColor} fill="url(#hg)" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: chartColor, strokeWidth: 0 }} />
                                <Line type="monotone" dataKey="c" name="Capital investi" stroke={capColor} strokeOpacity={0.85} strokeWidth={2.5} strokeDasharray="7 5" dot={false} activeDot={{ r: 4, fill: capColor, strokeWidth: 0 }} connectNulls isAnimationActive={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : <PerfLineChart data={histo} dataKey={dataKey} labelKey="date" height={isMobile ? 140 : 170} pct={chartMode === 'pct'} />}
                    {chartMode === 'value' && lastPoint && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 4, fontSize: '.66rem', color: T.t2 }}><span>Capital investi actuel <strong style={{ color: capColor, fontVariantNumeric: 'tabular-nums' }}>{fEUR(lastPoint.c)}</strong></span><span>Écart <strong style={{ color: gc(lastPoint.v - lastPoint.c), fontVariantNumeric: 'tabular-nums' }}>{fEURS(lastPoint.v - lastPoint.c)}</strong></span></div>}
                </div>
            </div>
        </div>
    );
}

// ── Poche card ──
function PocheCard({ p, vals, txs, total, onClick }) {
    const T = useT(); const [h, setH] = useState(false);
    const gainPct = p.capital > 0 ? p.gainLatent / p.capital : null;
    const alloc = total > 0 ? Math.min(p.valActu / total, 1) : 0;
    const isUp = p.gainLatent >= 0;
    return (
        <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
            style={{ borderRadius: 12, background: T.s1, border: `1px solid ${h ? p.couleur + '50' : T.brd}`, cursor: 'pointer', transition: 'all .18s', transform: h ? 'translateY(-3px)' : 'none', boxShadow: h ? `0 10px 36px ${p.couleur}22` : 'none', overflow: 'hidden', position: 'relative' }}>
            <div style={{ height: 2, background: `linear-gradient(90deg,${p.couleur}00,${p.couleur},${p.couleur}00)` }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, opacity: .12, pointerEvents: 'none' }}>
                <Sparkline pocheId={p.id} vals={vals} txs={txs} width={110} height={55} />
            </div>
            <div style={{ padding: '.9rem 1rem', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: '.6rem' }}>
                    <Dot c={p.couleur} sz={7} />
                    <span style={{ fontWeight: 700, fontSize: '.88rem', color: T.t1, flex: 1 }}>{p.nom}</span>
                    {p.categorie && <Tag label={p.categorie} color={p.couleur} />}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '.74rem', fontWeight: 700, color: gc(gainPct) }}>
                        {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{fPctS(gainPct)}
                    </span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: T.t1, letterSpacing: '-.03em', fontVariantNumeric: 'tabular-nums', marginBottom: '.5rem', lineHeight: 1 }}>{fEUR(p.valActu)}</div>
                <div style={{ display: 'flex', gap: 10, fontSize: '.67rem', color: T.t2, marginBottom: '.65rem' }}>
                    <span>Cap. <strong style={{ color: T.t1, fontVariantNumeric: 'tabular-nums' }}>{fEUR(p.capital)}</strong></span>
                    <span style={{ color: T.t3 }}>·</span>
                    <span>XIRR <strong style={{ color: gc(p.xirr), fontVariantNumeric: 'tabular-nums' }}>{fPctS(p.xirr)}</strong></span>
                </div>
                <div style={{ height: 3, borderRadius: 99, background: T.s3, overflow: 'hidden' }}>
                    <div style={{ width: `${alloc * 100}%`, height: '100%', background: `linear-gradient(90deg,${p.couleur},${p.couleur}80)`, borderRadius: 99, transition: 'width .5s ease', boxShadow: `0 0 6px ${p.couleur}60` }} />
                </div>
                <div style={{ fontSize: '.57rem', color: T.t3, marginTop: 3, textAlign: 'right' }}>{(alloc * 100).toFixed(1)} % du portefeuille</div>
            </div>
        </div>
    );
}

// ── Transaction timeline ──
function TxTimeline({ txs, onDel }) {
    const T = useT();
    if (!txs.length) return <div style={{ color: T.t2, textAlign: 'center', padding: '2rem', fontSize: '.8rem' }}>Aucune transaction.</div>;
    return (
        <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 76, top: 16, bottom: 16, width: 1, background: T.brd, zIndex: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {txs.map(t => {
                    const col = txC(t.type), isIn = ['retrait', 'dividende', 'vente'].includes(t.type);
                    return (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
                            <div style={{ width: 68, textAlign: 'right', fontSize: '.63rem', color: T.t3, flexShrink: 0, lineHeight: 1.3 }}>{fDt(t.timestamp)}</div>
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${col}18`, border: `1.5px solid ${col}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: col }} />
                            </div>
                            <div style={{ flex: 1, background: T.s2, borderRadius: 9, padding: '.44rem .75rem', border: `1px solid ${T.brd}`, minHeight: 40 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Tag label={txL(t.type)} color={col} />
                                    <div style={{ flex: 1 }} />
                                    <span style={{ fontWeight: 700, fontSize: '.83rem', color: isIn ? GRN : t.type === 'frais' ? LOSSC : T.t1, fontVariantNumeric: 'tabular-nums' }}>{fEUR(t.montant)}</span>
                                    <button onClick={() => onDel(t.id)} style={{ background: 'none', border: 'none', color: T.t3, cursor: 'pointer', opacity: .5, lineHeight: 0, padding: 4, minWidth: 28, minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={13} /></button>
                                </div>
                                {t.commentaire && <div style={{ color: T.t2, fontSize: '.67rem', marginTop: 5, lineHeight: 1.45 }}>{t.commentaire}</div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function AllocationChart({ pm }) {
    const T = useT(); const { isMobile } = useBreakpoint();
    const [mode, setMode] = useState('poche');
    const categories = useMemo(() => [...new Set(pm.filter(p => p.valActu > 0).map(p => p.categorie?.trim() || 'Sans catégorie'))], [pm]);
    const [cat, setCat] = useState('');
    useEffect(() => { if (!categories.includes(cat)) setCat(categories[0] || ''); }, [categories, cat]);
    const catColor = name => PCOLS[Math.abs([...name].reduce((s, ch) => s + ch.charCodeAt(0), 0)) % PCOLS.length];
    const data = useMemo(() => {
        const active = pm.filter(p => p.valActu > 0);
        if (mode === 'categorie') {
            return Object.values(active.reduce((acc, p) => {
                const name = p.categorie?.trim() || 'Sans catégorie';
                const prev = acc[name] || { name, value: 0, fill: catColor(name) };
                return { ...acc, [name]: { ...prev, value: prev.value + p.valActu } };
            }, {}));
        }
        if (mode === 'intra') return active.filter(p => (p.categorie?.trim() || 'Sans catégorie') === cat).map(p => ({ name: p.nom, value: p.valActu, fill: p.couleur }));
        return active.map(p => ({ name: p.nom, value: p.valActu, fill: p.couleur }));
    }, [cat, mode, pm]);
    const total = data.reduce((s, d) => s + d.value, 0);
    const pct = v => total > 0 ? `${((v / total) * 100).toFixed(1)} %` : '0.0 %';
    const TT = { contentStyle: { background: T.dark ? T.s2 : '#fff', border: `1px solid ${T.brd}`, borderRadius: 8, color: T.t1, fontSize: '.73rem', boxShadow: T.dark ? '0 12px 32px rgba(0,0,0,.45)' : '0 12px 32px rgba(0,0,0,.12)' }, itemStyle: { color: T.t1 }, labelStyle: { color: T.t1 }, formatter: v => [`${fEUR(v)} (${pct(v)})`] };
    const pieLabel = ({ cx, cy, midAngle, outerRadius, percent, name }) => {
        if (percent < .08) return null;
        const rad = Math.PI / 180, r = outerRadius + 18, x = cx + r * Math.cos(-midAngle * rad), y = cy + r * Math.sin(-midAngle * rad);
        return <text x={x} y={y} fill={T.t1} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" style={{ fontSize: 11, fontWeight: 700, textShadow: T.dark ? '0 1px 5px #000' : 'none' }}>{name}</text>;
    };
    return (
        <SC title="Répartition" noPad action={<div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <div style={{ display: 'inline-flex', background: T.s2, borderRadius: 8, padding: 2, border: `1px solid ${T.brd}` }}>
                {[['poche', 'Poches'], ['categorie', 'Catégories'], ['intra', 'Intra-cat.']].map(([k, l]) => <button key={k} onClick={() => setMode(k)} style={{ border: 'none', borderRadius: 6, background: mode === k ? T.s1 : 'transparent', color: mode === k ? T.t1 : T.t2, cursor: 'pointer', fontSize: '.62rem', fontWeight: mode === k ? 700 : 500, padding: '.28rem .5rem', minHeight: 30, whiteSpace: 'nowrap' }}>{l}</button>)}
            </div>
            {mode === 'intra' && <select value={cat} onChange={e => setCat(e.target.value)} style={{ background: T.s2, color: T.t1, border: `1px solid ${T.brd}`, borderRadius: 7, fontSize: '.64rem', padding: '.28rem .45rem', outline: 'none' }}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>}
        </div>}>
            <div style={{ padding: '1rem 1.1rem 1.1rem', minHeight: isMobile ? 240 : 310, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {data.length ? (
                    <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                        <PieChart>
                            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={isMobile ? 68 : 82} innerRadius={isMobile ? 38 : 48} paddingAngle={3} strokeWidth={0} label={pieLabel} labelLine={{ stroke: T.t2, strokeWidth: 1 }}>
                                {data.map((e, i) => <Cell key={i} fill={e.fill} />)}
                            </Pie>
                            <RT {...TT} />
                            <Legend verticalAlign="bottom" iconType="circle" iconSize={7} wrapperStyle={{ color: T.t1 }} formatter={(v, entry) => <span style={{ color: T.t1, fontSize: '.72rem', fontWeight: 600 }}>{v} <span style={{ color: T.t2, fontWeight: 500 }}>{pct(entry?.payload?.value || 0)}</span></span>} />
                        </PieChart>
                    </ResponsiveContainer>
                ) : <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.t2, fontSize: '.76rem' }}>Aucune valorisation</div>}
            </div>
        </SC>
    );
}

// ── Poche detail ──
function PocheDetail({ poche, txs, vals, onBack, onDelTx, onDelVal, onDelPoche, setModal }) {
    const T = useT(); const { isMobile, isTablet } = useBreakpoint();
    const [sub, setSub] = useState('apercu');
    const [chartMode, setChartMode] = useState('value');
    const m = useMemo(() => getPocheMetrics(poche.id, txs, vals), [poche, txs, vals]);
    const pv = useMemo(() => vals.filter(v => v.pocheId === poche.id).sort((a, b) => a.date.localeCompare(b.date)), [poche, vals]);
    const pt = useMemo(() => txs.filter(t => t.pocheId === poche.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp)), [poche, txs]);
    const chart = pv.map(v => { const p = perfAtDate([poche.id], txs, v.date, v.valeur), c = capitalAtDate([poche.id], txs, v.date), pct = c > 0.01 ? p / c : null; return { d: v.date.slice(0, 7), v: v.valeur, c, p, pct, pPos: p >= 0 ? p : null, pNeg: p < 0 ? p : null, pctPos: pct != null && pct >= 0 ? pct : null, pctNeg: pct != null && pct < 0 ? pct : null }; });
    const chartDataKey = chartMode === 'value' ? 'v' : chartMode === 'pct' ? 'pct' : 'p';
    const chartLabel = chartMode === 'value' ? 'Valeur' : chartMode === 'pct' ? 'Perf. %' : 'Perf. €';
    const chartFmt = chartMode === 'pct' ? fPctS : fEUR;
    const capColor = T.dark ? '#F8FAFC' : '#111827';
    const lastPoint = chart[chart.length - 1];
    const chartColor = chartMode === 'value' ? VALC : gc(lastPoint?.[chartDataKey]) || poche.couleur;
    const gainPct = m.capital > 0 ? m.gainLatent / m.capital : null;
    const { th, td } = useTS();
    const conf = (msg, fn) => setModal({ type: 'confirm', msg, onOk: fn });

    const kpis = [
        { label: 'Valeur', value: fEUR(m.valActu), sub: `Capital : ${fEUR(m.capital)}`, color: poche.couleur },
        { label: 'Gain', value: fPctS(gainPct), sub: fEURS(m.gainLatent), color: gc(gainPct) },
        { label: 'XIRR', value: fPctS(m.xirr), sub: 'Annualisé net', color: gc(m.xirr), info: XIRR_INFO },
        { label: 'Dietz', value: fPctS(m.dietz), sub: 'Période complète', color: gc(m.dietz), info: DIETZ_INFO },
    ];
    const splitTotal = Math.max(Math.abs(m.gainNonRealise) + Math.abs(m.gainRealise), 1);

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: '1rem', flexWrap: 'wrap' }}>
                <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${T.brd}`, borderRadius: 7, color: T.t2, cursor: 'pointer', fontSize: '.73rem', padding: '.32rem .65rem', minHeight: 36 }}>
                    <ArrowLeft size={11} />Poches
                </button>
                <span style={{ color: T.t3, fontSize: '1.1rem', fontWeight: 200 }}>›</span>
                <button onClick={() => setModal({ type: 'editPoche', poche })} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: T.s2, border: `1px solid ${T.brd}`, borderRadius: 9, color: T.t1, cursor: 'pointer', fontSize: '.78rem', padding: '.32rem .55rem', minHeight: 36 }}>
                    <Dot c={poche.couleur} sz={9} />
                    <span style={{ fontWeight: 700, fontSize: isMobile ? '.85rem' : '.9rem' }}>{poche.nom}</span>
                    {poche.categorie && <Tag label={poche.categorie} color={poche.couleur} />}
                    <Pencil size={11} color={T.t2} />
                </button>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    {!isMobile && <Btn primary onClick={() => setModal({ type: 'saisie', poche: poche.id })}><Plus size={11} />Saisie</Btn>}
                    <Btn danger style={{ padding: '.4rem .7rem', minHeight: 36 }} onClick={() => conf(`Supprimer "${poche.nom}" ?`, () => { onDelPoche(poche.id); onBack(); })}><Trash2 size={isMobile ? 14 : 11} /></Btn>
                </div>
            </div>

            <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${poche.couleur}30`, background: T.s1, boxShadow: `0 0 50px ${poche.couleur}10`, marginBottom: '.8rem', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: T.dark ? `${poche.couleur}05` : `${poche.couleur}03`, pointerEvents: 'none' }} />
                <div style={{ height: 2, background: `linear-gradient(90deg,${poche.couleur}00,${poche.couleur},${poche.couleur}00)` }} />
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', borderBottom: `1px solid ${T.brd}`, position: 'relative', zIndex: 2 }}>
                    {kpis.map((k, i) => (
                        <div key={i} style={{ padding: isMobile ? '.8rem .85rem .7rem' : '.95rem 1rem .8rem', borderRight: !isMobile && i < 3 ? `1px solid ${T.brd}` : 'none', borderBottom: isMobile && i < 2 ? `1px solid ${T.brd}` : 'none' }}>
                            <div style={{ fontSize: '.56rem', color: T.t2, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 2 }}>
                                {k.label}{k.info && <InfoBtn {...k.info} />}
                            </div>
                            <div style={{ fontSize: isMobile ? '1.05rem' : '1.15rem', fontWeight: 700, color: k.color || T.t1, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{k.value}</div>
                            {k.sub && <div style={{ fontSize: '.62rem', color: T.t3, marginTop: 3 }}>{k.sub}</div>}
                        </div>
                    ))}
                </div>
                <div style={{ padding: '.75rem .75rem .85rem', position: 'relative', zIndex: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                        <div style={{ display: 'inline-flex', background: T.s2, borderRadius: 8, padding: 2, border: `1px solid ${T.brd}` }}>
                            {[['perf', 'Perf. €'], ['pct', 'Perf. %'], ['value', 'Valeur']].map(([k, l]) => <button key={k} onClick={() => setChartMode(k)} style={{ border: 'none', borderRadius: 6, background: chartMode === k ? T.s1 : 'transparent', color: chartMode === k ? T.t1 : T.t2, cursor: 'pointer', fontSize: '.62rem', fontWeight: chartMode === k ? 700 : 500, padding: '.28rem .5rem', minHeight: 30 }}>{l}</button>)}
                        </div>
                    </div>
                    <ChartGuide color={chartColor} mode={chartMode} />
                    {chart.length > 1 ? (
                        chartMode === 'value' ? (
                            <ResponsiveContainer width="100%" height={isMobile ? 160 : 195}>
                                <ComposedChart data={chart} margin={{ top: 22, right: 8, left: -18, bottom: 0 }}>
                                    <defs><linearGradient id={`pg${poche.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chartColor} stopOpacity={0.26} /><stop offset="55%" stopColor={chartColor} stopOpacity={0.08} /><stop offset="100%" stopColor={chartColor} stopOpacity={0} /></linearGradient></defs>
                                    <RechartsYearBands data={chart} labelKey="d" />
                                    <CartesianGrid strokeDasharray="3 3" stroke={T.brd} />
                                    <XAxis dataKey="d" tick={{ fill: T.t3, fontSize: 9 }} tickLine={false} axisLine={false} />
                                    <YAxis domain={['auto', 'auto']} tick={{ fill: T.t3, fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                                    <RT contentStyle={{ background: T.dark ? '#0A0A0E' : '#fff', border: `1px solid ${poche.couleur}40`, borderRadius: 8, color: T.t1, fontSize: '.75rem' }} formatter={(v, n) => [chartFmt(v), n === 'c' ? 'Capital investi' : chartLabel]} />
                                    <Area type="monotone" dataKey="v" stroke={chartColor} fill={`url(#pg${poche.id})`} strokeWidth={3} dot={false} activeDot={{ r: 5, fill: chartColor, strokeWidth: 0 }} />
                                    <Line type="monotone" dataKey="c" name="Capital investi" stroke={capColor} strokeOpacity={0.85} strokeWidth={2.5} strokeDasharray="7 5" dot={false} activeDot={{ r: 4, fill: capColor, strokeWidth: 0 }} connectNulls isAnimationActive={false} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        ) : <PerfLineChart data={chart} dataKey={chartDataKey} labelKey="d" height={isMobile ? 160 : 195} pct={chartMode === 'pct'} />
                    ) : <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.t2, fontSize: '.76rem' }}>Ajoutez des valorisations pour afficher le graphique.</div>}
                    {chartMode === 'value' && lastPoint && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 4, fontSize: '.66rem', color: T.t2 }}><span>Capital investi actuel <strong style={{ color: capColor, fontVariantNumeric: 'tabular-nums' }}>{fEUR(lastPoint.c)}</strong></span><span>Écart <strong style={{ color: gc(lastPoint.v - lastPoint.c), fontVariantNumeric: 'tabular-nums' }}>{fEURS(lastPoint.v - lastPoint.c)}</strong></span></div>}
                </div>
            </div>

            <div style={{ display: 'flex', borderBottom: `1px solid ${T.brd}`, marginBottom: '1rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {[['apercu', 'Aperçu'], ['transactions', `Transactions (${pt.length})`], ['valorisations', `Valorisations (${pv.length})`]].map(([k, l]) => (
                    <button key={k} onClick={() => setSub(k)} style={{ padding: '.46rem .9rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '.77rem', fontWeight: sub === k ? 600 : 400, color: sub === k ? T.t1 : T.t2, borderBottom: sub === k ? `2px solid ${ACC}` : '2px solid transparent', marginBottom: -1, transition: 'color .12s', whiteSpace: 'nowrap', minHeight: 40 }}>{l}</button>
                ))}
            </div>

            {sub === 'apercu' && (
                <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '2fr 1fr', gap: '.7rem' }}>
                    <SC title="Récapitulatif annuel"><AnnualTable pid={poche.id} txs={txs} vals={vals} /></SC>
                    <div style={{ display: 'grid', gap: '.7rem' }}>
                        <SC title="Flux">
                            {[{ l: 'Apports', v: fEUR(m.apports), c: null }, { l: 'Retraits', v: fEUR(m.retraits), c: AMB }, { l: 'Dividendes', v: fEUR(m.dividendes), c: GRN }].map(r => (
                                <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.35rem 0', borderBottom: `1px solid ${T.brd}` }}>
                                    <span style={{ fontSize: '.71rem', color: T.t2 }}>{r.l}</span>
                                    <span style={{ fontWeight: 600, fontSize: '.78rem', color: r.c || T.t1, fontVariantNumeric: 'tabular-nums' }}>{r.v}</span>
                                </div>
                            ))}
                        </SC>
                        <SC title="Réalisé / latent">
                            {[{ l: 'Latent', v: m.gainNonRealise, c: poche.couleur }, { l: 'Réalisé', v: m.gainRealise, c: GRN }].map(r => (
                                <div key={r.l} style={{ marginBottom: '.55rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', color: T.t2, marginBottom: 4 }}><span>{r.l}</span><strong style={{ color: gc(r.v), fontVariantNumeric: 'tabular-nums' }}>{fEURS(r.v)}</strong></div>
                                    <div style={{ height: 5, borderRadius: 99, background: T.s3, overflow: 'hidden' }}><div style={{ width: `${Math.min(100, Math.abs(r.v) / splitTotal * 100)}%`, height: '100%', background: r.c, opacity: r.v >= 0 ? 1 : .55 }} /></div>
                                </div>
                            ))}
                        </SC>
                    </div>
                </div>
            )}
            {sub === 'transactions' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '.9rem' }}>
                        <Btn primary onClick={() => setModal({ type: 'saisie', poche: poche.id })}><Plus size={11} />Ajouter</Btn>
                    </div>
                    <TxTimeline txs={pt} onDel={id => conf('Supprimer cette transaction ?', () => onDelTx(id))} />
                </div>
            )}
            {sub === 'valorisations' && (
                <SC title={`Valorisations (${pv.length})`} action={<Btn ghost onClick={() => setModal({ type: 'saisie', poche: poche.id })}><Plus size={11} />Ajouter</Btn>} noPad>
                    <div style={{ padding: '0 1.1rem 1rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr><th style={th}>Date</th><th style={{ ...th, textAlign: 'right' }}>Valeur</th><th style={th} /></tr></thead>
                            <tbody>
                                {!pv.length && <tr><td colSpan={3} style={{ ...td, textAlign: 'center', color: T.t2, padding: '1.5rem' }}>Aucune valorisation.</td></tr>}
                                {[...pv].reverse().map(v => (
                                    <TRow key={v.id}>
                                        <td style={{ ...td, color: T.t2, whiteSpace: 'nowrap' }}><div>{fDt(v.date)}</div>{v.commentaire && <div style={{ fontSize: '.66rem', color: T.t3, marginTop: 3, whiteSpace: 'normal' }}>{v.commentaire}</div>}</td>
                                        <td style={{ ...td, textAlign: 'right', fontWeight: 600, color: poche.couleur }}>{fEUR(v.valeur)}</td>
                                        <td style={td}><button onClick={() => conf('Supprimer cette valorisation ?', () => onDelVal(v.id))} style={{ background: 'none', border: 'none', color: LOSSC, cursor: 'pointer', opacity: .4, lineHeight: 0, padding: 4, minWidth: 32, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={13} /></button></td>
                                    </TRow>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </SC>
            )}
        </div>
    );
}

// ── Dashboard ──
function DemoBanner({ onImport, onEmpty, onKeep }) {
    const T = useT(); const fileRef = useRef(null);
    return (
        <div style={{ border: `1px solid ${AMB}35`, background: T.dark ? `${AMB}12` : `${AMB}0D`, borderRadius: 12, padding: '.7rem .8rem', marginBottom: '.75rem', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 210 }}>
                <div style={{ color: AMB, fontWeight: 800, fontSize: '.76rem', marginBottom: 2 }}>Vous explorez des données de démonstration.</div>
                <div style={{ color: T.t2, fontSize: '.7rem' }}>Elles ne seront pas enregistrées tant que vous ne les utilisez pas comme base.</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Btn ghost onClick={() => fileRef.current?.click()} style={{ minHeight: 32, padding: '.32rem .6rem' }}>Importer</Btn>
                <Btn ghost onClick={onEmpty} style={{ minHeight: 32, padding: '.32rem .6rem' }}>Commencer vierge</Btn>
                <Btn primary onClick={onKeep} style={{ minHeight: 32, padding: '.32rem .6rem' }}>Utiliser comme base</Btn>
                <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={onImport} />
            </div>
        </div>
    );
}
function Dashboard({ pm, gm, ts, vs, ps, setSelP, setModal, dataMode, impJSON, startEmpty, useDemoAsBase }) {
    const T = useT(); const { isMobile, isTablet } = useBreakpoint();
    const { th, thR, td, tdR } = useTS();
    const [sort, setSort] = useState({ key: 'valActu', dir: 'desc' });
    const warnings = useMemo(() => getDataWarnings(ps, ts, vs), [ps, ts, vs]);
    const sortedPm = useMemo(() => {
        const val = (p, key) => key === 'nom' ? (p.nom || '').toLocaleLowerCase('fr-FR') : key === 'gainPct' ? (p.capital > 0 ? p.gainLatent / p.capital : -Infinity) : p[key] ?? -Infinity;
        return [...pm].sort((a, b) => {
            const av = val(a, sort.key), bv = val(b, sort.key);
            const cmp = typeof av === 'string' ? av.localeCompare(bv, 'fr-FR') : av - bv;
            return sort.dir === 'asc' ? cmp : -cmp;
        });
    }, [pm, sort]);
    const sortBy = key => setSort(s => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));
    const H = ({ k, right, children }) => {
        const active = sort.key === k;
        return <th style={right ? thR : th}><span onClick={() => sortBy(k)} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') sortBy(k); }} style={{ background: 'none', border: 'none', padding: 0, margin: 0, color: active ? T.t1 : T.t2, cursor: 'pointer', font: 'inherit', textTransform: 'inherit', letterSpacing: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: right ? 'flex-end' : 'flex-start', width: '100%', minHeight: 30 }}>{children}<span style={{ fontSize: '.55rem', color: active ? ACC : T.t3 }}>{active ? (sort.dir === 'desc' ? '↓' : '↑') : '↕'}</span></span></th>;
    };
    return (
        <div>
            {dataMode === 'demo' && <DemoBanner onImport={impJSON} onEmpty={startEmpty} onKeep={useDemoAsBase} />}
            <HeroBanner gm={gm} ps={ps} vs={vs} ts={ts} />
            <SC title={`Contrôle des données (${warnings.length})`} style={{ marginBottom: '.75rem' }}>
                {warnings.length ? <div style={{ display: 'grid', gap: '.45rem' }}>{warnings.map((w, i) => <div key={i} style={{ fontSize: '.72rem', color: w.level === 'error' ? LOSSC : w.level === 'warn' ? AMB : T.t2, background: w.level === 'error' ? `${LOSSC}10` : w.level === 'warn' ? `${AMB}10` : T.s2, border: `1px solid ${w.level === 'error' ? LOSSC + '30' : w.level === 'warn' ? AMB + '30' : T.brd}`, borderRadius: 8, padding: '.45rem .65rem' }}>{w.text}</div>)}</div> : <div style={{ color: GRN, fontSize: '.75rem' }}>Aucune anomalie évidente détectée.</div>}
            </SC>
            <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '1fr' : '5fr 3fr', gap: '.75rem', marginBottom: '.75rem' }}>
                <SC title="Résumé par poche" noPad>
                    <div style={{ padding: '0 1.1rem 1rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 380 : undefined }}>
                            <thead>
                                <tr>
                                    <H k="nom">Poche</H>
                                    {!isMobile && <H k="capital" right>Capital</H>}
                                    <H k="valActu" right>Valeur</H>
                                    <H k="gainPct" right>Gain %</H>
                                    {!isMobile && <H k="gainLatent" right>Gain €</H>}
                                    <H k="xirr" right>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, width: '100%' }}>
                                            XIRR<InfoBtn {...XIRR_INFO} />
                                        </span>
                                    </H>
                                    {!isMobile && <H k="dietz" right>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, width: '100%' }}>
                                            Dietz<InfoBtn {...DIETZ_INFO} />
                                        </span>
                                    </H>}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedPm.map(p => {
                                    const gp = p.capital > 0 ? p.gainLatent / p.capital : null;
                                    return (
                                        <TRow key={p.id} onClick={() => setSelP(p.id)}>
                                            <td style={td}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Dot c={p.couleur} sz={7} /><span style={{ fontWeight: 600, color: T.t1 }}>{p.nom}</span></span></td>
                                            {!isMobile && <td style={{ ...tdR, color: T.t2 }}>{fEUR(p.capital)}</td>}
                                            <td style={{ ...tdR, fontWeight: 600, color: ACC }}>{fEUR(p.valActu)}</td>
                                            <td style={{ ...tdR, fontWeight: 700, color: gc(gp) }}>{fPctS(gp)}</td>
                                            {!isMobile && <td style={{ ...tdR, fontWeight: 500, color: gc(p.gainLatent) }}>{fEURS(p.gainLatent)}</td>}
                                            <td style={{ ...tdR, fontWeight: 700, color: gc(p.xirr) }}>{fPctS(p.xirr)}</td>
                                            {!isMobile && <td style={{ ...tdR, color: gc(p.dietz) }}>{fPctS(p.dietz)}</td>}
                                        </TRow>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </SC>
                <AllocationChart pm={pm} />
            </div>
            <SC title="Récapitulatif annuel — portefeuille global"><AnnualTable pid="all" txs={ts} vals={vs} /></SC>
        </div>
    );
}

// ── Poches page ──
function PochesPage({ pm, vs, ts, gm, setSelP, setModal }) {
    const T = useT();
    const groups = useMemo(() => pm.reduce((acc, p) => { const k = p.categorie?.trim() || 'Sans catégorie'; return { ...acc, [k]: [...(acc[k] || []), p] }; }, {}), [pm]);
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '.9rem', fontWeight: 700, color: T.t1, letterSpacing: '-.02em' }}>Mes poches</h2>
                    <div style={{ fontSize: '.63rem', color: T.t2, marginTop: 2 }}>{pm.length} poche{pm.length > 1 ? 's' : ''} · Appuyez pour voir le détail</div>
                </div>
                <Btn primary onClick={() => setModal({ type: 'p' })}><Plus size={12} />Nouvelle poche</Btn>
            </div>
            <div style={{ display: 'grid', gap: '1rem' }}>
                {Object.entries(groups).map(([cat, items]) => <div key={cat}>
                    <div style={{ fontSize: '.62rem', color: T.t2, textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 700, marginBottom: '.55rem' }}>{cat}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '.75rem' }}>
                        {items.map(p => <PocheCard key={p.id} p={p} vals={vs} txs={ts} total={gm.tv} onClick={() => setSelP(p.id)} />)}
                    </div>
                </div>)}
                {!pm.length && <div style={{ borderRadius: 12, border: `1px dashed ${T.brd}`, padding: '3rem', textAlign: 'center', color: T.t2, fontSize: '.8rem', gridColumn: '1/-1' }}>Aucune poche. Commencez par en créer une.</div>}
            </div>
        </div>
    );
}

function ExportReminder({ show, onExport }) {
    const T = useT();
    if (!show) return null;
    return (
        <div style={{ border: `1px solid ${AMB}40`, background: T.dark ? `${AMB}12` : `${AMB}0D`, borderRadius: 12, padding: '.65rem .8rem', marginBottom: '.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.t2, fontSize: '.76rem', lineHeight: 1.45 }}>
                <Download size={15} color={AMB} />
                <span><strong style={{ color: T.t1 }}>Changement enregistré localement.</strong> Exportez vos données pour garder un fichier de sauvegarde à jour.</span>
            </div>
            <Btn ghost onClick={onExport} style={{ borderColor: `${AMB}45`, color: AMB, background: `${AMB}10` }}><Download size={12} />Exporter maintenant</Btn>
        </div>
    );
}

// ── App root ──
export default function App() {
    const [mode, setMode] = useState('dark');
    const [page, setPage] = useState('dashboard');
    const [selP, setSelP] = useState(null);
    const [ps, setPs] = useState([]);
    const [ts, setTs] = useState([]);
    const [vs, setVs] = useState([]);
    const [ready, setReady] = useState(false);
    const [dataMode, setDataMode] = useState('empty');
    const [showWelcome, setShowWelcome] = useState(false);
    const [needsExport, setNeedsExport] = useState(false);
    const [modal, setModal] = useState(null);
    const T = useMemo(() => mode === 'dark' ? mkDark() : mkLight(), [mode]);
    const { isMobile } = useBreakpoint();

    useEffect(() => {
        (async () => {
            try {
                const r = await window.storage.get('inv_v9');
                if (r) {
                    const d = JSON.parse(r.value);
                    const hasSavedShape = ['p', 't', 'v', 'poches', 'transactions', 'valorisations'].some(k => Array.isArray(d[k]));
                    if (!hasSavedShape) throw new Error('Format non reconnu');
                    const nextPs = Array.isArray(d.p) ? d.p : Array.isArray(d.poches) ? d.poches : [];
                    const nextTs = Array.isArray(d.t) ? d.t : Array.isArray(d.transactions) ? d.transactions : [];
                    const nextVs = Array.isArray(d.v) ? d.v : Array.isArray(d.valorisations) ? d.valorisations : [];
                    setPs(nextPs); setTs(nextTs); setVs(nextVs); setDataMode(d.source === 'file' ? 'file' : 'saved'); setShowWelcome(false);
                } else {
                    setPs([]); setTs([]); setVs([]); setDataMode('empty'); setShowWelcome(true);
                }
            }
            catch { setPs([]); setTs([]); setVs([]); setDataMode('empty'); setShowWelcome(true); }
            setReady(true);
        })();
    }, []);
    useEffect(() => { if (!ready || showWelcome || dataMode === 'demo') return; window.storage.set('inv_v9', JSON.stringify({ p: ps, t: ts, v: vs, source: dataMode === 'file' ? 'file' : 'saved' })).catch(() => { }); }, [ps, ts, vs, ready, showWelcome, dataMode]);

    const pm = useMemo(() => ps.map(p => ({ ...p, ...getPocheMetrics(p.id, ts, vs) })), [ps, ts, vs]);
    const categories = useMemo(() => [...new Set(ps.map(p => p.categorie?.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr-FR')), [ps]);
    const gm = useMemo(() => {
        const tv = pm.reduce((s, p) => s + p.valActu, 0), tc = pm.reduce((s, p) => s + p.capital, 0), td = pm.reduce((s, p) => s + p.dividendes, 0), tf = pm.reduce((s, p) => s + p.frais, 0), latent = pm.reduce((s, p) => s + p.gainNonRealise, 0), realised = pm.reduce((s, p) => s + p.gainRealise, 0);
        const xCFs = ts.filter(t => ['apport', 'retrait', 'dividende', 'frais'].includes(t.type)).map(t => ({ date: t.timestamp, a: (t.type === 'apport' || t.type === 'frais') ? -t.montant : t.montant }));
        ps.forEach(p => { const pv = vs.filter(v => v.pocheId === p.id).sort((a, b) => a.date.localeCompare(b.date)); if (pv.length && pv[pv.length - 1].valeur > 0) xCFs.push({ date: pv[pv.length - 1].date, a: pv[pv.length - 1].valeur }); });
        return { tv, tc, tg: pm.reduce((s, p) => s + p.gainLatent, 0), td, tf, latent, realised, xirr: xCFs.length >= 2 ? calcXIRR(xCFs) : null };
    }, [pm, ps, ts, vs]);

    const markPersonal = () => { setDataMode(m => m === 'file' ? 'file' : 'saved'); setNeedsExport(true); setShowWelcome(false); };
    const startEmpty = () => { setPs([]); setTs([]); setVs([]); setDataMode('empty'); setNeedsExport(false); setShowWelcome(false); setSelP(null); setPage('dashboard'); };
    const useDemoAsBase = () => { setDataMode('saved'); setNeedsExport(true); setShowWelcome(false); };
    const disconnectFile = async () => {
        if (!window.confirm('Déconnecter ce fichier ? La copie locale sera effacée de ce navigateur.')) return;
        try {
            if (window.storage.remove) await window.storage.remove('inv_v9');
            else window.localStorage?.removeItem('inv_v9');
        } catch { }
        setPs([]); setTs([]); setVs([]); setDataMode('empty'); setNeedsExport(false); setShowWelcome(true); setSelP(null); setPage('dashboard'); setModal(null);
    };

    const handleSaisie = (pocheId, txData, valeur, date, note = '') => {
        markPersonal();
        if (txData) setTs(p => [...p, { id: uid(), type: txData.type, montant: txData.montant, timestamp: date, pocheId, commentaire: txData.commentaire || note }]);
        if (valeur != null) setVs(p => [...p, { id: uid(), pocheId, valeur, date, commentaire: note }]);
        setModal(null);
    };
    const addP = p => { markPersonal(); setPs(pr => [...pr, { ...p, id: uid(), createdAt: TODAY }]); setModal(null); };
    const delP = id => { markPersonal(); setPs(p => p.filter(x => x.id !== id)); setTs(p => p.filter(t => t.pocheId !== id)); setVs(p => p.filter(v => v.pocheId !== id)); };
    const updateP = (id, patch) => { markPersonal(); setPs(p => p.map(x => x.id === id ? { ...x, ...patch } : x)); };
    const delTx = id => { markPersonal(); setTs(p => p.filter(t => t.id !== id)); };
    const delV = id => { markPersonal(); setVs(p => p.filter(v => v.id !== id)); };

    const expJSON = () => {
        try {
            const bl = new Blob([JSON.stringify({ poches: ps, transactions: ts, valorisations: vs }, null, 2)], { type: 'application/json;charset=utf-8' });
            const u = URL.createObjectURL(bl); const a = document.createElement('a');
            a.href = u; a.download = `investtrack_${TODAY}.json`; document.body.appendChild(a); a.click();
            setTimeout(() => { URL.revokeObjectURL(u); document.body.removeChild(a); }, 200);
            setNeedsExport(false);
        } catch (e) { alert('Export échoué : ' + e.message); }
    };
    const impJSON = e => {
        const f = e.target.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = ev => {
            try {
                const d = JSON.parse(ev.target.result);
                const nextPs = Array.isArray(d.poches) ? d.poches : Array.isArray(d.p) ? d.p : null;
                const nextTs = Array.isArray(d.transactions) ? d.transactions : Array.isArray(d.t) ? d.t : null;
                const nextVs = Array.isArray(d.valorisations) ? d.valorisations : Array.isArray(d.v) ? d.v : null;
                if (!nextPs && !nextTs && !nextVs) throw new Error('Format non reconnu');
                setPs(nextPs || []); setTs(nextTs || []); setVs(nextVs || []); setDataMode('file'); setNeedsExport(false); setShowWelcome(false); setSelP(null); setPage('dashboard');
            }
            catch (err) { alert('Fichier invalide : ' + err.message); }
        };
        r.readAsText(f); e.target.value = '';
    };

    const detailPoche = selP ? ps.find(p => p.id === selP) : null;
    const renderModal = () => {
        if (!modal) return null;
        if (modal.type === 'saisie') return <ModalSaisie poches={ps} defPoche={modal.poche} onSave={handleSaisie} onClose={() => setModal(null)} />;
        if (modal.type === 'p') return <ModalPoche onAdd={addP} onClose={() => setModal(null)} count={ps.length} categories={categories} />;
        if (modal.type === 'editPoche') return <ModalEditPoche poche={modal.poche} categories={categories} onSave={(id, patch) => { updateP(id, patch); setModal(null); }} onClose={() => setModal(null)} />;
        if (modal.type === 'confirm') return <ConfirmDel msg={modal.msg} onOk={() => { modal.onOk(); setModal(null); }} onCancel={() => setModal(null)} />;
        return null;
    };

    if (!ready) return <div style={{ background: '#0A0A0E', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3E3E50', fontSize: '.82rem' }}>Chargement…</div>;

    const appBg = mode === 'dark' ? `radial-gradient(ellipse 60% 50% at 8% 92%,${ACC}12 0%,transparent 50%),radial-gradient(ellipse 50% 40% at 92% 8%,rgba(255,100,80,0.07) 0%,transparent 45%),#0A0A0E` : T.bg;
    const mainPb = isMobile ? 'calc(76px + env(safe-area-inset-bottom, 0px))' : '1.25rem';

    return (
        <TC.Provider value={T}>
            <div style={{ minHeight: '100vh', background: appBg, color: T.t1, fontFamily: 'system-ui,-apple-system,sans-serif', fontSize: '13px', lineHeight: 1.5 }}>
                <TopBar page={page} selP={selP} setPage={setPage} setSelP={setSelP} mode={mode} setMode={setMode} setModal={setModal} expJSON={expJSON} impJSON={impJSON} dataMode={dataMode} disconnectFile={disconnectFile} onHome={() => { setSelP(null); setShowWelcome(true); }} />
                <main style={{ maxWidth: 1240, margin: '0 auto', padding: `1.1rem 1rem ${mainPb}` }}>
                    <ExportReminder show={needsExport && !showWelcome} onExport={expJSON} />
                    {detailPoche
                        ? <PocheDetail poche={detailPoche} txs={ts} vals={vs} onBack={() => setSelP(null)} onDelTx={delTx} onDelVal={delV} onDelPoche={delP} setModal={setModal} />
                        : page === 'dashboard'
                            ? <Dashboard pm={pm} gm={gm} ts={ts} vs={vs} ps={ps} setSelP={setSelP} setModal={setModal} dataMode={dataMode} impJSON={impJSON} startEmpty={startEmpty} useDemoAsBase={useDemoAsBase} />
                            : <PochesPage pm={pm} vs={vs} ts={ts} gm={gm} setSelP={setSelP} setModal={setModal} />
                    }
                </main>
            </div>
            {renderModal()}
            {showWelcome && <WelcomeModal onEmpty={startEmpty} canClose={dataMode !== 'empty'} onClose={() => setShowWelcome(false)} mode={mode} setMode={setMode} />}
        </TC.Provider>
    );
}
