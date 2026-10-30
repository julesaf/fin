import { useState, useEffect, useMemo, useRef, useId, createContext, useContext } from "react";
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { ComposedChart, Area, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RT, ResponsiveContainer, Legend, ReferenceArea, ReferenceLine } from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { Plus, Download, Upload, X, Trash2, ArrowLeft, TrendingUp, TrendingDown, Sun, Moon, ArrowUpRight, ArrowDownRight, LayoutDashboard, Layers, Pencil, Check, LogOut, ShieldCheck, CloudOff, PieChart as PieChartIcon, ChartNoAxesCombined, RotateCcw, SlidersHorizontal, ChevronDown, Square, Archive } from "lucide-react";
import {
    ACCENT_COLOR as ACC,
    VALUE_COLOR as VALC,
    GAIN_COLOR as GRN,
    LOSS_COLOR as LOSSC,
    WARNING_COLOR as AMB,
    POCKET_COLORS as PCOLS,
    TRANSACTION_TYPES as TX_IN,
    getTransactionColor as txC,
    getTransactionLabel as txL,
} from "../config/appConstants";
import { DEMO_POCKETS as D_P, DEMO_TRANSACTIONS as D_T, DEMO_VALUATIONS as D_V } from "../data/demoData";
import {
    CURRENT_YEAR as CY,
    TODAY,
    formatDate as fDt,
    formatEuro as fEUR,
    formatPercent as fPctS,
    formatSignedEuro as fEURS,
    getGainColor as gc,
} from "../utils/formatters";
import {
    buildPocketHistory,
    buildPortfolioHistory,
    calculatePerformanceAtDate,
    completeWithdrawalValue,
    estimateWithdrawalValue,
    getAnnualPerformanceRows,
    getPocketMetrics,
    getPortfolioMetrics,
    assertHistoryEditable,
    assertPocketWritable,
    readPortfolioData,
    validatePortfolio,
    validatePocketClosures,
    localToday,
    getPocketValueAtDate,
    isPocketValueEstimatedAtDate,
    prepareContribution,
    prepareWithdrawal,
    type Pocket,
    type PocketMetrics,
    type Transaction,
    type Valuation,
    type WithdrawalValueEstimate,
} from "../domain/portfolioAnalytics";
import { createDarkTheme, createLightTheme } from "../theme/theme";
import { simulate, createSimulationConfig, createSimulationPocket, readSimulationConfig, simulationCsv, type SimulationConfig, type SimulationPocket, type MonteCarloResult } from '../domain/simulation';
import { createPortfolioPersistence, PORTFOLIO_STORAGE_KEY, StorageConflictError } from '../utils/portfolioStorage';

const TC = createContext(createDarkTheme());
const useT = () => useContext(TC);
const uid = () => '_' + Math.random().toString(36).slice(2, 9);

function useBreakpoint() {
    const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
    useEffect(() => { const fn = () => setW(window.innerWidth); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn); }, []);
    return { isMobile: w < 640, isTablet: w < 960, w };
}

// ── Info modal ──
function InfoModal({ onClose, title, lines }) {
    const T = useT();
    const B: CSSProperties = { fontFamily: 'system-ui,-apple-system,sans-serif', textTransform: 'none', letterSpacing: 'normal', fontStyle: 'normal', textAlign: 'left', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: 1.5 };
    const tx1 = T.dark ? '#EAEAF8' : '#111';
    const tx2 = T.dark ? '#8080AA' : '#6666AA';
    const tx3 = T.dark ? '#5050808' : '#9898C0';
    const br = T.dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
    return (
        <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ ...B, position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
            <div role="dialog" aria-modal="true" aria-label={title} style={{ ...B, background: T.dark ? '#1C1C27' : '#fff', border: `1px solid ${br}`, borderRadius: 16, width: 640, maxWidth: '100%', maxHeight: 'calc(100dvh - 24px)', overflowY: 'auto', boxShadow: T.dark ? '0 20px 60px rgba(0,0,0,0.7)' : '0 20px 60px rgba(0,0,0,0.15)', boxSizing: 'border-box' }}>

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
                                        <div key={j} style={{ ...B, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, padding: isLast ? '.55rem .8rem' : '.42rem .8rem', background: isLast ? (T.dark ? `${r.color || GRN}14` : `${r.color || GRN}09`) : (T.dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'), borderTop: j > 0 ? `1px solid ${br}` : 'none' }}>
                                            <span style={{ ...B, fontSize: '.74rem', color: isLast ? (r.color || GRN) : tx2, fontWeight: isLast ? 600 : 400, flex: '1 1 140px', minWidth: 0 }}>{r.label}</span>
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
            <button type="button" aria-label={`Informations : ${title}`} title={title} onClick={e => { e.stopPropagation(); setOpen(true); }} style={{ cursor: 'pointer', width: 24, height: 24, borderRadius: '50%', background: `${ACC}18`, border: `1px solid ${ACC}50`, color: ACC, fontSize: '.7rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, flexShrink: 0, marginLeft: 4, verticalAlign: 'middle', outline: 'none', padding: 0 }}>?</button>
            {open && <InfoModal title={title} lines={lines} onClose={() => setOpen(false)} />}
        </>
    );
}

const XIRR_INFO = {
    title: "XIRR — Rendement annualisé",
    lines: [
        { type: 'text', html: "Le XIRR est votre rendement annuel <strong>réel</strong>, calculé en tenant compte de la date exacte de chaque mouvement d'argent." },
        { type: 'text', html: "Il est indisponible si les flux nets ne couvrent pas au moins deux dates distinctes. Aucun taux arbitraire n'est utilisé dans ce cas." },
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
        { type: 'text', html: "Pour une poche, la période commence à la valeur de fin de la première journée : les mouvements de cette journée sont déjà inclus dans cette valeur." },
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
        { type: 'text', html: "Tous les mouvements de l'année sont inclus. Après la dernière observation, la valeur est ajustée des flux ultérieurs, sans supposer de gain de marché ; elle est alors signalée comme estimée." },
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
    return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, margin: '0 0 .35rem', alignItems: 'center' }}>{item('Valeur suivie', color, false)}{item('Capital investi', capColor, true)}<span style={{ color: T.t3, fontSize: '.61rem' }}>Perf. = valeur - capital + revenus nets</span></div>;
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
    const prices = pv.map(v => calculatePerformanceAtDate([pocheId], txs, v.date, v.valeur)), mn = Math.min(...prices), mx = Math.max(...prices), range = mx - mn || 1;
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

function KpiCard({ label, value, sub, color, hero }: { label: ReactNode; value: ReactNode; sub?: ReactNode; color?: string; hero?: boolean }) {
    const T = useT(); const c = color || T.t1;
    const valStyle: CSSProperties = hero
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

function SC({ title, action, children, style: xs, noPad }: { title?: ReactNode; action?: ReactNode; children: ReactNode; style?: CSSProperties; noPad?: boolean }) {
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

function useTS(): Record<'th' | 'thR' | 'td' | 'tdR', CSSProperties> {
    const T = useT();
    const base: CSSProperties = { borderBottom: `1px solid ${T.brd}`, verticalAlign: 'middle', fontVariantNumeric: 'tabular-nums', fontSize: '.75rem' };
    return {
        th: { ...base, padding: '.42rem .7rem', color: T.t2, fontWeight: 600, fontSize: '.58rem', textTransform: 'uppercase', letterSpacing: '.1em', textAlign: 'left', background: T.s2, whiteSpace: 'nowrap' },
        thR: { ...base, padding: '.42rem .7rem', color: T.t2, fontWeight: 600, fontSize: '.58rem', textTransform: 'uppercase', letterSpacing: '.1em', textAlign: 'right', background: T.s2, whiteSpace: 'nowrap' },
        td: { ...base, padding: '.48rem .7rem' },
        tdR: { ...base, padding: '.48rem .7rem', textAlign: 'right' },
    };
}
function TRow({ onClick, children }: Pick<HTMLAttributes<HTMLTableRowElement>, 'onClick' | 'children'>) {
    const T = useT(); const [h, setH] = useState(false);
    return <tr onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onClick={onClick} style={{ background: h ? `${ACC}08` : 'transparent', cursor: onClick ? 'pointer' : 'default', transition: 'background .1s' }}>{children}</tr>;
}

function AnnualTable({ pid, txs, vals }) {
    const T = useT(); const { th, thR, td, tdR } = useTS(); const { isMobile } = useBreakpoint();
    const rows = useMemo(() => getAnnualPerformanceRows(pid, txs, vals), [pid, txs, vals]);
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
                            <td style={{ ...tdR, fontWeight: 600, color: ACC }}>{fEUR(r.emv)}{r.valueEstimated && <div style={{ fontSize: '.6rem', color: T.t3 }}>Estimée</div>}</td>
                            <td style={{ ...tdR, color: r.netCF >= 0 ? T.t1 : AMB }}>{fEUR(r.netCF)}</td>
                            <td style={{ ...tdR, fontWeight: 600, color: gc(r.perfE) }}>{fEURS(r.perfE)}{r.performanceEstimated && <div style={{ fontSize: '.6rem', color: T.t3 }}>Estimée</div>}</td>
                            <td style={{ ...tdR, fontWeight: 700, color: gc(r.perfPct) }}>{fPctS(r.perfPct)}{r.performanceEstimated && <div style={{ fontSize: '.6rem', color: T.t3 }}>Estimée</div>}</td>
                            {!isMobile && <td style={{ ...tdR, color: gc(r.cumE) }}>{fEURS(r.cumE)}{r.valueEstimated && <div style={{ fontSize: '.6rem', color: T.t3 }}>Estimée</div>}</td>}
                            <td style={{ ...tdR, fontWeight: 700, color: gc(r.cumPct) }}>{fPctS(r.cumPct)}{r.valueEstimated && r.cumPct !== null && <div style={{ fontSize: '.6rem', color: T.t3 }}>Estimée</div>}</td>
                        </TRow>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ── Form helpers ──
function Lbl({ ch }) { const T = useT(); return <label style={{ fontSize: '.68rem', color: T.t2, display: 'block', marginBottom: 4, fontWeight: 500, letterSpacing: '.04em' }}>{ch}</label>; }
function Inp({ style: xs, ...p }: InputHTMLAttributes<HTMLInputElement>) { const T = useT(); return <input style={{ background: T.inp, border: `1px solid ${T.brd}`, borderRadius: 8, color: T.t1, padding: '.52rem .75rem', width: '100%', fontSize: '16px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', fontVariantNumeric: 'tabular-nums', ...(xs || {}) }} {...p} />; }
function Sel({ children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) { const T = useT(); return <select style={{ background: T.inp, border: `1px solid ${T.brd}`, borderRadius: 8, color: T.t1, padding: '.52rem .75rem', width: '100%', fontSize: '16px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} {...p}>{children}</select>; }
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
function Btn({ onClick, primary, danger, ghost, style: xs, children, disabled = false, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean; danger?: boolean; ghost?: boolean }) {
    const T = useT(); const [h, setH] = useState(false);
    let bg, col, brd, sh;
    if (primary) { bg = h ? '#F04060' : ACC; col = '#fff'; brd = 'none'; sh = `0 4px 20px ${ACC}50`; }
    else if (danger) { bg = h ? '#EF4444' : LOSSC; col = '#fff'; brd = 'none'; sh = 'none'; }
    else if (ghost) { bg = 'transparent'; col = T.t2; brd = `1px solid ${T.brd}`; sh = 'none'; }
    else { bg = h ? T.s3 : T.s2; col = T.t1; brd = `1px solid ${T.brd}`; sh = 'none'; }
    return <button type="button" disabled={disabled} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '.44rem .9rem', borderRadius: 8, border: brd, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .45 : 1, fontSize: '.76rem', fontFamily: 'inherit', fontWeight: primary ? 600 : 500, background: bg, color: col, boxShadow: sh, transition: 'all .14s', minHeight: 36, ...(xs || {}) }} {...rest}>{children}</button>;
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
function ModalSaisie({ poches, txs, vals, defPoche, onSave, onClose }) {
    const T = useT();
    const [pocheId, setPocheId] = useState(poches.some(p => p.id === defPoche) ? defPoche : poches[0]?.id || '');
    const [type, setType] = useState('apport');
    const [montant, setMontant] = useState('');
    const [valeur, setValeur] = useState('');
    const [beforeValue, setBeforeValue] = useState('');
    const [revalue, setRevalue] = useState(false);
    const [note, setNote] = useState('');
    const [date, setDate] = useState(localToday);
    const hasTx = montant !== '' && Number.isFinite(Number(montant)) && Number(montant) > 0;
    const hasVal = valeur !== '' && Number.isFinite(Number(valeur)) && Number(valeur) >= 0;
    const withdrawalMode = type === 'retrait';
    const known = vals.filter(v => v.pocheId === pocheId && v.date <= date).sort((a, b) => a.date.localeCompare(b.date)).at(-1);
    const hasKnownValue = !!known || txs.some(transaction => transaction.pocheId === pocheId && transaction.timestamp <= date);
    const knownValue = getPocketValueAtDate(pocheId, txs, vals, date);
    const knownValueEstimated = isPocketValueEstimatedAtDate(pocheId, txs, vals, date);
    let movement = null, entryError = '';
    try {
        assertHistoryEditable(pocheId, date, vals);
        if (montant !== '') movement = withdrawalMode
            ? prepareWithdrawal(pocheId, Number(montant), date, vals, beforeValue === '' ? undefined : Number(beforeValue), txs)
            : prepareContribution(pocheId, Number(montant), date, vals, txs, valeur === '' ? undefined : Number(valeur));
    }
    catch (err) { entryError = err.message; }
    const ok = !!date && !entryError && (valeur === '' || hasVal) && poches.some(p => p.id === pocheId) && (withdrawalMode ? hasTx && !!movement : hasTx && !!movement || montant === '' && hasVal);
    const status = withdrawalMode ? movement ? 'Retrait + valeur restante' : 'Retrait à renseigner' : hasTx ? 'Apport + valeur actualisée' : hasVal ? 'Valorisation uniquement' : 'Remplissez au moins un champ';
    const resetBefore = () => { setBeforeValue(''); setRevalue(false); };
    const save = () => { if (!ok) return; onSave(pocheId, hasTx ? { type, montant: Number(montant), commentaire: note.trim() } : null, !withdrawalMode && hasVal ? Number(valeur) : null, date, note.trim(), withdrawalMode && beforeValue !== '' ? Number(beforeValue) : undefined); };
    return (
        <Sheet title="Nouvelle saisie" onClose={onClose}>
            {!poches.length && <p role="status" style={{ color: T.t2 }}>Aucune poche active.</p>}
            <div style={{ display: 'grid', gap: '.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div><Lbl ch="Poche" /><Sel value={pocheId} onChange={e => { setPocheId(e.target.value); resetBefore(); }}>{poches.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}</Sel></div>
                    <div><Lbl ch="Date" /><Inp type="date" value={date} max={localToday()} onChange={e => { setDate(e.target.value); resetBefore(); }} /></div>
                </div>
                <div style={{ background: T.s2, borderRadius: 10, padding: '.85rem', border: `1px solid ${T.brd}` }}>
                    <div style={{ fontSize: '.58rem', color: T.t2, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: '.65rem' }}>Transaction <span style={{ fontWeight: 400, color: T.t3 }}>{withdrawalMode ? '— obligatoire' : '— optionnel'}</span></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div><Lbl ch="Type" /><Sel value={type} onChange={e => { setType(e.target.value); resetBefore(); }}>{TX_IN.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}</Sel></div>
                        <div><Lbl ch="Montant (€)" /><Inp aria-label="Montant de la transaction" type="number" min="0" step="0.01" value={montant} onChange={e => setMontant(e.target.value)} placeholder="0" /></div>
                    </div>
                </div>
                <div style={{ background: T.s2, borderRadius: 10, padding: '.85rem', border: `1px solid ${T.brd}` }}>
                    {withdrawalMode ? <div style={{ display: 'grid', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <div style={{ color: T.t2, fontSize: '.74rem' }}>Valeur avant retrait{knownValueEstimated ? ' estimée' : ''} <strong style={{ color: T.t1 }}>{hasKnownValue ? fEUR(knownValue) : 'Non renseignée'}</strong>{known && <div style={{ fontSize: '.65rem', color: T.t3 }}>{known.estimee ? 'Dernier solde estimé' : 'Dernière observation'} au {fDt(known.date)}</div>}</div>
                            {!revalue && <Btn ghost onClick={() => setRevalue(true)}><Pencil size={12} />Actualiser</Btn>}
                        </div>
                        {(revalue || !hasKnownValue) && <div><Lbl ch="Valeur actualisée avant retrait (€)" /><Inp aria-label="Valeur actualisée avant retrait" type="number" min="0" step="0.01" value={beforeValue} onChange={e => setBeforeValue(e.target.value)} placeholder={hasKnownValue ? String(knownValue) : '0'} /></div>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, borderTop: `1px solid ${T.brd}`, paddingTop: 10, flexWrap: 'wrap' }}>
                            <span style={{ color: T.t2, fontSize: '.74rem' }}>Valeur après retrait{movement?.estimated ? ' estimée' : ''}</span><output aria-label="Valeur après retrait" style={{ color: T.t1, fontWeight: 700, minHeight: 24 }}>{movement ? fEUR(movement.valueAfter) : 'Non calculable'}</output>
                        </div>
                    </div> : <>
                        <div style={{ fontSize: '.58rem', color: T.t2, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 600, marginBottom: '.65rem' }}>Valorisation <span style={{ fontWeight: 400, color: T.t3 }}>— optionnel</span></div>
                        <Lbl ch={hasTx ? 'Valeur actualisée après apport (€)' : 'Valeur totale de la poche (€)'} /><Inp aria-label="Valeur totale de la poche" type="number" min="0" step="0.01" value={valeur} onChange={e => setValeur(e.target.value)} placeholder={hasTx && movement ? String(movement.valueAfter) : '0'} />
                        {hasTx && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }}><span style={{ color: T.t2, fontSize: '.74rem' }}>Valeur après apport{movement?.estimated ? ' estimée' : ''}</span><output aria-label="Valeur après apport" style={{ color: T.t1, fontWeight: 700, minHeight: 24 }}>{movement ? fEUR(movement.valueAfter) : 'Non calculable'}</output></div>}
                    </>}
                </div>
                {entryError && <div role="alert" style={{ color: AMB, fontSize: '.74rem' }}>{entryError}</div>}
                <div><Lbl ch="Note" /><Inp value={note} onChange={e => setNote(e.target.value)} placeholder="Contexte, objectif, commentaire…" /></div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '.68rem', color: ok ? GRN : T.t3, display: 'flex', alignItems: 'center', gap: 5 }}>{ok && <span style={{ width: 6, height: 6, borderRadius: '50%', background: GRN, display: 'inline-block' }} />}{status}</span>
                    <div style={{ display: 'flex', gap: 6 }}><Btn ghost onClick={onClose}>Annuler</Btn><Btn primary disabled={!ok} onClick={save} style={{ opacity: ok ? 1 : .4 }}>Enregistrer</Btn></div>
                </div>
            </div>
        </Sheet>
    );
}
function ModalPoche({ onAdd, onClose, count, categories = [] }) {
    const [nom, setNom] = useState(''); const [col, setCol] = useState(PCOLS[count % PCOLS.length]);
    const [categorie, setCategorie] = useState('');
    const T = useT();
    const { isMobile } = useBreakpoint();
    return (
        <Sheet title="Nouvelle poche" onClose={onClose}>
            <div style={{ display: 'grid', gap: '.85rem' }}>
                <div><Lbl ch="Nom" /><Inp value={nom} onChange={e => setNom(e.target.value)} placeholder="PEA, CTO, Livret A…" autoFocus={!isMobile} /></div>
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
    const { isMobile } = useBreakpoint();
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
                <div><Lbl ch="Nom" /><Inp value={nom} onChange={e => setNom(e.target.value)} autoFocus={!isMobile} /></div>
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
function ModalClosePocket({ poche, txs, vals, onSave, onClose }) {
    const T = useT();
    const [date, setDate] = useState(() => vals.filter(v => v.pocheId === poche.id).map(v => v.date).sort().pop() || localToday());
    let error = '';
    try { validatePocketClosures([{ ...poche, closedAt: date }], txs, vals); }
    catch (err) { error = err.message; }
    return (
        <Sheet title={`Clôturer « ${poche.nom} »`} onClose={onClose}>
            <div style={{ display: 'grid', gap: 14 }}>
                <div><Lbl ch="Date de clôture" /><Inp type="date" value={date} max={localToday()} onChange={event => setDate(event.target.value)} /></div>
                {error ? <p role="alert" style={{ color: AMB, margin: 0 }}>{error}</p> : <p style={{ color: T.t2, margin: 0 }}>Les opérations seront en lecture seule. L’historique et le résultat final seront conservés.</p>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><Btn ghost onClick={onClose}>Annuler</Btn><Btn primary disabled={!!error} onClick={() => { if (!error) onSave(poche.id, date); }}><Archive size={13} />Confirmer la clôture</Btn></div>
            </div>
        </Sheet>
    );
}

function ModalRepairHistory({ poches, txs, pocheId, transaction, vals, onSave, onReopen, onClose, persistenceNotice }) {
    const T = useT();
    const fieldId = useId();
    const [selected, setSelected] = useState(transaction || null);
    const [value, setValue] = useState('');
    const [entryMode, setEntryMode] = useState('confirmed');
    const [estimateAccepted, setEstimateAccepted] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [notice, setNotice] = useState('');
    const groups = poches.filter(pocket => !pocheId || pocket.id === pocheId).map(pocket => ({
        pocket,
        entries: txs.map((entry, index) => ({ entry, index })).filter(({ entry }) => entry.pocheId === pocket.id && entry.type === 'retrait' && (entry.valeurAvant === undefined || entry.valeurAvantEstimation))
            .sort((a, b) => a.entry.timestamp.localeCompare(b.entry.timestamp)),
    })).filter(group => group.entries.length > 0);
    const pendingCount = groups.reduce((count, group) => count + group.entries.length, 0);
    const estimatedCount = groups.reduce((count, group) => count + group.entries.filter(({ entry }) => entry.valeurAvantEstimation).length, 0);
    const selectedPocket = selected ? poches.find(pocket => pocket.id === selected.pocheId) : null;
    const proposal = selected ? estimateWithdrawalValue(txs, vals, selected) : null;
    const estimating = entryMode === 'estimated';
    const chosenValue = estimating ? proposal?.valueBefore : value === '' ? undefined : Number(value);
    let valueError = '';
    if (selected && chosenValue !== undefined) {
        try { completeWithdrawalValue(poches, txs, vals, selected, chosenValue, estimating ? proposal : undefined); }
        catch (err) { valueError = err.message; }
    }
    const canSave = !!selected && !!selectedPocket && !selectedPocket.closedAt && chosenValue !== undefined && !valueError && (!estimating || estimateAccepted);
    const back = () => { setSelected(null); setValue(''); setSaveError(''); setEntryMode('confirmed'); setEstimateAccepted(false); };
    const save = () => {
        if (!canSave) return;
        const error = onSave(selected, chosenValue, estimating ? proposal : undefined);
        if (error) { setSaveError(error); return; }
        back(); setNotice(estimating ? 'Estimation historique acceptée.' : 'Valeur historique confirmée.');
    };
    return <Sheet title="Compléter l’historique" onClose={onClose}>
        <div role="dialog" aria-modal="true" aria-label="Compléter l’historique" style={{ display: 'grid', gap: 14, minWidth: 0, overflowWrap: 'anywhere' }}>
            {persistenceNotice}
            {selected ? <>
                <div style={{ display: 'grid', gap: 5 }}>
                    <strong style={{ color: T.t1, fontSize: '.85rem' }}>{selectedPocket?.nom || 'Poche'}</strong>
                    <div style={{ color: T.t2, fontSize: '.77rem' }}>Retrait du {fDt(selected.timestamp)} · {fEUR(selected.montant)}</div>
                    {selected.commentaire && <div style={{ color: T.t3, fontSize: '.72rem' }}>{selected.commentaire}</div>}
                    {selected.valeurAvantEstimation && <div style={{ color: AMB, fontSize: '.73rem' }}>Valeur estimée enregistrée : {fEUR(selected.valeurAvant)} · source du {fDt(selected.valeurAvantEstimation.sourceDate)} : {fEUR(selected.valeurAvantEstimation.sourceValue)}</div>}
                </div>
                {selectedPocket?.closedAt ? <>
                    <div style={{ color: T.t2, fontSize: '.75rem' }}>Poche clôturée le {fDt(selectedPocket.closedAt)} · Opérations en lecture seule</div>
                    <Btn ghost onClick={() => onReopen(selectedPocket)}><RotateCcw size={13} />Rouvrir la poche</Btn>
                </> : <>
                    <Segmented label="Origine de la valeur" value={entryMode} options={[{ value: 'confirmed', label: 'Valeur confirmée' }, { value: 'estimated', label: 'Valeur inconnue' }]} onChange={mode => { setEntryMode(mode); setEstimateAccepted(false); setSaveError(''); }} />
                    {estimating ? proposal ? <div style={{ display: 'grid', gap: 10 }}>
                        <div style={{ color: T.t2, fontSize: '.74rem' }}>Valeur avant retrait estimée <output aria-label="Valeur avant retrait estimée" style={{ display: 'block', color: T.t1, fontSize: '1.2rem', fontWeight: 700 }}>{fEUR(proposal.valueBefore)}</output></div>
                        <div style={{ color: T.t2, fontSize: '.74rem', lineHeight: 1.6 }}>
                            {proposal.method === 'after-withdrawal' ? 'Reconstitution depuis le solde du jour, en annulant le retrait et les mouvements suivants du même jour.' : 'Solde antérieur ajusté des apports et retraits jusqu’à ce retrait.'}
                            <div>Source : {fEUR(proposal.sourceValue)} au {fDt(proposal.sourceDate)}.</div>
                            <div style={{ color: AMB }}>Hypothèse : aucune variation de marché entre les mouvements. Ce montant n’est pas une valorisation confirmée.</div>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: T.t2, fontSize: '.74rem', lineHeight: 1.5, cursor: 'pointer' }}><input type="checkbox" aria-label="J’accepte cette estimation" checked={estimateAccepted} onChange={event => setEstimateAccepted(event.target.checked)} style={{ marginTop: 3, flexShrink: 0, accentColor: ACC }} /><span>J’accepte cette estimation et son utilisation dans les indicateurs concernés.</span></label>
                    </div> : <div role="status" style={{ color: AMB, fontSize: '.75rem', lineHeight: 1.6 }}>Estimation indisponible : aucun solde de référence suffisant ne permet un calcul cohérent. Aucune valeur ne sera inventée.</div> : <div>
                        <label htmlFor={fieldId} style={{ fontSize: '.73rem', color: T.t2, display: 'block', marginBottom: 6 }}>Valeur de la poche avant le retrait (€)</label>
                        <Inp id={fieldId} aria-describedby={`${fieldId}-source${valueError || saveError ? ` ${fieldId}-error` : ''}`} autoFocus type="number" inputMode="decimal" min={selected.montant} step="0.01" value={value} onChange={event => { setValue(event.target.value); setSaveError(''); }} />
                        <div id={`${fieldId}-source`} style={{ color: T.t3, fontSize: '.68rem', marginTop: 6 }}>Valeur historique figurant sur le relevé, avant ce retrait.</div>
                    </div>}
                </>}
                {(valueError || saveError) && <div id={`${fieldId}-error`} role="alert" style={{ color: AMB, fontSize: '.74rem' }}>{valueError || saveError}</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
                    <Btn ghost onClick={back}>Annuler</Btn>
                    {!selectedPocket?.closedAt && <Btn primary disabled={!canSave} onClick={save}><Check size={13} />{estimating ? 'Accepter l’estimation' : 'Enregistrer'}</Btn>}
                </div>
            </> : <>
                {notice && !persistenceNotice && <div role="status" style={{ color: GRN, fontSize: '.76rem', display: 'flex', alignItems: 'center', gap: 6 }}><Check size={14} />{notice}</div>}
                <div style={{ color: T.t2, fontSize: '.76rem' }}>{pendingCount ? `${pendingCount - estimatedCount} retrait(s) sans valeur · ${estimatedCount} estimation(s) à confirmer` : 'Tous les retraits ont une valeur confirmée.'}</div>
                {groups.map(({ pocket, entries }) => <section key={pocket.id} aria-label={pocket.nom || 'Poche'} style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingBottom: 8, borderBottom: `1px solid ${T.brd}` }}>
                        <strong style={{ fontSize: '.82rem', color: T.t1 }}>{pocket.nom || 'Poche'}</strong>
                        {pocket.closedAt && <Btn ghost title="Rouvrir la poche avant correction" onClick={() => onReopen(pocket)}><RotateCcw size={13} />Rouvrir la poche</Btn>}
                    </div>
                    {pocket.closedAt && <div style={{ color: T.t3, fontSize: '.7rem', paddingTop: 8 }}>Clôturée le {fDt(pocket.closedAt)} · Lecture seule</div>}
                    {entries.map(({ entry, index }) => <div key={index} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: `1px solid ${T.brd}` }}>
                        <div style={{ minWidth: 0 }}><div style={{ fontSize: '.75rem', color: T.t1 }}>{fDt(entry.timestamp)} · {fEUR(entry.montant)}</div>{entry.valeurAvantEstimation && <div style={{ color: AMB, fontSize: '.68rem', marginTop: 3 }}>Valeur estimée : {fEUR(entry.valeurAvant)}</div>}{entry.commentaire && <div style={{ fontSize: '.68rem', color: T.t3, marginTop: 3 }}>{entry.commentaire}</div>}</div>
                        <Btn ghost disabled={!!pocket.closedAt} aria-label={`${entry.valeurAvantEstimation ? 'Confirmer la valeur du retrait' : 'Compléter le retrait'} du ${fDt(entry.timestamp)} de ${pocket.nom || 'la poche'} (${index + 1})`} onClick={() => { setSelected(entry); setValue(''); setSaveError(''); setNotice(''); setEntryMode('confirmed'); setEstimateAccepted(false); }}><Pencil size={12} />{entry.valeurAvantEstimation ? 'Confirmer' : 'Compléter'}</Btn>
                    </div>)}
                </section>)}
            </>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${T.brd}`, paddingTop: 10 }}><Btn ghost onClick={onClose}>Fermer</Btn></div>
        </div>
    </Sheet>;
}

function ConfirmDel({ msg, onOk, onCancel, title = 'Confirmer', okLabel = 'Supprimer', danger = true }) {
    return (
        <Sheet title={title} onClose={onCancel}>
            <div style={{ textAlign: 'center', padding: '.5rem 0' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${LOSSC}15`, border: `1px solid ${LOSSC}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto .9rem', fontSize: '1.3rem' }}>⚠️</div>
                <p style={{ fontSize: '.8rem', lineHeight: 1.75, marginBottom: '1.4rem' }}>{msg}</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}><Btn ghost onClick={onCancel}>Annuler</Btn><Btn danger={danger} primary={!danger} onClick={onOk}>{okLabel}</Btn></div>
            </div>
        </Sheet>
    );
}
function LandingDemoMockup() {
    const T = useT(); const { isMobile } = useBreakpoint();
    const ps = D_P, ts = D_T, vs = D_V;
    const pm = useMemo(() => ps.map(p => ({ ...p, ...getPocketMetrics(p.id, ts, vs) })), [ps, ts, vs]);
    const gm = useMemo(() => getPortfolioMetrics(ps, ts, vs, pm), [pm, ps, ts, vs]);
    const noop = () => { };
    return (
        <div style={{ background: T.dark ? 'radial-gradient(ellipse 60% 50% at 8% 92%,rgba(232,54,74,.07) 0%,transparent 50%),#0A0A0E' : T.bg, color: T.t1, fontFamily: 'system-ui,-apple-system,sans-serif', fontSize: 13, lineHeight: 1.5, overflow: 'visible' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '.55rem 1rem', borderBottom: `1px solid ${T.brd}`, background: T.dark ? 'rgba(10,10,14,.95)' : T.s1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}><div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg,${ACC},#FF6B6B)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.6rem', fontWeight: 900, color: '#fff', flexShrink: 0 }}>IT</div><strong style={{ color: T.t1, fontSize: '.82rem' }}>InvestTrack</strong></div>
                {!isMobile && <div style={{ display: 'inline-flex', background: T.s2, borderRadius: 10, padding: 3, gap: 2, marginLeft: 8 }}><span style={{ padding: '.3rem 1rem', borderRadius: 8, background: T.s1, color: T.t1, fontSize: '.77rem', fontWeight: 700 }}>Dashboard</span><span style={{ padding: '.3rem 1rem', borderRadius: 8, color: T.t2, fontSize: '.77rem' }}>Poches</span><span style={{ padding: '.3rem 1rem', borderRadius: 8, color: T.t2, fontSize: '.77rem' }}>Simulation</span></div>}
                <div style={{ flex: 1 }} />
                {!isMobile && <><Btn ghost style={{ padding: '.36rem .75rem' }}><Download size={11} />Export</Btn><Btn primary style={{ padding: '.36rem .8rem' }}><Plus size={11} />Saisie</Btn></>}
            </div>
            {isMobile && <div style={{ display: 'flex', gap: 4, padding: '.5rem .75rem', borderBottom: `1px solid ${T.brd}` }}>{['Dashboard', 'Poches', 'Simulation'].map(label => <span key={label} style={{ flex: 1, textAlign: 'center', padding: '.4rem 0', borderRadius: 8, fontSize: '.7rem', background: label === 'Dashboard' ? T.s2 : 'transparent', color: label === 'Dashboard' ? T.t1 : T.t2, fontWeight: label === 'Dashboard' ? 700 : 400 }}>{label}</span>)}</div>}
            <div style={{ padding: isMobile ? '.75rem' : '1.1rem 1rem 2rem' }}>
                <Dashboard pm={pm} gm={gm} ts={ts} vs={vs} ps={ps} setSelP={noop} setModal={noop} dataMode="landing" impJSON={noop} startEmpty={noop} useDemoAsBase={noop} />
            </div>
        </div>
    );
}

function WelcomeModal({ onEmpty, canClose, onClose, mode, setMode }) {
    const T = useT(); const { isMobile, isTablet } = useBreakpoint();
    const revealStyle = { opacity: 1, transform: 'translateY(0)', transition: 'all .8s cubic-bezier(.2,.8,.2,1)' };
    const openApp = () => canClose ? onClose() : onEmpty();
    const disableDemoCinematic = isTablet;
    const landingRef = useRef(null);
    const demoPreviewRef = useRef(null);
    const pinRef = useRef(null);
    const targetRef = useRef(0);
    const easedRef = useRef(0);
    const rafRef = useRef(0);
    const [demoProgress, setDemoProgress] = useState(0);
    const [intro, setIntro] = useState(0);
    const INTRO_PHASE = 0.1;
    const EASING_FACTOR = 0.28;
    const DEMO_SCROLL_GAIN = 1.45;

    const forwardPreviewWheel = e => {
        if (disableDemoCinematic) return;
        const scroller = landingRef.current;
        if (!scroller) return;
        e.preventDefault();
        scroller.scrollTop += e.deltaY;
    };

    useEffect(() => {
        const scroller = landingRef.current;
        const pin = pinRef.current;
        if (!scroller || !pin) return;
        if (disableDemoCinematic) {
            setIntro(1);
            setDemoProgress(0);
            return;
        }

        const computeTarget = () => {
            const vh = scroller.clientHeight || window.innerHeight;
            // How far the tall pin section has travelled past the top of the viewport.
            const travelled = -pin.offsetTop + scroller.scrollTop;
            const total = pin.offsetHeight - vh; // scrollable distance while pinned
            const raw = total > 0 ? travelled / total : 0;
            targetRef.current = Math.max(0, Math.min(1, raw));
            if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
        };

        const tick = () => {
            // Critically-damped easing toward the target -> smooth Apple-like glide.
            const diff = targetRef.current - easedRef.current;
            easedRef.current += diff * EASING_FACTOR;
            if (Math.abs(diff) < 0.0005) easedRef.current = targetRef.current;

            const p = easedRef.current;
            const introP = Math.max(0, Math.min(1, p / INTRO_PHASE));
            const scrollP = Math.max(0, Math.min(1, ((p - INTRO_PHASE) / (1 - INTRO_PHASE)) * DEMO_SCROLL_GAIN));

            setIntro(introP);
            setDemoProgress(scrollP);

            const demo = demoPreviewRef.current;
            if (demo) {
                const max = demo.scrollHeight - demo.clientHeight;
                if (max > 2) demo.scrollTop = scrollP * max;
            }

            if (Math.abs(targetRef.current - easedRef.current) > 0.0005) {
                rafRef.current = requestAnimationFrame(tick);
            } else {
                rafRef.current = 0;
            }
        };

        computeTarget();
        scroller.addEventListener('scroll', computeTarget, { passive: true });
        window.addEventListener('resize', computeTarget);
        return () => {
            scroller.removeEventListener('scroll', computeTarget);
            window.removeEventListener('resize', computeTarget);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
        };
    }, [disableDemoCinematic]);

    // Luxury-style motion: no zoom, only subtle depth and parallax.
    const cardScale = 1;
    const cardTilt = (1 - intro) * 4.5;
    const cardLift = (1 - intro) * 22;
    const cardOpacity = 0.8 + 0.2 * intro;
    const shellLift = (1 - intro) * 18 - demoProgress * 10;
    const shellGlow = 0.18 + intro * 0.24;
    const headerParallax = demoProgress * 10;
    const previewParallax = 14 + demoProgress * 26;
    const previewShadow = 28 + demoProgress * 30;
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
        { Icon: ChartNoAxesCombined, title: 'Votre épargne face aux crises', text: 'Projetez votre patrimoine et vos revenus nets futurs avec plusieurs poches simulées. Comparez une évolution sans crises à différents scénarios de marché, sans modifier vos placements réels.', color: VALC },
        { cls: 'large', Icon: Layers, title: 'Séparez les apports des gains', text: 'Voir son solde augmenter c\'est bien, mais InvestTrack distingue clairement ce que vous avez versé de ce que vos placements ont généré.' },
    ];
    return (
        <div ref={landingRef} style={{ position: 'fixed', inset: 0, width: '100vw', zIndex: 220, background: L.bg, color: L.text, overflowY: 'auto', overflowX: 'hidden', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', lineHeight: 1.6 }}>
            <style>{`
                .landing-scrollbar{scrollbar-width:thin;scrollbar-color:${ACC}55 transparent}
                .landing-scrollbar::-webkit-scrollbar{width:8px;height:8px}.landing-scrollbar::-webkit-scrollbar-thumb{background:${ACC}55;border-radius:99px}.landing-scrollbar::-webkit-scrollbar-track{background:transparent}
                .landing-demo-pin{position:relative;height:220vh}.landing-demo-sticky{position:sticky;top:0;height:100vh;display:flex;align-items:center;justify-content:center;padding:0 1rem;box-sizing:border-box}.landing-demo-shell{width:100%;max-width:1180px;perspective:1400px;position:relative}
                @media (max-width: 960px){.landing-demo-pin{height:auto;margin-bottom:3.5rem}.landing-demo-sticky{position:relative;top:auto;height:auto;padding:0 .75rem}.landing-demo-shell{max-width:calc(100vw - 1.5rem)!important}.landing-demo-card{transform:none!important;opacity:1!important;border-radius:16px!important}.landing-app-preview{max-height:none!important;overflow:visible!important;transform:none!important;touch-action:pan-y!important}.landing-section{padding-top:4rem!important;padding-bottom:4rem!important}.landing-trust-grid{gap:1rem!important}.landing-bento{grid-template-columns:1fr!important}.landing-feature-large{grid-column:auto!important}.landing-feature-card{min-height:220px!important;padding:2rem 1.5rem!important}.landing-feature-card p{max-width:100%!important}.landing-demo-side{display:none!important}}
                @media (max-width: 640px){.landing-hero{padding:3.25rem .9rem 2rem!important}.landing-hero h1{font-size:clamp(2.35rem,14vw,3.55rem)!important;line-height:1.02!important}.landing-hero p{font-size:1rem!important}.landing-nav{padding:.85rem 1rem!important}.landing-open-label{display:none!important}.landing-demo-windowbar{padding:.7rem!important}.landing-section{padding-left:.9rem!important;padding-right:.9rem!important}.landing-footer{justify-content:center!important;text-align:center!important}}
                @media (max-width: 430px){.landing-brand-text{display:none!important}.landing-demo-shell{padding:0 .6rem!important;max-width:100vw!important}.landing-feature-card{min-height:200px!important}}
            `}</style>
            <div style={{ position: 'absolute', width: 800, height: 800, background: `radial-gradient(circle, ${ACC}${T.dark ? '66' : '30'} 0%, rgba(0,0,0,0) 60%)`, top: -300, left: '50%', transform: 'translateX(-50%)', filter: 'blur(90px)', pointerEvents: 'none', opacity: T.dark ? .5 : .75 }} />
            <nav className="landing-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: isMobile ? '1rem' : '1.5rem 2rem', maxWidth: 1200, width: '100%', margin: '0 auto', position: 'sticky', top: 0, zIndex: 5, boxSizing: 'border-box', background: T.dark ? 'rgba(10,10,14,.72)' : 'rgba(247,246,252,.74)', borderBottom: `1px solid ${L.border}`, backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, color: L.text, fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-.03em' }}><div style={{ width: 32, height: 32, flex: '0 0 auto', background: `linear-gradient(135deg,${ACC},#FF6B6B)`, color: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', fontWeight: 900, boxShadow: `0 0 16px ${ACC}66` }}>IT</div><span className="landing-brand-text" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>InvestTrack</span></div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
                    <button type="button" onClick={() => setMode(m => m === 'dark' ? 'light' : 'dark')} title="Changer de thème" aria-label="Changer de thème" style={{ width: 36, height: 36, flex: '0 0 auto', borderRadius: 10, border: `1px solid ${L.border}`, background: L.surfaceSoft, color: L.textSoft, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{mode === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
                    <button type="button" onClick={openApp} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: isMobile ? '.55rem .8rem' : '.5rem 1rem', borderRadius: 12, fontWeight: 600, fontSize: isMobile ? '.78rem' : '.85rem', cursor: 'pointer', background: L.surfaceSoft, border: `1px solid ${L.border}`, color: L.text, whiteSpace: 'nowrap' }}><span className="landing-open-label">Ouvrir l'app</span><ArrowUpRight size={14} /></button>
                    {canClose && <button type="button" onClick={onClose} title="Fermer" aria-label="Fermer" style={{ width: 36, height: 36, flex: '0 0 auto', borderRadius: 10, border: `1px solid ${L.border}`, background: L.surfaceSoft, color: L.textSoft, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>}
                </div>
            </nav>

            <header className="landing-hero" style={{ textAlign: 'center', padding: isMobile ? '4rem 1rem 2rem' : '6rem 1rem 4rem', maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
                <div style={{ ...revealStyle, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '.4rem 1rem', background: L.surfaceSoft, border: `1px solid ${L.border}`, borderRadius: 99, fontSize: '.8rem', fontWeight: 500, color: L.textSoft, marginBottom: '2rem' }}><span style={{ color: GRN }}>●</span> 100% privé - 100% gratuit</div>
                <h1 style={{ ...revealStyle, transitionDelay: '100ms', fontSize: 'clamp(2.5rem,5vw,4.5rem)', fontWeight: 900, letterSpacing: '-.04em', lineHeight: 1.1, margin: '0 auto 1.5rem', maxWidth: 1000, color: L.text, textShadow: T.dark ? '0 10px 40px rgba(255,255,255,.08)' : '0 10px 40px rgba(30,30,60,.08)' }}>Tout votre patrimoine réuni.<br />Votre vraie rentabilité révélée.</h1>
                <p style={{ ...revealStyle, transitionDelay: '200ms', fontSize: 'clamp(1rem,2vw,1.25rem)', color: L.textSoft, maxWidth: 700, margin: '0 auto 2.5rem', lineHeight: 1.6 }}>PEA, cryptos, immobilier... Suivez vos placements, mesurez leur rentabilité et projetez votre patrimoine ainsi que vos revenus nets face aux crises. Vos données restent sur votre appareil.</p>
                <div style={{ ...revealStyle, transitionDelay: '300ms', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <button onClick={openApp} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '.75rem 1.5rem', borderRadius: 12, fontWeight: 600, fontSize: '.95rem', cursor: 'pointer', background: ACC, color: '#fff', border: 'none', boxShadow: `0 4px 20px ${ACC}66` }}>Ouvrir l'application</button>
                </div>
            </header>

            <section className="landing-demo-pin" ref={pinRef}>
                <div className="landing-demo-sticky">
                    <div className="landing-demo-shell" style={{ transform: disableDemoCinematic ? 'none' : `translateY(${shellLift}px)`, willChange: disableDemoCinematic ? undefined : 'transform' }}>
                        {!disableDemoCinematic && <div aria-hidden="true" style={{ position: 'absolute', inset: '-7% 6% auto', height: '75%', background: `radial-gradient(circle at 50% 15%, ${ACC}${T.dark ? '30' : '20'} 0%, rgba(0,0,0,0) 68%)`, opacity: shellGlow, filter: 'blur(48px)', pointerEvents: 'none' }} />}
                        <div className="landing-demo-card" style={{ width: '100%', maxWidth: '100%', background: L.surface, border: `1px solid ${L.border}`, borderRadius: 24, boxShadow: L.shadow, overflow: 'hidden', transformStyle: 'preserve-3d', transformOrigin: 'center 75%', opacity: disableDemoCinematic ? 1 : cardOpacity, transform: disableDemoCinematic ? 'none' : `perspective(1400px) rotateX(${cardTilt}deg) translateY(${cardLift}px) scale(${cardScale})`, willChange: disableDemoCinematic ? undefined : 'transform, opacity' }}>
                            <div className="landing-demo-windowbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '1rem', borderBottom: `1px solid ${L.border}`, background: L.surfaceSoft, transform: disableDemoCinematic ? 'none' : `translateY(${headerParallax}px)`, willChange: disableDemoCinematic ? undefined : 'transform' }}>
                                <div style={{ display: 'flex', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F56' }} /><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }} /><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27C93F' }} /></div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                    <span style={{ color: L.textFaint, fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Démo interactive</span>
                                    <span style={{ color: ACC, fontSize: '.72rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums', minWidth: 38, textAlign: 'right' }}>{Math.round(demoProgress * 100)}%</span>
                                </div>
                            </div>
                            <div style={{ height: 3, background: T.dark ? 'rgba(255,255,255,.05)' : 'rgba(10,10,20,.06)' }}><div style={{ width: `${demoProgress * 100}%`, height: '100%', background: `linear-gradient(90deg,${ACC},#FF6B6B)`, boxShadow: `0 0 ${12 + demoProgress * 12}px ${ACC}88` }} /></div>
                            <div ref={demoPreviewRef} onWheelCapture={forwardPreviewWheel} className="landing-app-preview landing-scrollbar" style={{ maxHeight: disableDemoCinematic ? 'none' : 'min(82vh,920px)', overflow: disableDemoCinematic ? 'visible' : 'hidden', WebkitOverflowScrolling: 'touch', overscrollBehavior: disableDemoCinematic ? 'auto' : 'contain', touchAction: 'pan-y', transform: disableDemoCinematic ? 'none' : `translateY(-${previewParallax}px)`, willChange: disableDemoCinematic ? undefined : 'transform', boxShadow: disableDemoCinematic ? undefined : `0 ${previewShadow}px 80px rgba(0,0,0,${T.dark ? 0.32 : 0.12}) inset` }}><LandingDemoMockup /></div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="landing-section" style={{ padding: '6rem 1rem', maxWidth: 1100, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}><h2 style={{ fontSize: 'clamp(2rem,4vw,2.5rem)', fontWeight: 800, letterSpacing: '-.03em', margin: '0 0 1rem', color: L.text }}>Une intimité totale sur vos finances.</h2><p style={{ fontSize: 'clamp(1rem,2vw,1.25rem)', color: L.textSoft, maxWidth: 700, margin: '0 auto', lineHeight: 1.6 }}>Pas de création de compte. Pas de synchronisation bancaire requise. Vous gardez le contrôle total.</p></div>
                <div className="landing-trust-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '2rem' }}>
                    {trust.map(item => <div key={item.title} style={{ textAlign: 'center', padding: '2rem', background: L.surfaceSoft, borderRadius: 20, border: `1px solid ${L.border}` }}><div style={{ width: 56, height: 56, background: L.surfaceSoft, border: `1px solid ${L.border}`, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: VALC }}><item.Icon size={27} /></div><h3 style={{ fontSize: '1.2rem', margin: '0 0 .5rem', color: L.text }}>{item.title}</h3><p style={{ color: L.textSoft, fontSize: '.95rem', margin: 0 }}>{item.text}</p></div>)}
                </div>
            </section>

            <section className="landing-section" style={{ padding: '6rem 1rem', maxWidth: 1100, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}><h2 style={{ fontSize: 'clamp(2rem,4vw,2.5rem)', fontWeight: 800, letterSpacing: '-.03em', margin: 0, color: L.text }}>Des indicateurs puissants, expliqués simplement.</h2></div>
                <div className="landing-bento" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridAutoRows: 'minmax(280px,auto)', gap: '1.5rem' }}>
                    {features.map(item => <div key={item.title} className={`landing-feature-card ${item.cls === 'large' ? 'landing-feature-large' : ''}`} style={{ gridColumn: item.cls === 'large' ? 'span 2' : 'auto', background: L.surface, border: `1px solid ${L.border}`, borderRadius: 24, padding: '2.5rem 2rem', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: 280 }}><div style={{ alignSelf: 'flex-end', flexShrink: 0, marginBottom: 16, color: item.color || ACC, background: `${item.color || ACC}1A`, padding: '1rem', borderRadius: 16 }}><item.Icon size={32} /></div><h3 style={{ fontSize: '1.4rem', margin: '0 0 .5rem', position: 'relative', color: L.text }}>{item.title}</h3><p style={{ color: L.textSoft, fontSize: '.95rem', margin: 0, maxWidth: '85%', position: 'relative' }}>{item.text}</p></div>)}
                </div>
            </section>

            <section className="landing-section" style={{ textAlign: 'center', padding: '6rem 1rem 4rem', maxWidth: 1100, marginLeft: 'auto', marginRight: 'auto' }}>
                <h2 style={{ fontSize: 'clamp(2rem,4vw,2.5rem)', fontWeight: 800, margin: '0 0 1.5rem', color: L.text }}>Prenez vos finances en main.</h2>
                <button onClick={openApp} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '1rem 2rem', borderRadius: 12, fontWeight: 600, fontSize: '1.1rem', cursor: 'pointer', background: ACC, color: '#fff', border: 'none', boxShadow: `0 4px 20px ${ACC}66` }}>Commencer maintenant <ArrowUpRight size={20} /></button>
                <p style={{ color: L.textSoft, fontSize: '.85rem', marginTop: '1.2rem' }}>Gratuit. Sans inscription. Fonctionne instantanément.</p>
            </section>
            <footer className="landing-footer" style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem 2.5rem', borderTop: `1px solid ${L.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', color: L.textFaint, fontSize: '.78rem' }}>
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
            {tabBtn('poches', 'Poches', Layers)}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <button aria-label="Nouvelle saisie" title="Nouvelle saisie" onClick={() => setModal({ type: 'saisie' })} style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg,${ACC},#FF6B6B)`, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 20px ${ACC}60`, flexShrink: 0 }}>
                    <Plus size={22} color="#fff" strokeWidth={2.5} />
                </button>
            </div>
            {tabBtn('simulation', 'Simulation', ChartNoAxesCombined)}
        </div>
    );
}

// ── Top bar ──
function TopBar({ page, selP, setPage, setSelP, mode, setMode, setModal, expJSON, impJSON, dataMode, disconnectFile, onHome }) {
    const T = useT(); const { isMobile } = useBreakpoint();
    const activeTab = selP ? '_' : page;
    const hasData = dataMode === 'file' || dataMode === 'saved';
    const logo = (
        <button onClick={onHome} title="Revenir à l'accueil" aria-label="Revenir à l'accueil" style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, fontFamily: 'inherit', minWidth: 0, flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg,${ACC},#FF6B6B)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.6rem', fontWeight: 900, color: '#fff', boxShadow: `0 0 16px ${ACC}55`, flexShrink: 0 }}>IT</div>
            <span style={{ fontWeight: 700, fontSize: '.82rem', color: T.t1, letterSpacing: '-.01em', whiteSpace: 'nowrap' }}>InvestTrack</span>
        </button>
    );
    if (isMobile) return (
        <>
            <header style={{ position: 'sticky', top: 0, zIndex: 50, height: 50, background: T.dark ? 'rgba(10,10,14,0.95)' : T.s1, borderBottom: `1px solid ${T.brd}`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', padding: '0 .75rem', gap: 7, overflow: 'hidden' }}>
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
        <header style={{ position: 'sticky', top: 0, zIndex: 50, minHeight: 54, background: T.dark ? 'rgba(10,10,14,0.92)' : T.s1, borderBottom: `1px solid ${T.brd}`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 8, padding: '.55rem 1.25rem', overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none' }}>
            {logo}
            <div style={{ display: 'inline-flex', background: T.s2, borderRadius: 10, padding: 3, gap: 2, flex: '0 0 auto' }}>
                {[['dashboard', 'Dashboard'], ['poches', 'Poches'], ['simulation', 'Simulation']].map(([k, l]) => (
                    <button key={k} onClick={() => { setPage(k); setSelP(null); }} style={{ padding: '.3rem 1rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '.77rem', fontWeight: activeTab === k ? 600 : 400, background: activeTab === k ? T.s1 : 'transparent', color: activeTab === k ? T.t1 : T.t2, boxShadow: activeTab === k ? '0 1px 4px rgba(0,0,0,0.12)' : 'none', transition: 'all .14s', minHeight: 34 }}>{l}</button>
                ))}
            </div>
            <div style={{ flex: '1 1 auto', minWidth: 12 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
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
function HeroBanner({ gm, ps, vs, ts, onRepairHistory }) {
    const T = useT(); const { isMobile } = useBreakpoint();
    const [chartMode, setChartMode] = useState('value');
    const gainPct = gm.tc > 0 ? gm.tg / gm.tc : null;
    const hasMissingWithdrawalValues = ts.some(entry => entry.type === 'retrait' && entry.valeurAvant === undefined);
    const histo = useMemo(() => buildPortfolioHistory(ps, ts, vs), [ps, ts, vs]);
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
                    <div style={{ fontSize: '.58rem', color: T.t3, textTransform: 'uppercase', letterSpacing: '.18em', fontWeight: 600, marginBottom: 6 }}>Portefeuille total{gm.valueEstimated ? ' · estimé' : ''}</div>
                    <div style={{ fontSize: isMobile ? '2.4rem' : '3rem', fontWeight: 800, color: T.t1, letterSpacing: '-.05em', lineHeight: 1, fontVariantNumeric: 'tabular-nums', marginBottom: 12 }}>{fEUR(gm.tv)}</div>
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '.24rem .6rem', borderRadius: 6, background: T.s2, border: `1px solid ${T.brd}` }}>
                            <span style={{ fontSize: '.6rem', color: T.t3, fontWeight: 500 }}>Gain{gm.valueEstimated ? ' · estimé' : ''}</span>
                            <span style={{ fontSize: '.78rem', fontWeight: 700, color: gc(gainPct), fontVariantNumeric: 'tabular-nums' }}>{fPctS(gainPct)}</span>
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '.24rem .6rem', borderRadius: 6, background: T.s2, border: `1px solid ${T.brd}` }}>
                            <span style={{ fontSize: '.6rem', color: T.t3, fontWeight: 500, display: 'inline-flex', alignItems: 'center' }}>XIRR{gm.valueEstimated && gm.xirr !== null ? ' · estimé' : ''}<InfoBtn {...XIRR_INFO} /></span>
                            <span style={{ fontSize: '.78rem', fontWeight: 700, color: gc(gm.xirr), fontVariantNumeric: 'tabular-nums' }}>{fPctS(gm.xirr)}</span>
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '.24rem .6rem', borderRadius: 6, background: T.s2, border: `1px solid ${T.brd}` }}>
                            <span style={{ fontSize: '.6rem', color: T.t3, fontWeight: 500 }}>Capital</span>
                            <span style={{ fontSize: '.78rem', fontWeight: 700, color: T.t2, fontVariantNumeric: 'tabular-nums' }}>{fEUR(gm.tc)}</span>
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '.24rem .6rem', borderRadius: 6, background: T.s2, border: `1px solid ${T.brd}` }}>
                            <span style={{ fontSize: '.6rem', color: T.t3, fontWeight: 500 }}>Latent{gm.latentEstimated ? ' · estimé' : ''}</span>
                            <span title={gm.latent === null ? 'Valeurs avant retrait manquantes dans l’historique' : 'Gain sur le capital encore détenu, au coût moyen proportionnel'} style={{ fontSize: '.78rem', fontWeight: 700, color: gc(gm.latent), fontVariantNumeric: 'tabular-nums' }}>{gm.latent === null ? 'Indisponible' : fEURS(gm.latent)}</span>
                            {(gm.latent === null || hasMissingWithdrawalValues || ts.some(entry => entry.valeurAvantEstimation)) && onRepairHistory && <button type="button" title="Vérifier les valeurs avant retrait manquantes ou estimées" onClick={onRepairHistory} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: ACC, padding: '2px 0', minHeight: 28, cursor: 'pointer', fontSize: '.68rem', fontFamily: 'inherit' }}><Pencil size={12} />{gm.latent === null || hasMissingWithdrawalValues ? 'Corriger' : 'Vérifier'}</button>}
                        </div>
                    </div>
                    <div style={{ fontSize: '.7rem', color: T.t3 }}>{ps.filter(p => !p.closedAt).length} active(s) · {ps.filter(p => p.closedAt).length} clôturée(s)</div>
                    <div style={{ fontSize: '.7rem', color: gc(gm.tg), marginTop: 4 }}>Résultat total {fEURS(gm.tg)}{gm.valueEstimated ? ' · estimé' : ''}</div>
                </div>
                <div style={{ padding: isMobile ? '1rem 1rem .75rem' : '1.25rem 1.25rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                        <div style={{ fontSize: '.58rem', color: T.t3, textTransform: 'uppercase', letterSpacing: '.14em', fontWeight: 600 }}>Évolution</div>
                        <div style={{ display: 'inline-flex', background: T.s2, borderRadius: 8, padding: 2, border: `1px solid ${T.brd}` }}>
                            {[['perf', 'Perf. €'], ['pct', 'Perf. %'], ['value', 'Valeur']].map(([k, l]) => <button key={k} onClick={() => setChartMode(k)} style={{ border: 'none', borderRadius: 6, background: chartMode === k ? T.s1 : 'transparent', color: chartMode === k ? T.t1 : T.t2, cursor: 'pointer', fontSize: '.62rem', fontWeight: chartMode === k ? 700 : 500, padding: '.28rem .5rem', minHeight: 30 }}>{l}</button>)}
                        </div>
                    </div>
                    <ChartGuide color={chartColor} mode={chartMode} />
                    {histo.some(point => point.estimated) && <div style={{ fontSize: '.65rem', color: T.t3, marginBottom: 5 }}>Historique comprenant des valeurs estimées.</div>}
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
    const gainPct = p.capital > 0 ? p.gainTotal / p.capital : null;
    const alloc = total > 0 ? Math.min(p.valActu / total, 1) : 0;
    const isUp = p.gainTotal >= 0;
    return (
        <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
            style={{ borderRadius: 12, background: T.s1, border: `1px solid ${h ? p.couleur + '50' : T.brd}`, cursor: 'pointer', transition: 'all .18s', transform: h ? 'translateY(-3px)' : 'none', boxShadow: h ? `0 10px 36px ${p.couleur}22` : 'none', overflow: 'hidden', position: 'relative' }}>
            <div style={{ height: 2, background: `linear-gradient(90deg,${p.couleur}00,${p.couleur},${p.couleur}00)` }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, opacity: .12, pointerEvents: 'none' }}>
                <Sparkline pocheId={p.id} vals={vals} txs={txs} width={110} height={55} />
            </div>
            <div style={{ padding: '.9rem 1rem', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: '.6rem', flexWrap: 'wrap', overflowWrap: 'anywhere' }}>
                    <Dot c={p.couleur} sz={7} />
                    <span style={{ fontWeight: 700, fontSize: '.88rem', color: T.t1, flex: 1 }}>{p.nom}</span>
                    {p.categorie && <Tag label={p.categorie} color={p.couleur} />}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '.74rem', fontWeight: 700, color: gc(gainPct) }}>
                        {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{fPctS(gainPct)}
                    </span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: T.t1, letterSpacing: '-.03em', fontVariantNumeric: 'tabular-nums', marginBottom: '.5rem', lineHeight: 1 }}>{fEUR(p.valActu)}</div>
                {p.valueEstimated && <div style={{ fontSize: '.65rem', color: T.t3, marginBottom: 8 }}>Valeur estimée</div>}
                {p.closedAt && <div style={{ color: T.t2, fontSize: '.68rem', marginBottom: 8 }}>Clôturée le {fDt(p.closedAt)} · Résultat <strong style={{ color: gc(p.gainTotal) }}>{fEURS(p.gainTotal)}</strong></div>}
                <div style={{ display: 'flex', gap: 10, fontSize: '.67rem', color: T.t2, marginBottom: '.65rem' }}>
                    <span>Cap. <strong style={{ color: T.t1, fontVariantNumeric: 'tabular-nums' }}>{fEUR(p.capital)}</strong></span>
                    <span style={{ color: T.t3 }}>·</span>
                    <span>XIRR{p.valueEstimated && p.xirr !== null ? ' estimé' : ''} <strong style={{ color: gc(p.xirr), fontVariantNumeric: 'tabular-nums' }}>{fPctS(p.xirr)}</strong></span>
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
function TxTimeline({ txs, onDel, onRepair }) {
    const T = useT();
    if (!txs.length) return <div style={{ color: T.t2, textAlign: 'center', padding: '2rem', fontSize: '.8rem' }}>Aucune transaction.</div>;
    return (
        <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 76, top: 16, bottom: 16, width: 1, background: T.brd, zIndex: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {txs.map(t => {
                    const col = txC(t.type), isIn = t.type === 'retrait';
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
                                    <span style={{ fontWeight: 700, fontSize: '.83rem', color: isIn ? GRN : T.t1, fontVariantNumeric: 'tabular-nums' }}>{fEUR(t.montant)}</span>
                                    {onDel && <button disabled={!t.id} title={t.id ? 'Supprimer la transaction' : 'Identifiant absent dans le fichier : suppression indisponible'} aria-label="Supprimer la transaction" onClick={() => onDel(t.id)} style={{ background: 'none', border: 'none', color: T.t3, cursor: t.id ? 'pointer' : 'not-allowed', opacity: .5, lineHeight: 0, padding: 4, minWidth: 28, minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={13} /></button>}
                                </div>
                                {t.commentaire && <div style={{ color: T.t2, fontSize: '.67rem', marginTop: 5, lineHeight: 1.45 }}>{t.commentaire}</div>}
                                {t.valeurAvant !== undefined && <div style={{ color: T.t2, fontSize: '.67rem', marginTop: 5 }}>Valeur avant {t.type === 'retrait' ? 'retrait' : 'apport'} : {fEUR(t.valeurAvant)}{t.valeurAvantEstimation || t.valeurAvantEstimee ? ' · Estimée' : ''}</div>}
                                {t.type === 'retrait' && (t.valeurAvant === undefined || t.valeurAvantEstimation) && onRepair && <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 5 }}><span style={{ color: T.t3, fontSize: '.67rem' }}>{t.valeurAvantEstimation ? `Estimation à confirmer · source du ${fDt(t.valeurAvantEstimation.sourceDate)}` : 'Valeur avant retrait manquante'}</span><Btn ghost onClick={() => onRepair(t)} style={{ padding: '2px 6px', fontSize: '.67rem' }}><Pencil size={11} />{t.valeurAvantEstimation ? 'Confirmer' : 'Compléter'}</Btn></div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function AllocationChart({ pm }: { pm: Array<Pocket & PocketMetrics> }) {
    const T = useT(); const { isMobile } = useBreakpoint();
    const [mode, setMode] = useState('poche');
    const categories = useMemo(() => [...new Set(pm.filter(p => !p.closedAt && p.valActu > 0).map(p => p.categorie?.trim() || 'Sans catégorie'))], [pm]);
    const [cat, setCat] = useState('');
    useEffect(() => { if (!categories.includes(cat)) setCat(categories[0] || ''); }, [categories, cat]);
    const catColor = name => PCOLS[Math.abs([...name].reduce((s, ch) => s + ch.charCodeAt(0), 0)) % PCOLS.length];
    const data = useMemo(() => {
        const active = pm.filter(p => !p.closedAt && p.valActu > 0);
        if (mode === 'categorie') {
            return Object.values(active.reduce<Record<string, { name: string; value: number; fill: string }>>((acc, p) => {
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
    const TT = { contentStyle: { background: T.dark ? T.s2 : '#fff', border: `1px solid ${T.brd}`, borderRadius: 8, color: T.t1, fontSize: '.73rem', boxShadow: T.dark ? '0 12px 32px rgba(0,0,0,.45)' : '0 12px 32px rgba(0,0,0,.12)' }, itemStyle: { color: T.t1 }, labelStyle: { color: T.t1 }, formatter: v => `${fEUR(Number(v))} (${pct(Number(v))})` };
    const pieLabel = ({ cx, cy, midAngle = 0, outerRadius, percent = 0, name }: PieLabelRenderProps) => {
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
                            <Legend verticalAlign="bottom" iconType="circle" iconSize={7} wrapperStyle={{ color: T.t1 }} formatter={(v, entry) => <span style={{ color: T.t1, fontSize: '.72rem', fontWeight: 600 }}>{v} <span style={{ color: T.t2, fontWeight: 500 }}>{pct(Number(entry.payload && 'value' in entry.payload ? entry.payload.value : 0))}</span></span>} />
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
    const m = useMemo(() => getPocketMetrics(poche.id, txs, vals, poche.closedAt), [poche, txs, vals]);
    const pv = useMemo(() => vals.filter(v => v.pocheId === poche.id).sort((a, b) => a.date.localeCompare(b.date)), [poche, vals]);
    const pt = useMemo(() => txs.filter(t => t.pocheId === poche.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp)), [poche, txs]);
    const hasMissingWithdrawalValues = pt.some(entry => entry.type === 'retrait' && entry.valeurAvant === undefined);
    const chart = useMemo(() => buildPocketHistory(poche.id, txs, vals).map(point => ({ ...point, d: point.date })), [poche, txs, vals]);
    const chartDataKey = chartMode === 'value' ? 'v' : chartMode === 'pct' ? 'pct' : 'p';
    const chartLabel = chartMode === 'value' ? 'Valeur' : chartMode === 'pct' ? 'Perf. %' : 'Perf. €';
    const chartFmt = chartMode === 'pct' ? fPctS : fEUR;
    const capColor = T.dark ? '#F8FAFC' : '#111827';
    const lastPoint = chart[chart.length - 1];
    const chartColor = chartMode === 'value' ? VALC : gc(lastPoint?.[chartDataKey]) || poche.couleur;
    const gainPct = m.capital > 0 ? m.gainTotal / m.capital : null;
    const { th, td } = useTS();
    const conf = (msg, fn) => setModal({ type: 'confirm', msg, onOk: fn });

    const kpis = [
        { label: m.valueEstimated ? 'Valeur estimée' : 'Valeur', value: fEUR(m.valActu), sub: `Capital : ${fEUR(m.capital)}`, color: poche.couleur },
        { label: poche.closedAt ? 'Résultat final' : m.valueEstimated ? 'Gain estimé' : 'Gain', value: poche.closedAt ? fEURS(m.gainTotal) : fPctS(gainPct), sub: poche.closedAt ? 'Latent : 0 €' : fEURS(m.gainTotal), color: gc(m.gainTotal) },
        { label: m.valueEstimated && m.xirr !== null ? 'XIRR estimé' : 'XIRR', value: fPctS(m.xirr), sub: 'Annualisé net', color: gc(m.xirr), info: XIRR_INFO },
        { label: m.dietzEstimated ? 'Dietz estimé' : 'Dietz', value: fPctS(m.dietz), sub: 'Période complète', color: gc(m.dietz), info: DIETZ_INFO },
    ];

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
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {!poche.closedAt && !isMobile && <Btn primary onClick={() => setModal({ type: 'saisie', poche: poche.id })}><Plus size={11} />Saisie</Btn>}
                    <Btn ghost onClick={() => setModal({ type: poche.closedAt ? 'reopen' : 'closePocket', poche })}>{poche.closedAt ? <RotateCcw size={13} /> : <Archive size={13} />}{poche.closedAt ? 'Rouvrir' : 'Clôturer'}</Btn>
                    <Btn danger title="Supprimer la poche et son historique" aria-label="Supprimer la poche et son historique" style={{ padding: '.4rem .7rem', minHeight: 36 }} onClick={() => conf(`Supprimer « ${poche.nom} » et toutes ses transactions et valorisations ? Son historique et ses résultats seront effacés.`, () => { onDelPoche(poche.id); onBack(); })}><Trash2 size={isMobile ? 14 : 11} /></Btn>
                </div>
            </div>
            {poche.closedAt && <div role="status" style={{ color: T.t2, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}><Archive size={14} />Clôturée le {fDt(poche.closedAt)} · Opérations en lecture seule</div>}

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
                    {chart.some(point => point.estimated) && <div style={{ fontSize: '.65rem', color: T.t3, marginBottom: 5 }}>Historique comprenant des valeurs estimées.</div>}
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
                            {[{ l: 'Apports', v: fEUR(m.apports), c: null }, { l: 'Retraits', v: fEUR(m.retraits), c: AMB }].map(r => (
                                <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.35rem 0', borderBottom: `1px solid ${T.brd}` }}>
                                    <span style={{ fontSize: '.71rem', color: T.t2 }}>{r.l}</span>
                                    <span style={{ fontWeight: 600, fontSize: '.78rem', color: r.c || T.t1, fontVariantNumeric: 'tabular-nums' }}>{r.v}</span>
                                </div>
                            ))}
                        </SC>
                        <SC title={poche.closedAt ? 'Résultat final' : 'Gain'}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', color: T.t2, marginBottom: 4 }}><span>{poche.closedAt ? 'Retraits - apports' : 'Valeur - capital'}</span><strong style={{ color: gc(m.gainTotal), fontVariantNumeric: 'tabular-nums' }}>{fEURS(m.gainTotal)}</strong></div>
                            <div title="Coût moyen proportionnel du capital encore détenu, hors calcul fiscal" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', fontSize: '.72rem', color: T.t2, marginBottom: 4 }}><span>Latent{m.latentEstimated ? ' · estimé' : ''}</span><strong style={{ color: gc(m.gainLatent) }}>{m.gainLatent === null ? 'Indisponible' : fEURS(m.gainLatent)}</strong></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', fontSize: '.72rem', color: T.t2, marginBottom: 4 }}><span>Réalisé{m.realizedEstimated ? ' · estimé' : ''}</span><strong style={{ color: gc(m.gainRealise) }}>{m.gainRealise === null ? 'Indisponible' : fEURS(m.gainRealise)}</strong></div>
                            {(m.gainLatent === null || hasMissingWithdrawalValues || pt.some(entry => entry.valeurAvantEstimation)) && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}><span style={{ fontSize: '.67rem', color: T.t3 }}>Valeurs avant retrait manquantes ou estimées dans l’historique.</span><Btn ghost onClick={() => setModal({ type: 'repairHistory', poche: poche.id })} style={{ padding: '2px 6px', fontSize: '.68rem' }}><Pencil size={12} />{m.gainLatent === null || hasMissingWithdrawalValues ? 'Corriger' : 'Vérifier'}</Btn></div>}
                            <div style={{ height: 5, borderRadius: 99, background: T.s3, overflow: 'hidden' }}><div style={{ width: `${Math.min(100, Math.abs(m.gainTotal) / Math.max(Math.abs(m.gainTotal), 1) * 100)}%`, height: '100%', background: poche.couleur, opacity: m.gainTotal >= 0 ? 1 : .55 }} /></div>
                        </SC>
                    </div>
                </div>
            )}
            {sub === 'transactions' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '.9rem' }}>
                        {!poche.closedAt && <Btn primary onClick={() => setModal({ type: 'saisie', poche: poche.id })}><Plus size={11} />Ajouter</Btn>}
                    </div>
                    <TxTimeline txs={pt} onDel={poche.closedAt ? null : id => conf('Supprimer cette transaction ?', () => onDelTx(id))} onRepair={transaction => setModal({ type: 'repairHistory', poche: poche.id, transaction })} />
                </div>
            )}
            {sub === 'valorisations' && (
                <SC title={`Valorisations (${pv.length})`} action={!poche.closedAt && <Btn ghost onClick={() => setModal({ type: 'saisie', poche: poche.id })}><Plus size={11} />Ajouter</Btn>} noPad>
                    <div style={{ padding: '0 1.1rem 1rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr><th style={th}>Date</th><th style={{ ...th, textAlign: 'right' }}>Valeur</th><th style={th} /></tr></thead>
                            <tbody>
                                {!pv.length && <tr><td colSpan={3} style={{ ...td, textAlign: 'center', color: T.t2, padding: '1.5rem' }}>Aucune valorisation.</td></tr>}
                                {[...pv].reverse().map(v => (
                                    <TRow key={v.id}>
                                        <td style={{ ...td, color: T.t2, whiteSpace: 'nowrap' }}><div>{fDt(v.date)}</div>{v.commentaire && <div style={{ fontSize: '.66rem', color: T.t3, marginTop: 3, whiteSpace: 'normal' }}>{v.commentaire}</div>}</td>
                                        <td style={{ ...td, textAlign: 'right', fontWeight: 600, color: poche.couleur }}>{fEUR(v.valeur)}{v.estimee && <div style={{ fontSize: '.6rem', color: T.t3 }}>Estimée</div>}</td>
                                        <td style={td}>{!poche.closedAt && <button disabled={!!v.transactionId || !v.id} title={!v.id ? 'Identifiant absent dans le fichier : suppression indisponible' : v.transactionId ? 'Valeur liée au mouvement : supprimez la transaction correspondante' : 'Supprimer la valorisation'} aria-label="Supprimer la valorisation" onClick={() => conf('Supprimer cette valorisation ?', () => onDelVal(v.id))} style={{ background: 'none', border: 'none', color: LOSSC, cursor: v.transactionId || !v.id ? 'not-allowed' : 'pointer', opacity: .4, lineHeight: 0, padding: 4, minWidth: 32, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={13} /></button>}</td>
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
    const sortedPm = useMemo(() => {
        const val = (p, key) => key === 'nom' ? (p.nom || '').toLocaleLowerCase('fr-FR') : key === 'gainPct' ? (p.capital > 0 ? p.gainTotal / p.capital : -Infinity) : p[key] ?? -Infinity;
        return [...pm].sort((a, b) => {
            const av = val(a, sort.key), bv = val(b, sort.key);
            const cmp = typeof av === 'string' ? av.localeCompare(bv, 'fr-FR') : av - bv;
            return sort.dir === 'asc' ? cmp : -cmp;
        });
    }, [pm, sort]);
    const sortBy = key => setSort(s => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));
    const H = ({ k, right = false, children }) => {
        const active = sort.key === k;
        return <th style={right ? thR : th}><span onClick={() => sortBy(k)} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') sortBy(k); }} style={{ background: 'none', border: 'none', padding: 0, margin: 0, color: active ? T.t1 : T.t2, cursor: 'pointer', font: 'inherit', textTransform: 'inherit', letterSpacing: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: right ? 'flex-end' : 'flex-start', width: '100%', minHeight: 30 }}>{children}<span style={{ fontSize: '.55rem', color: active ? ACC : T.t3 }}>{active ? (sort.dir === 'desc' ? '↓' : '↑') : '↕'}</span></span></th>;
    };
    return (
        <div>
            {dataMode === 'demo' && <DemoBanner onImport={impJSON} onEmpty={startEmpty} onKeep={useDemoAsBase} />}
            <HeroBanner gm={gm} ps={ps} vs={vs} ts={ts} onRepairHistory={dataMode === 'landing' ? undefined : () => setModal({ type: 'repairHistory' })} />
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
                                    {!isMobile && <H k="gainTotal" right>Résultat €</H>}
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
                                    const gp = p.capital > 0 ? p.gainTotal / p.capital : null;
                                    return (
                                        <TRow key={p.id} onClick={() => setSelP(p.id)}>
                                            <td style={td}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}><Dot c={p.couleur} sz={7} /><span style={{ fontWeight: 600, color: T.t1 }}>{p.nom}</span>{p.closedAt && <Tag label="Clôturée" color={T.t2} />}</span></td>
                                            {!isMobile && <td style={{ ...tdR, color: T.t2 }}>{fEUR(p.capital)}</td>}
                                            <td style={{ ...tdR, fontWeight: 600, color: ACC }}>{fEUR(p.valActu)}{p.valueEstimated && <div style={{ fontSize: '.6rem', color: T.t3 }}>Estimée</div>}</td>
                                            <td style={{ ...tdR, fontWeight: 700, color: gc(gp) }}>{fPctS(gp)}{p.valueEstimated && gp !== null && <div style={{ fontSize: '.6rem', color: T.t3 }}>Estimé</div>}</td>
                                            {!isMobile && <td style={{ ...tdR, fontWeight: 500, color: gc(p.gainTotal) }}>{fEURS(p.gainTotal)}{p.valueEstimated && <div style={{ fontSize: '.6rem', color: T.t3 }}>Estimé</div>}</td>}
                                            <td style={{ ...tdR, fontWeight: 700, color: gc(p.xirr) }}>{fPctS(p.xirr)}{p.valueEstimated && p.xirr !== null && <div style={{ fontSize: '.6rem', color: T.t3 }}>Estimé</div>}</td>
                                            {!isMobile && <td style={{ ...tdR, color: gc(p.dietz) }}>{fPctS(p.dietz)}{p.dietzEstimated && <div style={{ fontSize: '.6rem', color: T.t3 }}>Estimé</div>}</td>}
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
    const sections = [
        { label: 'Actives', pockets: pm.filter(p => !p.closedAt) },
        { label: 'Clôturées', pockets: pm.filter(p => p.closedAt) },
    ];
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '.9rem', fontWeight: 700, color: T.t1, letterSpacing: '-.02em' }}>Mes poches</h2>
                    <div style={{ fontSize: '.63rem', color: T.t2, marginTop: 2 }}>{pm.length} poche{pm.length > 1 ? 's' : ''}</div>
                </div>
                <Btn primary onClick={() => setModal({ type: 'p' })}><Plus size={12} />Nouvelle poche</Btn>
            </div>
            <div style={{ display: 'grid', gap: '1rem' }}>
                {pm.length > 0 && sections.map(section => <section key={section.label}>
                    <h3 style={{ color: T.t1, fontSize: '.85rem', margin: '0 0 .7rem', paddingBottom: 8, borderBottom: `1px solid ${T.brd}` }}>{section.label} ({section.pockets.length})</h3>
                    {!section.pockets.length && <p style={{ color: T.t2, fontSize: '.75rem' }}>Aucune poche {section.label === 'Actives' ? 'active' : 'clôturée'}.</p>}
                    {[...new Set<string>(section.pockets.map(p => p.categorie?.trim() || 'Sans catégorie'))].map(cat => <div key={cat} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: '.62rem', color: T.t2, textTransform: 'uppercase', letterSpacing: '.12em', fontWeight: 700, marginBottom: '.55rem' }}>{cat}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(220px,100%),1fr))', gap: '.75rem' }}>
                            {section.pockets.filter(p => (p.categorie?.trim() || 'Sans catégorie') === cat).map(p => <PocheCard key={p.id} p={p} vals={vs} txs={ts} total={gm.tv} onClick={() => setSelP(p.id)} />)}
                        </div>
                    </div>)}
                </section>)}
                {!pm.length && <div style={{ borderRadius: 12, border: `1px dashed ${T.brd}`, padding: '3rem', textAlign: 'center', color: T.t2, fontSize: '.8rem', gridColumn: '1/-1' }}>Aucune poche. Commencez par en créer une.</div>}
            </div>
        </div>
    );
}

function ExportReminder({ show, onExport, saved }) {
    const T = useT();
    if (!show) return null;
    return (
        <div style={{ border: `1px solid ${AMB}40`, background: T.dark ? `${AMB}12` : `${AMB}0D`, borderRadius: 12, padding: '.65rem .8rem', marginBottom: '.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.t2, fontSize: '.76rem', lineHeight: 1.45 }}>
                <Download size={15} color={AMB} />
                <span><strong style={{ color: T.t1 }}>{saved ? 'Changement enregistré localement.' : 'Modifications non enregistrées localement.'}</strong> Exportez vos données pour garder un fichier de sauvegarde à jour.</span>
            </div>
            <Btn ghost onClick={onExport} style={{ borderColor: `${AMB}45`, color: AMB, background: `${AMB}10` }}><Download size={12} />Exporter maintenant</Btn>
        </div>
    );
}

const SIMULATION_HELP = {
    title: 'Hypothèses de simulation',
    lines: [
        { type: 'text', html: 'Accumulation : rendement annuel puis versement en fin d’année. À échéance, les revenus affichés sont potentiels, sans retrait du capital. Ensuite, les versements cessent et les retraits sont effectifs.' },
        { type: 'text', html: 'La fiscalité porte sur la fraction de gains positifs retirée, sans crédit sur les pertes. La base fiscale diminue proportionnellement aux retraits. Le revenu mensuel est le revenu annuel divisé par 12.' },
        { type: 'text', html: 'Simulation crises : la volatilité et les baisses de crise concernent uniquement les poches cochées « Sensible aux crises », avec des chocs annuels communs et un rendement borné à −100 %. Les poches décochées conservent leur rendement annuel constant.' },
        { type: 'text', html: 'Les indicateurs et graphiques utilisent les médianes calculées séparément pour chaque année et chaque grandeur. À chaque année, le détail par poche et le CSV utilisent un scénario sélectionné au patrimoine médian de cette année : la somme des poches correspond au patrimoine médian du graphique. Ce scénario peut changer d’une année à l’autre ; ces lignes ne forment pas une trajectoire unique.' },
        { type: 'text', html: 'Le net du scénario est la somme des revenus de ses poches, avec sa fiscalité. Il peut différer du net médian du portefeuille, calculé indépendamment sur tous les scénarios. Les deux montants sont affichés séparément.' },
        { type: 'callout', color: AMB, html: 'Estimation indicative, hors frais et inflation. P10/P90 ne sont pas des garanties. Les taux saisis ne sont pas des règles fiscales automatiques. Aucun conseil fiscal.' },
    ]
};

const SIMULATION_CRISIS_HELP = {
    title: 'Simulation crises',
    lines: [
        { type: 'text', html: 'Cette option explore plusieurs futurs possibles pour mesurer l’effet des variations de rendement et des crises sur votre patrimoine et vos revenus, au lieu de supposer un rendement constant.' },
        { type: 'text', html: 'Chaque scénario simule les années d’épargne puis de retraits. Chaque année, une variation aléatoire s’ajoute au rendement des seules poches cochées « Sensible aux crises ». La volatilité règle l’amplitude de cette variation.' },
        { type: 'text', html: 'Une crise peut survenir chaque année selon la probabilité choisie, indépendamment des années précédentes. Sa baisse est tirée entre le minimum et le maximum, puis appliquée après le rendement aux seules poches cochées. Les poches décochées ne subissent ni volatilité ni crises : elles suivent leur rendement annuel constant, avec leurs versements, retraits et fiscalité habituels.' },
        { type: 'text', html: 'Les graphiques comparent les scénarios au rendement constant : P10 est le seuil dépassé par environ 90 % des résultats simulés, la médiane partage les résultats en deux, et P90 est le seuil dépassé par environ 10 %. Ces seuils sont calculés séparément pour chaque année et chaque grandeur.' },
        { type: 'text', html: 'À hypothèses identiques, les tirages restent reproductibles. Les indicateurs affichent les médianes à leur échéance. Chaque ligne des tableaux détaillés et du CSV utilise un scénario sélectionné au patrimoine médian de son année, avec des poches comptablement cohérentes. Le scénario peut changer entre les années. Son revenu net et le revenu net médian global sont distingués. Désactiver cette option affiche uniquement le rendement constant, sans volatilité ni crises.' },
        { type: 'callout', color: AMB, html: 'Ces simulations ne prédisent pas l’avenir et ne garantissent aucun résultat. Le temps de calcul et la mémoire augmentent avec le nombre de scénarios et d’années.' },
    ]
};

const SIMULATION_REFERENCE_HELP = {
    title: 'Rendement constant et P90',
    lines: [
        { type: 'heading', text: 'Que représente le rendement constant ?' },
        { type: 'text', html: 'Cette courbe applique le rendement annuel saisi pour chaque poche, identique chaque année, avec les mêmes versements, retraits et hypothèses fiscales. Elle ne comprend ni volatilité ni crises.' },
        { type: 'heading', text: 'Pourquoi P90 peut-il être au-dessus ?' },
        { type: 'text', html: 'La volatilité produit des variations positives comme négatives. Les scénarios favorables peuvent cumuler des rendements supérieurs au taux saisi et subir peu de crises, ou les subir à des moments moins pénalisants. Leur patrimoine ou leur revenu net peut donc dépasser la courbe à rendement constant.' },
        { type: 'text', html: 'P90 est le seuil en dessous duquel se trouvent environ 90 % des résultats à une année donnée ; environ 10 % sont au-dessus. Ce n’est ni le maximum possible ni une trajectoire unique. Le rendement constant est un point de comparaison, pas un plafond.' },
        { type: 'callout', color: AMB, html: 'Sans volatilité, les crises ne font que réduire les rendements : le patrimoine P90 ne devrait alors pas dépasser la référence, hors écarts numériques. Avec les retraits et la fiscalité, les revenus nets peuvent néanmoins se comporter différemment. Ces courbes ne garantissent aucun résultat.' },
    ]
};

const TAX_PRESETS = [
    { value: 0, label: 'Exonéré · 0 %' },
    { value: .172, label: 'Prélèvements sociaux · 17,2 %' },
    { value: .3, label: 'Flat tax · 30 %' },
];
const CRISIS_PRESETS = {
    moderate: { label: 'Modérées', volatility: .12, crisisProbability: .05, crisisLossMin: .15, crisisLossMax: .3 },
    severe: { label: 'Sévères', volatility: .18, crisisProbability: .1, crisisLossMin: .25, crisisLossMax: .45 },
};
const sameRate = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const compactEUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', notation: 'compact', maximumSignificantDigits: 3 });
const fRate = (rate: number) => Number.isFinite(rate) ? `${(rate * 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %` : '–';
const parseNumber = (text: string) => { const clean = text.replace(/[\s\u00a0\u202f€%]/g, '').replace(',', '.'); return clean === '' ? NaN : Number(clean); };
const rawNumber = (value: number) => Number.isFinite(value) ? String(Number(value.toFixed(6))).replace('.', ',') : '';

function simulationExample(): SimulationPocket[] {
    return [
        { ...createSimulationPocket(0, PCOLS[1]), name: 'PEA', initialCapital: 10000, annualContribution: 2400, annualReturnRate: .07, taxRate: .172 },
        { ...createSimulationPocket(1, PCOLS[2]), name: 'Assurance-vie', initialCapital: 5000, annualContribution: 1200, annualReturnRate: .045, taxRate: .172 },
        { ...createSimulationPocket(2, PCOLS[3]), name: 'Livret', initialCapital: 3000, annualContribution: 0, annualReturnRate: .024, taxRate: 0, crisisSensitive: false },
    ];
}

function SimulationNumber({ label, value, onChange, min = 0, max, integer = false, unit = '', help = '', slider }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; integer?: boolean; unit?: string; help?: string; slider?: { min: number; max: number; step: number } }) {
    const T = useT();
    const id = useId();
    const [text, setText] = useState<string | null>(null);
    const invalid = !Number.isFinite(value) || value < min || (max !== undefined && value > max) || (integer && !Number.isInteger(value));
    const shown = text ?? (unit === '€' && Number.isFinite(value) ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value) : rawNumber(value));
    const input = <div style={{ position: 'relative', minWidth: 0, width: slider ? 104 : '100%', flexShrink: 0 }}>
        <Inp id={id} type="text" inputMode={integer ? 'numeric' : 'decimal'} value={shown} aria-invalid={invalid} aria-describedby={invalid ? `${id}-error` : undefined}
            onFocus={() => setText(rawNumber(value))} onBlur={() => setText(null)}
            onChange={event => { setText(event.target.value); onChange(parseNumber(event.target.value)); }}
            style={{ borderColor: invalid ? LOSSC : T.brd, minWidth: 0, paddingRight: unit ? '2.4rem' : '.75rem', textAlign: slider ? 'right' : 'left' }} />
        {unit && <span aria-hidden="true" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '.7rem', color: T.t2, pointerEvents: 'none' }}>{unit}</span>}
    </div>;
    const labelRow = <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: slider ? 0 : 4, minWidth: 0 }}>
        <label htmlFor={id} style={{ fontSize: '.68rem', color: T.t2 }}>{label}</label>
        {help && <InfoBtn title={label} lines={[{ type: 'text', html: help }]} />}
    </div>;
    return <div style={{ minWidth: 0 }}>
        {slider
            ? <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>{labelRow}{input}</div>
                <input type="range" aria-label={`${label} (curseur)`} min={slider.min} max={slider.max} step={slider.step} value={Number.isFinite(value) ? Math.min(slider.max, Math.max(slider.min, value)) : slider.min} onChange={event => { setText(null); onChange(Number(event.target.value)); }} style={{ width: '100%', accentColor: ACC, marginTop: 6 }} />
            </>
            : <>{labelRow}{input}</>}
        {invalid && <div id={`${id}-error`} role="alert" style={{ color: LOSSC, fontSize: '.62rem', marginTop: 3 }}>Valeur {integer ? 'entière ' : ''}≥ {min}{max !== undefined ? ` et ≤ ${max}` : ''}.</div>}
    </div>;
}

function Segmented({ value, options, onChange, label }: { value: string; options: { value: string; label: string }[]; onChange: (value: string) => void; label: string }) {
    const T = useT();
    return <div role="radiogroup" aria-label={label} style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length},minmax(0,1fr))`, background: T.s2, borderRadius: 10, padding: 3, gap: 2 }}>
        {options.map(option => {
            const active = value === option.value;
            return <button key={option.value} type="button" role="radio" aria-checked={active} onClick={() => onChange(option.value)} style={{ border: 'none', borderRadius: 8, padding: '.42rem .25rem', fontSize: '.7rem', fontWeight: active ? 700 : 500, background: active ? T.s1 : 'transparent', color: active ? T.t1 : T.t2, cursor: 'pointer', fontFamily: 'inherit', boxShadow: active ? '0 1px 3px rgba(0,0,0,.25)' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{option.label}</button>;
        })}
    </div>;
}

function SimulationPocketCard({ pocket, index, open, onToggle, onChange, onRemove, canRemove }: { pocket: SimulationPocket; index: number; open: boolean; onToggle: () => void; onChange: (patch: Partial<SimulationPocket>) => void; onRemove: () => void; canRemove: boolean }) {
    const T = useT();
    const preset = TAX_PRESETS.find(item => sameRate(item.value, pocket.taxRate));
    const [customTax, setCustomTax] = useState(!preset);
    const fallbackName = `Poche ${index + 1}`;
    const summary = `${Number.isFinite(pocket.initialCapital) ? compactEUR.format(pocket.initialCapital) : '–'} · +${Number.isFinite(pocket.annualContribution) ? compactEUR.format(pocket.annualContribution) : '–'}/an · ${fRate(pocket.annualReturnRate)}`;
    const panelId = `simulation-pocket-${pocket.id}`;
    return <div style={{ borderRadius: 12, background: T.s1, border: `1px solid ${open ? pocket.color + '66' : T.brd}`, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '.6rem .6rem .6rem .85rem' }}>
            <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={panelId} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', color: T.t1, cursor: 'pointer', padding: 0, textAlign: 'left', fontFamily: 'inherit' }}>
                <Dot c={pocket.color} />
                <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: 'block', fontSize: '.78rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pocket.name || fallbackName}</span>
                    <span style={{ display: 'block', fontSize: '.64rem', color: T.t2, fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}{pocket.crisisSensitive === false ? ' · hors crises' : ''}</span>
                </span>
                <ChevronDown size={15} style={{ flexShrink: 0, color: T.t2, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
            </button>
            <Btn ghost disabled={!canRemove} title={canRemove ? 'Supprimer cette poche' : 'Conserver au moins une poche'} aria-label={`Supprimer ${pocket.name || fallbackName}`} onClick={onRemove} style={{ padding: 6, minHeight: 28 }}><Trash2 size={13} /></Btn>
        </div>
        {open && <div id={panelId} style={{ display: 'grid', gap: 12, padding: '.85rem', borderTop: `1px solid ${T.brd}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', gap: 8, alignItems: 'stretch' }}>
                <label style={{ display: 'grid', gridTemplateRows: 'auto 1fr', gap: 4, fontSize: '.68rem', color: T.t2 }}>Couleur<input type="color" value={pocket.color} onChange={event => onChange({ color: event.target.value })} style={{ width: 44, height: '100%', minHeight: 38, padding: 2, border: `1px solid ${T.brd}`, borderRadius: 8, background: T.inp, cursor: 'pointer', boxSizing: 'border-box' }} /></label>
                <label style={{ display: 'grid', gap: 4, fontSize: '.68rem', color: T.t2, minWidth: 0 }}>Nom<Inp value={pocket.name} maxLength={48} onChange={event => onChange({ name: event.target.value })} onBlur={() => { if (!pocket.name.trim()) onChange({ name: fallbackName }); }} /></label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
                <SimulationNumber label="Capital initial" unit="€" value={pocket.initialCapital} onChange={value => onChange({ initialCapital: value })} />
                <SimulationNumber label="Versement annuel" unit="€" value={pocket.annualContribution} onChange={value => onChange({ annualContribution: value })} />
                <SimulationNumber label="Rendement annuel" unit="%" min={-100} value={pocket.annualReturnRate * 100} onChange={value => onChange({ annualReturnRate: value / 100 })} />
                <div style={{ minWidth: 0 }}>
                    <Lbl ch="Fiscalité à la sortie" />
                    <Sel aria-label="Fiscalité à la sortie" value={customTax || !preset ? 'custom' : String(preset.value)} onChange={event => { if (event.target.value === 'custom') setCustomTax(true); else { setCustomTax(false); onChange({ taxRate: Number(event.target.value) }); } }}>
                        {TAX_PRESETS.map(item => <option key={item.value} value={String(item.value)}>{item.label}</option>)}
                        <option value="custom">Personnalisée…</option>
                    </Sel>
                </div>
            </div>
            {(customTax || !preset) && <SimulationNumber label="Taux de fiscalité personnalisé" unit="%" max={100} value={pocket.taxRate * 100} onChange={value => onChange({ taxRate: value / 100 })} help="Taux appliqué à la part de gains contenue dans chaque retrait. Ce n’est pas une règle fiscale automatique." />}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}><label style={{ fontSize: '.7rem', color: T.t2, display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={pocket.crisisSensitive !== false} onChange={event => onChange({ crisisSensitive: event.target.checked })} />Exposée aux crises</label><InfoBtn title={`Exposition aux crises · ${pocket.name || fallbackName}`} lines={[{ type: 'text', html: 'Cochée, cette poche reçoit la volatilité et les baisses définies dans « Crises de marché ». Décochée (livret, fonds euros…), elle conserve son rendement annuel constant. Ses versements, retraits et sa fiscalité restent appliqués. Sans simulation de crises, ce choix n’a pas d’effet.' }]} /></div>
        </div>}
    </div>;
}

function SimulationPlot({ data, years, end, start = 0, selected, onSelect, children }: { data: any[]; years: number; end: number; start?: number; selected?: number; onSelect?: (year: number) => void; children?: any }) {
    const T = useT();
    const { isMobile } = useBreakpoint();
    const ticks = [...new Set([start, Math.round((start + years) / 2), years, Math.round((years + end) / 2), end])].filter(value => value >= start && value <= end);
    const values: number[] = data.flatMap(row => [row.baseline, row.median, row.low, row.high, ...(row.band || [])]).filter(value => typeof value === 'number' && Number.isFinite(value));
    const minValue = Math.min(0, ...values);
    const maxValue = Math.max(0, ...values);
    const range = maxValue - minValue || 1;
    const roughStep = range * 1.05 / 4;
    const magnitude = 10 ** Math.floor(Math.log10(roughStep));
    const step = [1, 2, 2.5, 5, 10].find(value => value * magnitude >= roughStep)! * magnitude;
    const axisMin = Math.floor(minValue / step) * step;
    const axisMax = Math.ceil((maxValue + range * .05) / step) * step;
    const axisTicks = Array.from({ length: Math.round((axisMax - axisMin) / step) + 1 }, (_, index) => Number((axisMin + index * step).toPrecision(12)));
    const axisFormat = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', notation: 'compact', maximumSignificantDigits: 3 });
    const axisWidth = Math.max(48, ...axisTicks.map(value => axisFormat.format(value).length * 6 + 14));
    const handleClick = (state: any) => {
        if (!onSelect || !state) return;
        const year = Number(state.activeLabel ?? data[Number(state.activeTooltipIndex ?? state.activeIndex)]?.year);
        if (Number.isInteger(year) && year >= 1) onSelect(year);
    };
    return <div style={{ height: isMobile ? 300 : 320, minWidth: 0, marginTop: 10, cursor: onSelect ? 'pointer' : undefined }}>
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 18, left: 0, bottom: 5 }} onClick={handleClick}>
                <CartesianGrid stroke={T.brd} vertical={false} />
                {years > start && <ReferenceArea x1={start} x2={years} fill={T.t2} fillOpacity={.035} stroke="none" ifOverflow="hidden" label={{ value: 'Épargne', position: 'insideTopLeft', fill: T.t2, fontSize: 10 }} />}
                {end > years && <ReferenceArea x1={years} x2={end} fill={GRN} fillOpacity={.05} stroke="none" ifOverflow="hidden" label={{ value: 'Retraits', position: 'insideTopRight', fill: T.t2, fontSize: 10 }} />}
                <XAxis dataKey="year" type="number" domain={start === end ? [start - 1, end + 1] : [start, end]} ticks={ticks} tick={{ fill: T.t2, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={20} tickFormatter={value => `${value} a`} />
                <YAxis width={axisWidth} domain={[axisMin, axisMax]} ticks={axisTicks} tick={{ fill: T.t2, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={value => axisFormat.format(value)} />
                <RT contentStyle={{ background: T.s1, border: `1px solid ${T.brd}`, borderRadius: 8, color: T.t1, fontSize: 12 }} labelFormatter={value => `Année ${value} · ${Number(value) <= years ? 'Épargne' : 'Retraits'}`} formatter={(value, name) => [Array.isArray(value) ? `${fEUR(value[0])} à ${fEUR(value[1])}` : fEUR(value), name]} />
                <Legend iconType="plainline" verticalAlign="bottom" height={isMobile ? 78 : 36} wrapperStyle={{ fontSize: 11, paddingTop: 12, lineHeight: '20px', color: T.t2 }} />
                {years > start && <ReferenceLine x={years} stroke={T.t2} strokeDasharray="4 4" />}
                {selected !== undefined && selected >= start && selected <= end && <ReferenceLine x={selected} stroke={VALC} strokeOpacity={.7} />}
                {children}
            </ComposedChart>
        </ResponsiveContainer>
    </div>;
}

function SimulationPage({ config, onChange, onReset, portfolio = [] }: { config: SimulationConfig; onChange: (value: SimulationConfig) => void; onReset: () => void; portfolio?: any[] }) {
    const T = useT(); const { isTablet, isMobile } = useBreakpoint();
    const { th, thR, td, tdR } = useTS();
    const [draft, setDraft] = useState(config);
    const [parametersOpen, setParametersOpen] = useState(false);
    const [selected, setSelected] = useState<number | null>(null);
    const [removeId, setRemoveId] = useState<string | null>(null);
    const [openPocket, setOpenPocket] = useState<string | null>(config.pockets.length === 1 ? config.pockets[0].id : null);
    const [customCrisis, setCustomCrisis] = useState(false);
    const [tableOpen, setTableOpen] = useState(true);
    const [tableStep, setTableStep] = useState('5');
    const [helpOpen, setHelpOpen] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const workerRef = useRef<{ worker: Worker; timer: ReturnType<typeof setTimeout> } | null>(null);
    const [job, setJob] = useState<{ key: string; completed: number; result?: MonteCarloResult; error?: string }>({ key: '', completed: 0 });
    let validationError = '';
    try { readSimulationConfig(draft); } catch (error) { validationError = (error as Error).message; }
    const key = JSON.stringify({ pockets: draft.pockets.map(pocket => [pocket.id, pocket.initialCapital, pocket.annualContribution, pocket.annualReturnRate, pocket.taxRate, pocket.crisisSensitive]), years: draft.years, withdrawal: draft.withdrawal, projection: draft.projection, options: draft.options });
    const baseline = useMemo(() => {
        if (validationError) return { rows: [], error: '' };
        try { return { rows: simulate(draft.pockets, draft.years, draft.withdrawal, draft.projection), error: '' }; }
        catch (error) { return { rows: [], error: (error as Error).message }; }
    }, [key, validationError]);
    const error = validationError || baseline.error;
    const isEmpty = draft.pockets.every(pocket => !(pocket.initialCapital > 0) && !(pocket.annualContribution > 0));
    useEffect(() => {
        if (!draft.stochastic || error || isEmpty) return;
        let active = true;
        setJob({ key, completed: 0 });
        let worker: Worker;
        try { worker = new Worker(new URL('../domain/monteCarlo.worker.ts', import.meta.url), { type: 'module' }); }
        catch { setJob({ key, completed: 0, error: 'Impossible de démarrer le calcul en arrière-plan.' }); return; }
        worker.onmessage = event => {
            if (!active || event.data.key !== key) return;
            const message = event.data;
            if (message.type === 'progress') setJob({ key, completed: message.completed });
            else if (message.type === 'result') {
                setJob({ key, completed: draft.options.paths, result: Object.assign(message.percentiles, { representative: message.representative, medianCapitalRows: message.medianCapitalRows, annualIncomes: message.annualIncomes, income: message.income, incomes: message.incomes }) });
                worker.terminate();
            } else { setJob({ key, completed: 0, error: message.message }); worker.terminate(); }
        };
        worker.onerror = () => { if (active) setJob({ key, completed: 0, error: 'Échec du calcul en arrière-plan.' }); worker.terminate(); };
        const timer = setTimeout(() => worker.postMessage({ key, config: draft }), 350);
        workerRef.current = { worker, timer };
        return () => { active = false; clearTimeout(timer); worker.terminate(); if (workerRef.current?.worker === worker) workerRef.current = null; };
    }, [draft.stochastic, key, error, isEmpty, attempt]);
    const change = (next: SimulationConfig) => {
        setDraft(next);
        try { onChange(readSimulationConfig(next)); } catch { }
    };
    const updatePocket = (id: string, patch: Partial<SimulationPocket>) => change({ ...draft, pockets: draft.pockets.map(pocket => pocket.id === id ? { ...pocket, ...patch } : pocket) });
    const updateOption = (name: keyof SimulationConfig['options'], value: number) => change({ ...draft, options: { ...draft.options, [name]: value } });
    const replacePockets = (pockets: SimulationPocket[], message: string) => {
        if (!isEmpty && !confirm(message)) return;
        change({ ...draft, pockets });
        setOpenPocket(null); setSelected(null);
    };
    const importable = portfolio.filter(pocket => !pocket.closedAt && pocket.valActu > 0);
    const fromPortfolio = () => replacePockets(importable.map((pocket, index) => ({
        ...createSimulationPocket(index, /^#[0-9a-f]{6}$/i.test(pocket.couleur || '') ? pocket.couleur : PCOLS[index % PCOLS.length]),
        name: String(pocket.nom || '').trim().slice(0, 48) || `Poche ${index + 1}`,
        initialCapital: Math.round(pocket.valActu),
        annualReturnRate: typeof pocket.xirr === 'number' && Number.isFinite(pocket.xirr) ? Math.round(Math.min(.12, Math.max(0, pocket.xirr)) * 1000) / 1000 : .05,
    })), 'Remplacer les poches simulées par celles de votre portefeuille ?');
    const loadExample = () => replacePockets(simulationExample(), 'Remplacer les poches simulées par l’exemple ?');
    const addPocket = () => {
        const pocket = createSimulationPocket(draft.pockets.length, PCOLS[draft.pockets.length % PCOLS.length]);
        change({ ...draft, pockets: [...draft.pockets, pocket] });
        setOpenPocket(pocket.id);
    };
    const startManual = () => { setParametersOpen(true); setOpenPocket(draft.pockets[0].id); setTimeout(() => document.getElementById(`simulation-pocket-${draft.pockets[0].id}`)?.querySelector<HTMLInputElement>('input[inputmode]')?.focus(), 50); };
    const matchedCrisis = (Object.keys(CRISIS_PRESETS) as (keyof typeof CRISIS_PRESETS)[]).find(name => (['volatility', 'crisisProbability', 'crisisLossMin', 'crisisLossMax'] as const).every(field => sameRate(CRISIS_PRESETS[name][field], draft.options[field])));
    const crisisMode = !draft.stochastic ? 'none' : customCrisis || !matchedCrisis ? 'custom' : matchedCrisis;
    const setCrisisMode = (mode: string) => {
        if (mode === 'none') { setCustomCrisis(false); change({ ...draft, stochastic: false }); return; }
        if (mode === 'custom') { setCustomCrisis(true); change({ ...draft, stochastic: true }); return; }
        const { label, ...options } = CRISIS_PRESETS[mode as keyof typeof CRISIS_PRESETS];
        setCustomCrisis(false);
        change({ ...draft, stochastic: true, options: { ...draft.options, ...options } });
    };
    const scenarios = draft.stochastic && job.key === key && !error ? job.result : undefined;
    const jobError = draft.stochastic && job.key === key ? job.error : '';
    const busy = !error && !isEmpty && draft.stochastic && (job.key !== key || (!job.result && !job.error));
    const rows = error || isEmpty ? [] : draft.stochastic ? scenarios?.medianCapitalRows || [] : baseline.rows;
    const current = rows[Math.max(0, Math.min((selected ?? draft.years) - 1, rows.length - 1))];
    const final = rows[draft.years - 1];
    const endpoint = rows.at(-1);
    const horizonCapital = scenarios?.[draft.years - 1]?.median ?? final?.capital;
    const horizonMonthlyNet = scenarios?.incomes[0]?.median ?? (final ? final.net / 12 : undefined);
    const projectionCapital = scenarios?.at(-1)?.median ?? endpoint?.capital;
    const projectionMonthlyNet = scenarios?.income.median ?? (endpoint ? endpoint.net / 12 : undefined);
    const medianMonthlyNet = (year: number) => scenarios?.annualIncomes[year - 1]?.median;
    const initial = draft.pockets.reduce((sum, pocket) => sum + (Number.isFinite(pocket.initialCapital) ? pocket.initialCapital : 0), 0);
    const contributions = draft.pockets.reduce((sum, pocket) => sum + (Number.isFinite(pocket.annualContribution) ? pocket.annualContribution : 0), 0);
    const paidAtHorizon = final ? final.pockets.reduce((sum, item) => sum + item.paid, 0) : 0;
    const stacked = !scenarios && !draft.stochastic && draft.pockets.length > 1;
    const plot = [{ year: 0, baseline: initial, median: initial, band: [initial, initial], ...Object.fromEntries(draft.pockets.map((pocket, index) => [`p${index}`, pocket.initialCapital])) }, ...rows.map((row, index) => ({
        year: row.year, baseline: baseline.rows[index]?.capital, median: scenarios?.[index]?.median, band: scenarios?.[index] ? [scenarios[index].low, scenarios[index].high] : undefined,
        ...(stacked ? Object.fromEntries(baseline.rows[index].pockets.map((item, pocketIndex) => [`p${pocketIndex}`, item.capital])) : {}),
    }))];
    const incomePlot = isEmpty ? [] : baseline.rows.slice(draft.years - 1).map((row, index) => ({ ...scenarios?.incomes[index], year: row.year, baseline: row.net / 12 }));
    const money = (value: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(value);
    const selectYear = (year: number) => setSelected(Math.min(year, rows.length || year));
    const exportCsv = () => {
        if (busy || error || !rows.length) return;
        const url = URL.createObjectURL(new Blob([simulationCsv(draft.pockets, rows, scenarios?.annualIncomes)], { type: 'text/csv;charset=utf-8;' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'simulation-patrimoniale.csv'; anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 200);
    };
    const step = Number(tableStep);
    const tableRows = rows.filter(row => step === 1 || row.year === 1 || row.year % step === 0 || row.year === draft.years || row.year === draft.projection || row.year === current?.year);
    const table = (headers: string[], children) => <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingTop: 8 }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}><thead><tr>{headers.map((label, index) => <th key={label} style={index === 0 ? th : thR}>{label}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
    const median = scenarios ? ' médian' : '';
    const withdrawalYears = draft.projection - draft.years;
    const pocketName = (index: number) => draft.pockets[index]?.name || `Poche ${index + 1}`;

    const parameters = <aside id="simulation-parameters" aria-label="Paramètres de simulation" style={{ display: !isTablet || parametersOpen ? 'grid' : 'none', gap: 12, minWidth: 0 }}>
        <SC title="1 · Horizon"><div style={{ display: 'grid', gap: 14, paddingTop: 12 }}>
            <SimulationNumber label="Durée d’épargne" unit="ans" min={1} max={100} integer slider={{ min: 1, max: 50, step: 1 }} value={draft.years} onChange={value => { setSelected(null); change({ ...draft, years: value, projection: Number.isFinite(value) ? Math.max(value, draft.projection) : draft.projection }); }} />
            <SimulationNumber label="Retrait annuel" unit="%" max={100} slider={{ min: 0, max: 10, step: .5 }} value={draft.withdrawal * 100} onChange={value => change({ ...draft, withdrawal: value / 100 })} help="Part du patrimoine retirée chaque année après la phase d’épargne. 4 % est un repère courant, sans garantie." />
            <SimulationNumber label="Fin de projection" unit="ans" min={Number.isFinite(draft.years) ? draft.years : 1} max={150} integer slider={{ min: Number.isFinite(draft.years) ? Math.min(draft.years, 100) : 1, max: 100, step: 1 }} value={draft.projection} onChange={value => { setSelected(null); change({ ...draft, projection: value }); }} help="Nombre total d’années simulées, épargne comprise. Au-delà de la durée d’épargne, les versements cessent et les retraits commencent." />
        </div></SC>
        <SC title="2 · Poches" action={<div style={{ display: 'flex', gap: 6 }}>
            <Btn ghost disabled={!importable.length} onClick={fromPortfolio} title={importable.length ? 'Reprendre la valeur actuelle et le XIRR de vos poches réelles' : 'Aucune poche valorisée dans votre portefeuille'} style={{ padding: '.35rem .6rem', fontSize: '.7rem' }}><Upload size={12} />Portefeuille</Btn>
            <Btn primary onClick={addPocket} style={{ padding: '.35rem .7rem', fontSize: '.7rem' }}><Plus size={12} />Ajouter</Btn>
        </div>}>
            <div style={{ display: 'grid', gap: 12, paddingTop: 12 }}>
                {draft.pockets.map((pocket, index) => <SimulationPocketCard key={pocket.id} pocket={pocket} index={index} open={openPocket === pocket.id} onToggle={() => setOpenPocket(openPocket === pocket.id ? null : pocket.id)} onChange={patch => updatePocket(pocket.id, patch)} onRemove={() => setRemoveId(pocket.id)} canRemove={draft.pockets.length > 1} />)}
            </div>
        </SC>
        <SC title="3 · Crises de marché" action={<InfoBtn {...SIMULATION_CRISIS_HELP} />}><div style={{ display: 'grid', gap: 10, paddingTop: 12 }}>
            <Segmented label="Simulation des crises" value={crisisMode} onChange={setCrisisMode} options={[{ value: 'none', label: 'Aucune' }, { value: 'moderate', label: 'Modérées' }, { value: 'severe', label: 'Sévères' }, { value: 'custom', label: 'Perso.' }]} />
            <div style={{ fontSize: '.66rem', color: T.t2, lineHeight: 1.5 }}>
                {crisisMode === 'none' && 'Rendement constant chaque année, sans volatilité ni crise.'}
                {crisisMode !== 'none' && `${draft.options.paths.toLocaleString('fr-FR')} scénarios · volatilité ${fRate(draft.options.volatility)} · crise ${fRate(draft.options.crisisProbability)}/an · baisse de ${fRate(draft.options.crisisLossMin)} à ${fRate(draft.options.crisisLossMax)}.`}
            </div>
            {crisisMode === 'custom' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
                <SimulationNumber label="Volatilité annuelle" unit="%" max={100} value={draft.options.volatility * 100} onChange={value => updateOption('volatility', value / 100)} help="Écart-type du choc annuel commun aux seules poches exposées aux crises, ajouté à leur rendement estimé. 0 % supprime ces variations." />
                <SimulationNumber label="Crise par an" unit="%" max={100} value={draft.options.crisisProbability * 100} onChange={value => updateOption('crisisProbability', value / 100)} help="Probabilité indépendante chaque année. 5 % correspond à une crise tous les 20 ans en moyenne, sans calendrier garanti." />
                <SimulationNumber label="Baisse minimale" unit="%" max={draft.options.crisisLossMax * 100} value={draft.options.crisisLossMin * 100} onChange={value => updateOption('crisisLossMin', value / 100)} help="À chaque crise, une baisse est tirée uniformément entre les deux bornes et appliquée après le rendement aux poches exposées." />
                <SimulationNumber label="Baisse maximale" unit="%" min={draft.options.crisisLossMin * 100} max={100} value={draft.options.crisisLossMax * 100} onChange={value => updateOption('crisisLossMax', value / 100)} help="Borne supérieure de la perte de crise. Min = max reproduit une perte fixe. +5 % puis −30 % donne −26,5 %." />
            </div>}
        </div></SC>
    </aside>;

    const emptyState = <SC><div style={{ display: 'grid', justifyItems: 'center', textAlign: 'center', gap: 12, padding: isMobile ? '1.5rem .5rem' : '3rem 2rem' }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, display: 'grid', placeItems: 'center', background: `${VALC}18`, color: VALC }}><ChartNoAxesCombined size={24} /></div>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Que pourrait devenir votre épargne ?</h3>
        <p style={{ margin: 0, maxWidth: 460, color: T.t2, fontSize: '.76rem', lineHeight: 1.6 }}>Renseignez un capital de départ ou un versement annuel pour estimer votre patrimoine futur et le revenu net qu’il pourrait vous verser. Ces poches simulées n’affectent pas vos placements réels.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
            <Btn primary onClick={loadExample}><ChartNoAxesCombined size={13} />Charger un exemple</Btn>
            {importable.length > 0 && <Btn ghost onClick={fromPortfolio}><Upload size={13} />Partir de mon portefeuille</Btn>}
            <Btn ghost onClick={startManual}><Pencil size={13} />Saisir mes poches</Btn>
        </div>
    </div></SC>;

    return <div className="simulation" style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div><h2 style={{ margin: 0, fontSize: '.95rem', color: T.t1 }}>Simulation patrimoniale</h2><div style={{ fontSize: '.68rem', color: T.t2, marginTop: 3 }}>Projetez votre épargne et testez sa résistance aux crises, sans toucher à vos placements réels.</div></div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Btn ghost onClick={() => setHelpOpen(true)} style={{ padding: '.4rem .7rem', fontSize: '.72rem' }}>Comment lire ?</Btn>
                <Btn ghost onClick={() => { if (confirm('Réinitialiser uniquement les paramètres de simulation ?')) onReset(); }} title="Réinitialiser la simulation" aria-label="Réinitialiser la simulation" style={{ padding: 8 }}><RotateCcw size={16} /></Btn>
            </div>
        </div>
        {isTablet && <Btn ghost onClick={() => setParametersOpen(!parametersOpen)} aria-expanded={parametersOpen} aria-controls="simulation-parameters" style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}><span style={{ display: 'flex', gap: 6, alignItems: 'center', minWidth: 0 }}><SlidersHorizontal size={15} />Paramètres<span style={{ color: T.t2, fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {draft.pockets.length} poche{draft.pockets.length > 1 ? 's' : ''} · {draft.years} ans · {crisisMode === 'none' ? 'sans crises' : 'avec crises'}</span></span><ChevronDown size={15} style={{ transform: parametersOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }} /></Btn>}
        <div style={{ display: 'grid', gridTemplateColumns: isTablet ? 'minmax(0,1fr)' : '340px minmax(0,1fr)', gap: '1rem', alignItems: 'start' }}>
            {parameters}
            <div style={{ display: 'grid', gap: '1rem', minWidth: 0 }} aria-live="polite">
                {error && <div role="alert" style={{ color: LOSSC, padding: 12, border: `1px solid ${LOSSC}50`, borderRadius: 8 }}>{error}. Vérifiez les champs de simulation.{isTablet && !parametersOpen && <Btn ghost onClick={() => setParametersOpen(true)} style={{ marginTop: 8 }}>Paramètres</Btn>}</div>}
                {!error && isEmpty && emptyState}
                {busy && <SC title="Calcul des scénarios de crises"><div role="status" style={{ paddingTop: 10, display: 'grid', gap: 10 }}><span style={{ fontSize: '.75rem', color: T.t2 }}>{job.key === key && job.completed === draft.options.paths ? 'Scénarios générés · calcul des percentiles et des résultats…' : `${job.key === key ? job.completed.toLocaleString('fr-FR') : 0} / ${draft.options.paths.toLocaleString('fr-FR')} scénarios · ${Math.floor((job.key === key ? job.completed : 0) / draft.options.paths * 100)} %`}</span><progress aria-label={job.key === key && job.completed === draft.options.paths ? 'Calcul des percentiles et des résultats' : 'Progression de la simulation crises'} max={draft.options.paths} value={job.key === key && job.completed === draft.options.paths ? undefined : job.key === key ? job.completed : 0} style={{ width: '100%', accentColor: ACC }} /><Btn ghost onClick={() => { if (workerRef.current) { clearTimeout(workerRef.current.timer); workerRef.current.worker.onmessage = null; workerRef.current.worker.onerror = null; workerRef.current.worker.terminate(); workerRef.current = null; } setJob({ key, completed: 0, error: 'Calcul annulé.' }); }} style={{ justifySelf: 'start' }}><Square size={12} />Annuler</Btn></div></SC>}
                {!error && jobError && <div role="alert" style={{ color: AMB, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>{jobError}<Btn ghost onClick={() => setAttempt(value => value + 1)}><RotateCcw size={13} />Relancer</Btn></div>}
                {final && endpoint && <>
                    <div style={{ padding: '1rem 1.1rem', borderRadius: 12, background: `linear-gradient(135deg,${VALC}14,${GRN}0d)`, border: `1px solid ${VALC}30`, fontSize: '.82rem', lineHeight: 1.7, color: T.t1 }}>
                        En partant de <strong>{fEUR(initial)}</strong>{contributions > 0 && <> et en versant <strong>{fEUR(contributions)} par an</strong> ({fEUR(contributions / 12)}/mois)</>} pendant <strong>{draft.years} ans</strong>, vous pourriez atteindre <strong style={{ color: VALC }}>{fEUR(horizonCapital)}</strong>{scenarios && ' dans le scénario médian'}.{' '}
                        {withdrawalYears > 0
                            ? <>En retirant {fRate(draft.withdrawal)} par an, cela représenterait environ <strong style={{ color: GRN }}>{money(horizonMonthlyNet!)} nets par mois</strong> au départ, et il resterait <strong>{fEUR(projectionCapital)}</strong> après {withdrawalYears} ans de retraits.</>
                            : <>Un retrait de {fRate(draft.withdrawal)} par an représenterait environ <strong style={{ color: GRN }}>{money(horizonMonthlyNet!)} nets par mois</strong>.</>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,minmax(0,1fr))' : 'repeat(4,minmax(0,1fr))', gap: 10 }}>
                        <KpiCard label="Revenu net / mois" value={fEUR(horizonMonthlyNet)} sub={`Dès ${draft.years} ans${median}`} color={GRN} />
                        <KpiCard label={`Patrimoine à ${draft.years} ans`} value={fEUR(horizonCapital)} sub={`Avant retraits${median}`} color={VALC} />
                        <KpiCard label="Total versé" value={fEUR(paidAtHorizon)} sub={`Gains : ${fEUR((horizonCapital ?? 0) - paidAtHorizon)}`} color={T.t1} />
                        <KpiCard label={`Restant à ${draft.projection} ans`} value={fEUR(projectionCapital)} sub={withdrawalYears > 0 ? `Après ${withdrawalYears} ans de retraits${median}` : 'Aucun retrait simulé'} color={AMB} />
                    </div>
                    <SC title="Évolution du patrimoine" action={<InfoBtn {...SIMULATION_REFERENCE_HELP} />}>
                        <div role="region" aria-label="Graphique de l’évolution du patrimoine"><SimulationPlot data={plot} years={draft.years} end={draft.projection} selected={current?.year} onSelect={selectYear}>
                            {stacked && draft.pockets.map((pocket, index) => <Area key={pocket.id} isAnimationActive={false} type="linear" stackId="pockets" dataKey={`p${index}`} name={pocket.name} stroke={pocket.color} strokeWidth={1} fill={pocket.color} fillOpacity={.22} />)}
                            {scenarios && <><Area isAnimationActive={false} type="linear" dataKey="band" name="Fourchette P10–P90" stroke="none" fill={VALC} fillOpacity={.16} /><Line isAnimationActive={false} type="linear" dataKey="median" name="Médiane des scénarios" stroke={VALC} dot={false} strokeWidth={2.5} /></>}
                            <Line isAnimationActive={false} type="linear" dataKey="baseline" name={stacked ? 'Total' : 'Rendement constant'} stroke={T.t1} dot={false} strokeDasharray={stacked ? undefined : '5 5'} strokeWidth={stacked ? 2 : 1.5} />
                        </SimulationPlot></div>
                    </SC>
                    <SC title="Revenus mensuels nets" action={<InfoBtn {...SIMULATION_REFERENCE_HELP} />}>
                        <SimulationPlot data={incomePlot} years={draft.years} start={draft.years} end={draft.projection} selected={current?.year} onSelect={selectYear}>
                            {scenarios && <><Line isAnimationActive={false} type="linear" dataKey="low" name="P10" stroke={LOSSC} dot={draft.years === draft.projection} strokeWidth={2} />
                                <Line isAnimationActive={false} type="linear" dataKey="median" name="Médiane" stroke={VALC} dot={draft.years === draft.projection} strokeWidth={2.5} />
                                <Line isAnimationActive={false} type="linear" dataKey="high" name="P90" stroke={AMB} dot={draft.years === draft.projection} strokeWidth={2} /></>}
                            <Line isAnimationActive={false} type="linear" dataKey="baseline" name="Rendement constant" stroke={GRN} dot={draft.years === draft.projection} strokeDasharray={scenarios ? '5 5' : undefined} strokeWidth={2} />
                        </SimulationPlot>
                        {scenarios && table([`À ${draft.projection} ans`, 'Pessimiste (P10)', 'Médiane', 'Optimiste (P90)', 'Rendement constant'], <><tr><th style={td}>Patrimoine</th>{[scenarios.at(-1)!.low, scenarios.at(-1)!.median, scenarios.at(-1)!.high, baseline.rows.at(-1)!.capital].map((value, index) => <td key={index} style={tdR}>{fEUR(value)}</td>)}</tr><tr><th style={td}>Net mensuel{draft.years === draft.projection ? ' potentiel' : ''}</th>{[scenarios.income.low, scenarios.income.median, scenarios.income.high, baseline.rows.at(-1)!.net / 12].map((value, index) => <td key={index} style={{ ...tdR, color: GRN }}>{money(value)}</td>)}</tr></>)}
                    </SC>
                    {current && <SC title={`Détail par poche · année ${current.year}`} noPad action={<label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: '.65rem', color: T.t2 }}>Année<select aria-label="Année du détail patrimonial" value={current.year} onChange={event => setSelected(Number(event.target.value))} style={{ background: T.inp, color: T.t1, border: `1px solid ${T.brd}`, borderRadius: 6, padding: 4 }}>{rows.map(row => <option key={row.year} value={row.year}>{row.year}</option>)}</select></label>}>
                        {table(['Poche', 'Patrimoine', 'Base restante', 'Gains / pertes', scenarios ? 'Net du scénario / mois' : 'Net / mois'], <>{current.pockets.map((item, index) => <TRow key={draft.pockets[index].id}><th style={{ ...td, textAlign: 'left' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Dot c={draft.pockets[index].color} sz={7} />{pocketName(index)}</span></th><td style={tdR}>{fEUR(item.capital)}</td><td style={tdR}>{fEUR(item.basis)}</td><td style={{ ...tdR, color: gc(item.gains) }}>{fEUR(item.gains)}</td><td style={{ ...tdR, color: GRN, fontWeight: 700 }}>{money(item.net / 12)}</td></TRow>)}<tr><th style={{ ...td, textAlign: 'left' }}>Total{median}</th><td style={{ ...tdR, fontWeight: 700 }}>{fEUR(current.capital)}</td><td style={tdR}>{fEUR(current.pockets.reduce((sum, item) => sum + item.basis, 0))}</td><td style={tdR}>{fEUR(current.pockets.reduce((sum, item) => sum + item.gains, 0))}</td><td style={{ ...tdR, color: GRN, fontWeight: 700 }}>{money(current.net / 12)}</td></tr></>)}
                        {scenarios && <div style={{ padding: '12px 16px', fontSize: '.7rem', color: T.t2 }}>Net médian du portefeuille{current.year <= draft.years ? ' (potentiel)' : ''} : <strong style={{ color: GRN }}>{money(medianMonthlyNet(current.year)!)} / mois</strong> · le détail ci-dessus provient d’un scénario au patrimoine médian.</div>}
                    </SC>}
                </>}
            </div>
        </div>
        {rows.length > 0 && <div style={{ marginTop: '1rem', minWidth: 0 }}><SC title={scenarios ? 'Projection annuelle · médianes' : 'Projection annuelle'} noPad action={<div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Btn ghost onClick={() => setTableOpen(!tableOpen)} aria-expanded={tableOpen} aria-controls="simulation-annual-table" style={{ padding: '.35rem .6rem', fontSize: '.7rem' }}>{tableOpen ? 'Masquer' : `Afficher (${rows.length} ans)`}<ChevronDown size={13} style={{ transform: tableOpen ? 'rotate(180deg)' : 'none' }} /></Btn><Btn ghost disabled={busy || !!error || !rows.length} onClick={exportCsv} style={{ padding: '.35rem .6rem', fontSize: '.7rem' }}><Download size={13} />CSV</Btn></div>}>
            {tableOpen && <div id="simulation-annual-table">
                <div style={{ padding: '12px 16px 0', maxWidth: 260 }}><Segmented label="Pas du tableau" value={tableStep} onChange={setTableStep} options={[{ value: '1', label: 'Chaque année' }, { value: '5', label: 'Tous les 5 ans' }]} /></div>
                {table(['Année', `Patrimoine${median}`, 'Versé cumulé', 'Base restante', 'Gains / pertes', scenarios ? 'Impôt du scénario / an' : 'Impôt / an', scenarios ? 'Net du scénario / mois' : 'Net / mois', ...(scenarios ? ['Net médian / mois'] : [])], tableRows.map(row => <TRow key={row.year} onClick={() => setSelected(row.year)}><th style={{ ...td, textAlign: 'left' }}><button type="button" onClick={event => { event.stopPropagation(); setSelected(row.year); }} aria-label={`Afficher le détail de l’année ${row.year}`} aria-pressed={row.year === current?.year} style={{ background: row.year === current?.year ? VALC + '18' : 'transparent', color: row.year === current?.year ? VALC : T.t1, border: 'none', borderRadius: 5, padding: '4px 8px', cursor: 'pointer' }}>{row.year}{row.year === draft.years ? ' · fin épargne' : ''}</button></th><td style={tdR}>{fEUR(row.capital)}</td><td style={tdR}>{fEUR(row.pockets.reduce((sum, item) => sum + item.paid, 0))}</td><td style={tdR}>{fEUR(row.pockets.reduce((sum, item) => sum + item.basis, 0))}</td><td style={{ ...tdR, color: gc(row.pockets.reduce((sum, item) => sum + item.gains, 0)) }}>{fEUR(row.pockets.reduce((sum, item) => sum + item.gains, 0))}</td><td style={tdR}>{money(row.tax)}</td><td style={{ ...tdR, color: GRN }}>{money(row.net / 12)}</td>{scenarios && <td style={{ ...tdR, color: GRN, fontWeight: 700 }}>{money(medianMonthlyNet(row.year)!)}</td>}</TRow>))}
            </div>}
        </SC></div>}
        <div style={{ color: T.t2, fontSize: '.65rem', lineHeight: 1.6, marginTop: 12 }}>Estimation indicative, hors frais et inflation · revenus potentiels jusqu’à {draft.years} ans, retraits effectifs ensuite · aucun conseil fiscal ni garantie de résultat.</div>
        {helpOpen && <InfoModal {...SIMULATION_HELP} onClose={() => setHelpOpen(false)} />}
        {removeId && <ConfirmDel msg={`Supprimer « ${draft.pockets.find(pocket => pocket.id === removeId)?.name || 'cette poche'} » ?`} onCancel={() => setRemoveId(null)} onOk={() => { if (draft.pockets.length > 1) change({ ...draft, pockets: draft.pockets.filter(pocket => pocket.id !== removeId) }); setRemoveId(null); }} />}
    </div>;
}

// ── App root ──
export default function App() {
    const [mode, setMode] = useState('dark');
    const [page, setPage] = useState('dashboard');
    const [selP, setSelP] = useState(null);
    const [ps, setPs] = useState<Pocket[]>([]);
    const [ts, setTs] = useState<Transaction[]>([]);
    const [vs, setVs] = useState<Valuation[]>([]);
    const [simulation, setSimulation] = useState<SimulationConfig>(createSimulationConfig);
    const [simulationRevision, setSimulationRevision] = useState(0);
    const [simulationNotice, setSimulationNotice] = useState('');
    const [ready, setReady] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [persistence] = useState(() => createPortfolioPersistence(window.storage));
    const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error' | 'conflict'>('saving');
    const [saveError, setSaveError] = useState('');
    const [saveAttempt, setSaveAttempt] = useState(0);
    const externalChange = useRef(false);
    const rawBackup = useRef('');
    const [dataMode, setDataMode] = useState('empty');
    const [showWelcome, setShowWelcome] = useState(false);
    const [needsExport, setNeedsExport] = useState(false);
    const [modal, setModal] = useState(null);
    const T = useMemo(() => mode === 'dark' ? createDarkTheme() : createLightTheme(), [mode]);
    const { isMobile } = useBreakpoint();

    const reportSaveError = (error: unknown) => {
        const conflict = error instanceof StorageConflictError;
        if (conflict) externalChange.current = true;
        setSaveStatus(conflict ? 'conflict' : 'error');
        setSaveError(conflict ? error.message : 'La sauvegarde locale a échoué. Vos modifications restent à l’écran mais ne sont pas enregistrées. Exportez-les avant de quitter.');
    };

    useEffect(() => {
        (async () => {
            try {
                const r = await persistence.read();
                if (r) {
                    rawBackup.current = r.value;
                    const d = JSON.parse(r.value);
                    const portfolio = readPortfolioData(d);
                    if (!portfolio && d.s === undefined) throw new Error('Format non reconnu');
                    setPs(portfolio?.pockets || []); setTs(portfolio?.transactions || []); setVs(portfolio?.valuations || []); setDataMode(d.source === 'file' ? 'file' : 'saved'); setShowWelcome(false);
                    if (d.s !== undefined) {
                        try { setSimulation(readSimulationConfig(d.s)); }
                        catch { setSimulationNotice('Les paramètres de simulation sauvegardés étaient invalides et ont été réinitialisés. Votre portefeuille est conservé.'); }
                    }
                } else {
                    setPs([]); setTs([]); setVs([]); setDataMode('empty'); setShowWelcome(true);
                }
            }
            catch (err) { setLoadError(err.message || 'Lecture de la sauvegarde impossible.'); setShowWelcome(false); }
            setReady(true);
        })();
    }, []);
    useEffect(() => {
        if (!ready || loadError || showWelcome || dataMode === 'demo' || externalChange.current) return;
        let active = true;
        setSaveStatus('saving');
        persistence.save(JSON.stringify({ p: ps, t: ts, v: vs, s: simulation, source: dataMode === 'file' ? 'file' : 'saved' }))
            .then(() => { if (active && !externalChange.current) { setSaveStatus('saved'); setSaveError(''); } })
            .catch(error => { if (active) reportSaveError(error); });
        return () => { active = false; };
    }, [ps, ts, vs, simulation, ready, loadError, showWelcome, dataMode, saveAttempt]);
    useEffect(() => {
        const onStorage = (event: StorageEvent) => {
            if (event.key !== PORTFOLIO_STORAGE_KEY && event.key !== null) return;
            if (event.storageArea && event.storageArea !== window.localStorage) return;
            window.storage.get(PORTFOLIO_STORAGE_KEY).then(current => {
                if (persistence.hasExternalChange(current?.value ?? null)) reportSaveError(new StorageConflictError());
            }).catch(reportSaveError);
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, [persistence]);

    const pm = useMemo(() => ps.map(p => ({ ...p, ...getPocketMetrics(p.id, ts, vs, p.closedAt) })), [ps, ts, vs]);
    const categories = useMemo(() => [...new Set(ps.map(p => p.categorie?.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr-FR')), [ps]);
    const gm = useMemo(() => getPortfolioMetrics(ps, ts, vs, pm), [pm, ps, ts, vs]);

    const markPersonal = () => { setDataMode(m => m === 'file' ? 'file' : 'saved'); setNeedsExport(true); setShowWelcome(false); };
    const startEmpty = () => { if (loadError && !window.confirm('Remplacer la sauvegarde locale par un portefeuille vide ? Téléchargez d’abord la copie originale.')) return; setLoadError(''); setPs([]); setTs([]); setVs([]); setDataMode('empty'); setNeedsExport(false); setShowWelcome(false); setSelP(null); setPage('dashboard'); };
    const useDemoAsBase = () => { setDataMode('saved'); setNeedsExport(true); setShowWelcome(false); };
    const disconnectFile = async () => {
        try {
            await persistence.remove();
        } catch (error) { reportSaveError(error); return; }
        setSaveStatus('saved'); setSaveError('');
        setPs([]); setTs([]); setVs([]); setDataMode('empty'); setNeedsExport(false); setShowWelcome(true); setSelP(null); setPage('dashboard'); setModal(null);
    };

    const handleSaisie = (pocheId, txData, valeur, date, note = '', updatedValue?: number) => {
        try {
            assertPocketWritable(ps, pocheId);
            assertHistoryEditable(pocheId, date, vs);
            const movement = txData?.type === 'retrait' ? prepareWithdrawal(pocheId, txData.montant, date, vs, updatedValue, ts)
                : txData ? prepareContribution(pocheId, txData.montant, date, vs, ts, valeur ?? undefined) : null;
            const transactionId = txData ? uid() : undefined;
            const nextTs = txData ? [...ts, { id: transactionId, type: txData.type, montant: txData.montant, timestamp: date, pocheId, commentaire: txData.commentaire || note, valeurAvant: movement.valueBefore, ...(movement.estimated ? { valeurAvantEstimee: true } : {}) }] : ts;
            const nextVs = movement || valeur != null ? [...vs, { id: uid(), pocheId, valeur: movement ? movement.valueAfter : valeur, date, commentaire: note, ...(movement ? { transactionId } : {}), ...(movement?.estimated ? { estimee: true } : {}) }] : vs;
            validatePortfolio(ps, nextTs, nextVs);
            markPersonal(); setTs(nextTs); setVs(nextVs); setModal(null);
        }
        catch (err) { alert(err.message); return; }
    };
    const handleCompleteWithdrawal = (transaction, valueBefore, estimate?: WithdrawalValueEstimate) => {
        try {
            const next = completeWithdrawalValue(ps, ts, vs, transaction, valueBefore, estimate);
            markPersonal(); setTs(next); return '';
        }
        catch (err) { return err.message || 'La correction n’a pas pu être enregistrée.'; }
    };
    const addP = p => { markPersonal(); setPs(pr => [...pr, { ...p, id: uid(), createdAt: TODAY }]); setModal(null); };
    const delP = id => { markPersonal(); setPs(p => p.filter(x => x.id !== id)); setTs(p => p.filter(t => t.pocheId !== id)); setVs(p => p.filter(v => v.pocheId !== id)); };
    const updateP = (id, patch) => {
        const next = ps.map(p => p.id === id ? { ...p, ...patch } : p);
        try { validatePocketClosures(next, ts, vs); }
        catch (err) { alert(err.message); return false; }
        markPersonal(); setPs(next); return true;
    };
    const delTx = id => {
        if (!id) return;
        const transaction = ts.find(t => t.id === id); if (!transaction) return;
        const linkedIndex = vs.findIndex(v => v.transactionId === id);
        try {
            assertPocketWritable(ps, transaction.pocheId);
            assertHistoryEditable(transaction.pocheId, transaction.timestamp, vs, linkedIndex);
        }
        catch (err) { alert(err.message); return; }
        markPersonal(); setTs(p => p.filter(t => t.id !== id)); setVs(p => p.filter(v => v.transactionId !== id));
    };
    const delV = id => {
        if (!id) return;
        const valuation = vs.find(v => v.id === id); if (!valuation) return;
        try {
            assertPocketWritable(ps, valuation.pocheId);
            assertHistoryEditable(valuation.pocheId, valuation.date, vs, vs.indexOf(valuation));
        }
        catch (err) { alert(err.message); return; }
        if (valuation.transactionId) { alert('Cette valeur est liée à un mouvement. Supprimez la transaction correspondante.'); return; }
        markPersonal(); setVs(p => p.filter(v => v.id !== id));
    };

    const expJSON = () => {
        try {
            const bl = new Blob([JSON.stringify({ poches: ps, transactions: ts, valorisations: vs, simulation }, null, 2)], { type: 'application/json;charset=utf-8' });
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
                const result = ev.target?.result;
                if (typeof result !== 'string') throw new Error('Lecture du fichier impossible.');
                const d = JSON.parse(result);
                const importedSimulation = d.simulation !== undefined ? readSimulationConfig(d.simulation) : undefined;
                const portfolio = readPortfolioData(d);
                if (!portfolio && !importedSimulation) throw new Error('Format non reconnu');
                if (portfolio) { setLoadError(''); setPs(portfolio.pockets); setTs(portfolio.transactions); setVs(portfolio.valuations); setDataMode('file'); setNeedsExport(false); setShowWelcome(false); setSelP(null); setPage('dashboard'); }
                if (importedSimulation) { setSimulation(importedSimulation); setSimulationRevision(revision => revision + 1); setSimulationNotice(''); }
            }
            catch (err) { alert('Fichier invalide : ' + err.message); }
        };
        r.readAsText(f); e.target.value = '';
    };

    const saveWarning = saveError && <div role="alert" style={{ display: 'grid', gap: 10, padding: 12, marginBottom: 12, color: AMB, background: T.s1, border: `1px solid ${AMB}60`, borderRadius: 8 }}>
        <strong>{saveStatus === 'conflict' ? 'Conflit de sauvegarde' : 'Sauvegarde locale impossible'}</strong>
        <span>{saveError}</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn ghost onClick={expJSON}><Download size={14} />Exporter mes modifications</Btn>
            {saveStatus === 'conflict'
                ? <Btn ghost onClick={() => { if (!needsExport || window.confirm('Recharger les données enregistrées ? Les modifications non exportées de cet onglet seront perdues.')) window.location.reload(); }}><RotateCcw size={14} />Recharger les données</Btn>
                : <Btn ghost onClick={() => setSaveAttempt(attempt => attempt + 1)}><RotateCcw size={14} />Réessayer la sauvegarde</Btn>}
        </div>
    </div>;
    const detailPoche = selP ? ps.find(p => p.id === selP) : null;
    const renderModal = () => {
        if (!modal) return null;
        if (modal.type === 'saisie') return <ModalSaisie poches={ps.filter(p => !p.closedAt)} txs={ts} vals={vs} defPoche={modal.poche} onSave={handleSaisie} onClose={() => setModal(null)} />;
        if (modal.type === 'repairHistory') return <ModalRepairHistory poches={ps} txs={ts} vals={vs} pocheId={modal.poche} transaction={modal.transaction} onSave={handleCompleteWithdrawal} onReopen={poche => setModal({ type: 'reopen', poche, repairHistory: true, repairPocket: modal.poche })} onClose={() => setModal(null)} persistenceNotice={saveWarning} />;
        if (modal.type === 'closePocket') return <ModalClosePocket poche={modal.poche} txs={ts} vals={vs} onSave={(id, date) => { if (updateP(id, { closedAt: date })) setModal(null); }} onClose={() => setModal(null)} />;
        if (modal.type === 'reopen') return <ConfirmDel title="Rouvrir la poche" msg={`Rouvrir « ${modal.poche.nom} » ? Les transactions et valorisations existantes seront conservées.`} okLabel="Rouvrir" danger={false} onOk={() => { if (updateP(modal.poche.id, { closedAt: undefined })) setModal(modal.repairHistory ? { type: 'repairHistory', poche: modal.repairPocket } : null); }} onCancel={() => setModal(modal.repairHistory ? { type: 'repairHistory', poche: modal.repairPocket } : null)} />;
        if (modal.type === 'p') return <ModalPoche onAdd={addP} onClose={() => setModal(null)} count={ps.length} categories={categories} />;
        if (modal.type === 'editPoche') return <ModalEditPoche poche={modal.poche} categories={categories} onSave={(id, patch) => { if (updateP(id, patch)) setModal(null); }} onClose={() => setModal(null)} />;
        if (modal.type === 'confirm') return <ConfirmDel msg={modal.msg} onOk={() => { modal.onOk(); setModal(null); }} onCancel={() => setModal(null)} />;
        if (modal.type === 'disconnect') return <ConfirmDel title="Déconnecter le fichier" msg="La copie locale sera effacée de ce navigateur. Vos données restent dans votre fichier exporté, mais elles ne seront plus chargées ici." okLabel="Déconnecter" onOk={() => { disconnectFile(); setModal(null); }} onCancel={() => setModal(null)} />;
        return null;
    };

    if (!ready) return <div style={{ background: '#0A0A0E', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3E3E50', fontSize: '.82rem' }}>Chargement…</div>;
    if (loadError) return <TC.Provider value={T}><main style={{ minHeight: '100vh', background: T.bg, color: T.t1, padding: 24, boxSizing: 'border-box' }}>
        <h1 style={{ fontSize: '1.2rem' }}>Sauvegarde locale non chargée</h1>
        <p role="alert">{loadError}</p><p>La copie originale est conservée. Importez un fichier corrigé ou téléchargez-la avant de recommencer.</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Btn ghost disabled={!rawBackup.current} onClick={() => { const url = URL.createObjectURL(new Blob([rawBackup.current], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'investtrack_recuperation.json'; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 200); }}><Download size={14} />Copie originale</Btn>
            <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}><Upload size={14} />Importer<input type="file" accept=".json" onChange={impJSON} style={{ maxWidth: '100%' }} /></label>
            <Btn danger onClick={startEmpty}>Recommencer à vide</Btn>
        </div>
    </main></TC.Provider>;

    const appBg = mode === 'dark' ? `radial-gradient(ellipse 60% 50% at 8% 92%,${ACC}12 0%,transparent 50%),radial-gradient(ellipse 50% 40% at 92% 8%,rgba(255,100,80,0.07) 0%,transparent 45%),#0A0A0E` : T.bg;
    const mainPb = isMobile ? 'calc(76px + env(safe-area-inset-bottom, 0px))' : '1.25rem';

    return (
        <TC.Provider value={T}>
            <div style={{ minHeight: '100vh', background: appBg, color: T.t1, fontFamily: 'system-ui,-apple-system,sans-serif', fontSize: '13px', lineHeight: 1.5 }}>
                <TopBar page={page} selP={selP} setPage={setPage} setSelP={setSelP} mode={mode} setMode={setMode} setModal={setModal} expJSON={expJSON} impJSON={impJSON} dataMode={dataMode} disconnectFile={() => setModal({ type: 'disconnect' })} onHome={() => { setSelP(null); setShowWelcome(true); }} />
                <main style={{ maxWidth: 1240, margin: '0 auto', padding: `1.1rem 1rem ${mainPb}` }}>
                    {modal?.type !== 'repairHistory' && saveWarning}
                    <ExportReminder show={needsExport && !showWelcome} onExport={expJSON} saved={saveStatus === 'saved'} />
                    {simulationNotice && <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, marginBottom: 12, color: AMB, background: T.s1, border: `1px solid ${T.brd}`, borderRadius: 8 }}>{simulationNotice}<Btn ghost aria-label="Fermer l’avertissement" onClick={() => setSimulationNotice('')} style={{ padding: 6 }}><X size={13} /></Btn></div>}
                    {detailPoche
                        ? <PocheDetail poche={detailPoche} txs={ts} vals={vs} onBack={() => setSelP(null)} onDelTx={delTx} onDelVal={delV} onDelPoche={delP} setModal={setModal} />
                        : page === 'dashboard'
                            ? <Dashboard pm={pm} gm={gm} ts={ts} vs={vs} ps={ps} setSelP={setSelP} setModal={setModal} dataMode={dataMode} impJSON={impJSON} startEmpty={startEmpty} useDemoAsBase={useDemoAsBase} />
                            : page === 'simulation'
                                ? <SimulationPage key={simulationRevision} portfolio={pm} config={simulation} onChange={value => { setSimulation(value); setNeedsExport(true); }} onReset={() => { setSimulation(createSimulationConfig()); setSimulationRevision(revision => revision + 1); setNeedsExport(true); }} />
                                : <PochesPage pm={pm} vs={vs} ts={ts} gm={gm} setSelP={setSelP} setModal={setModal} />
                    }
                </main>
            </div>
            {renderModal()}
            {showWelcome && <WelcomeModal onEmpty={startEmpty} canClose={dataMode !== 'empty'} onClose={() => setShowWelcome(false)} mode={mode} setMode={setMode} />}
        </TC.Provider>
    );
}
