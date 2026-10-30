import { describe, expect, it } from 'vitest';
import { assertHistoryEditable, assertPocketWritable, buildPocketHistory, buildPortfolioHistory, calculateXirr, completeWithdrawalHistory, completeWithdrawalValue, estimateWithdrawalValue, getAnnualPerformanceRows, getPocketMetrics, getPortfolioMetrics, prepareContribution, prepareWithdrawal, readPortfolioData, validatePortfolio, validatePocketClosures, type Transaction, type Valuation } from './portfolioAnalytics';
import { DEMO_POCKETS, DEMO_TRANSACTIONS, DEMO_VALUATIONS } from '../data/demoData';

const pocket = { id: 'closed', closedAt: '2025-06-01' };
const transactions: Transaction[] = [
    { pocheId: pocket.id, type: 'apport', montant: 100, timestamp: '2025-01-01' },
    { pocheId: pocket.id, type: 'retrait', montant: 120, timestamp: pocket.closedAt },
];
const valuations: Valuation[] = [
    { pocheId: pocket.id, valeur: 100, date: '2025-01-01' },
    { pocheId: pocket.id, valeur: 0, date: pocket.closedAt },
];

describe('annualized return', () => {
    it('does not invent a return for offsetting flows on the same day', () => {
        expect(calculateXirr([{ date: '2025-01-01', amount: -100 }, { date: '2025-01-01', amount: 100 }])).toBeNull();
        expect(calculateXirr([{ date: '2025-01-01', amount: -100 }, { date: '2025-01-01', amount: 100 }, { date: '2025-06-01', amount: -50 }, { date: '2025-06-01', amount: 50 }])).toBeNull();
        expect(getPocketMetrics('pea', [{ pocheId: 'pea', type: 'apport', montant: 100, timestamp: '2025-01-01' }], [{ pocheId: 'pea', valeur: 100, date: '2025-01-01' }]).xirr).toBeNull();
    });

    it('keeps a measurable return across distinct dates', () => {
        expect(calculateXirr([{ date: '2025-01-01', amount: -100 }, { date: '2026-01-01', amount: 110 }])).toBeCloseTo(.1, 3);
    });
});

describe('withdrawal valuation', () => {
    const values: Valuation[] = [{ pocheId: 'pea', valeur: 9800, date: '2025-01-01' }];

    it('blocks 9865 from a known value of 9800 until explicitly updated', () => {
        expect(() => prepareWithdrawal('pea', 9865, '2025-06-01', values)).toThrow(/Actualisez/);
        expect(prepareWithdrawal('pea', 9865, '2025-06-01', values, 9865)).toEqual({ valueBefore: 9865, valueAfter: 0 });
        expect(values[0].valeur).toBe(9800);
    });

    it('computes the remaining value, not the net invested capital', () => {
        expect(prepareWithdrawal('pea', 1000, '2025-06-01', values)).toEqual({ valueBefore: 9800, valueAfter: 8800 });
        const result = prepareWithdrawal('pea', 9800, '2025-06-01', values);
        expect(result.valueAfter).toBe(0);
        const finalValues = [...values, { pocheId: 'pea', valeur: result.valueAfter, date: '2025-06-01' }];
        expect(() => validatePocketClosures([{ id: 'pea', closedAt: '2025-06-01' }], [], finalValues)).not.toThrow();
    });

    it('uses the last value at the selected date, including consecutive same-day withdrawals', () => {
        const later = [...values, { pocheId: 'pea', valeur: 8800, date: '2025-06-01' }, { pocheId: 'pea', valeur: 12000, date: '2025-12-01' }];
        expect(prepareWithdrawal('pea', 800, '2025-06-01', later).valueAfter).toBe(8000);
        expect(() => prepareWithdrawal('pea', 10000, '2025-06-01', later)).toThrow();
        expect(() => prepareWithdrawal('pea', 1, '2024-01-01', later)).toThrow(/avant le retrait/);
    });

    it('requires a known or explicit value and rejects invalid amounts and dates', () => {
        expect(() => prepareWithdrawal('missing', 1, '2025-06-01', values)).toThrow();
        expect(prepareWithdrawal('missing', 1, '2025-06-01', [], 1).valueAfter).toBe(0);
        for (const amount of [0, -1, NaN, Infinity]) expect(() => prepareWithdrawal('pea', amount, '2025-06-01', values)).toThrow();
        for (const before of [-1, NaN, Infinity]) expect(() => prepareWithdrawal('pea', 1, '2025-06-01', values, before)).toThrow();
        for (const date of ['', 'invalid', '2025-02-30']) expect(() => prepareWithdrawal('pea', 1, date, values)).toThrow();
    });

    it('subtracts monetary amounts in cents without a floating-point residue', () => {
        expect(prepareWithdrawal('pea', .1, '2025-06-01', [], .3).valueAfter).toBe(.2);
        expect(prepareWithdrawal('pea', .3, '2025-06-01', [], .3).valueAfter).toBe(0);
    });

    it('blocks backdated withdrawals that would invalidate later calculated values', () => {
        const later = [...values, { pocheId: 'pea', valeur: 8800, date: '2025-06-01', transactionId: 'withdrawal' }];
        expect(() => prepareWithdrawal('pea', 100, '2025-05-01', later)).toThrow(/après cette date/);
        expect(prepareWithdrawal('pea', 100, '2025-06-01', later).valueAfter).toBe(8700);
    });

    it('charts only the final daily value after a withdrawal, without a fictitious gain', () => {
        const sameDayValues = [...values, { pocheId: 'pea', valeur: 8800, date: '2025-01-01', transactionId: 'withdrawal' }];
        const sameDayFlows: Transaction[] = [
            { pocheId: 'pea', type: 'apport', montant: 9800, timestamp: '2025-01-01' },
            { pocheId: 'pea', type: 'retrait', montant: 1000, timestamp: '2025-01-01' },
        ];
        const history = buildPocketHistory('pea', sameDayFlows, sameDayValues);
        expect(history).toHaveLength(1);
        expect(history[0]).toMatchObject({ v: 8800, p: 0 });
        expect(history).toEqual(buildPortfolioHistory([{ id: 'pea' }], sameDayFlows, sameDayValues));
    });
});

describe('financial consistency', () => {
    it('uses a common terminal date for all holdings in the portfolio XIRR', () => {
        const pockets = [{ id: 'a' }, { id: 'b' }];
        const flows: Transaction[] = pockets.map(pocket => ({ pocheId: pocket.id, type: 'apport', montant: 100, timestamp: '2023-01-01' }));
        const values = [{ pocheId: 'a', valeur: 120, date: '2024-01-01' }, { pocheId: 'b', valeur: 100, date: '2025-01-01' }];
        const expected = calculateXirr([{ date: '2023-01-01', amount: -200 }, { date: '2025-01-01', amount: 220 }]);
        expect(getPortfolioMetrics(pockets, flows, values).xirr).toBeCloseTo(expected!, 10);
    });

    it('rejects future contributions, withdrawals and valuations at every write boundary', () => {
        const pockets = [{ id: 'pea' }];
        const futureFlow: Transaction = { pocheId: 'pea', type: 'apport', montant: 100, timestamp: '2999-01-01' };
        expect(() => prepareContribution('pea', 100, futureFlow.timestamp, [])).toThrow(/future/);
        expect(() => prepareWithdrawal('pea', 100, futureFlow.timestamp, [], 100)).toThrow(/future/);
        expect(() => validatePortfolio(pockets, [futureFlow], [])).toThrow(/future/);
        expect(() => validatePortfolio(pockets, [], [{ pocheId: 'pea', valeur: 100, date: futureFlow.timestamp }])).toThrow(/future/);
        expect(() => readPortfolioData({ p: pockets, t: [futureFlow], v: [] })).toThrow(/future/);
    });

    it('adds a contribution to the market value rather than manufacturing a loss', () => {
        const values: Valuation[] = [{ pocheId: 'pea', valeur: 9800, date: '2025-01-01' }];
        expect(prepareContribution('pea', 1000, '2025-02-01', values)).toEqual({ valueBefore: 9800, valueAfter: 10800 });
        expect(prepareContribution('new', 1000, '2025-02-01', [])).toEqual({ valueBefore: 0, valueAfter: 1000 });
        expect(prepareContribution('pea', 1000, '2025-02-01', values, [], 11000).valueAfter).toBe(11000);
        const flows: Transaction[] = [
            { pocheId: 'pea', type: 'apport', montant: 9800, timestamp: '2025-01-01' },
            { pocheId: 'pea', type: 'apport', montant: 1000, timestamp: '2025-02-01' },
        ];
        expect(getPocketMetrics('pea', flows, values)).toMatchObject({ valActu: 10800, gainTotal: 0, valueEstimated: true });
        expect(buildPocketHistory('pea', flows, values).at(-1)).toMatchObject({ v: 10800, p: 0 });
    });

    it('blocks historical inserts and deletions before later derived snapshots', () => {
        const values: Valuation[] = [
            { id: 'source', pocheId: 'pea', valeur: 9800, date: '2025-01-01' },
            { id: 'derived', pocheId: 'pea', valeur: 8800, date: '2025-02-01', transactionId: 'w1' },
        ];
        expect(() => assertHistoryEditable('pea', '2025-01-15', values)).toThrow();
        expect(() => assertHistoryEditable('pea', '2025-01-01', values, 0)).toThrow();
        expect(() => assertHistoryEditable('pea', '2025-02-01', values)).not.toThrow();
        expect(() => assertHistoryEditable('pea', '2025-02-01', values, 1)).not.toThrow();
        expect(() => prepareContribution('pea', 100, '2025-01-15', values)).toThrow();
        const sameDay = values.map(valuation => ({ ...valuation, date: '2025-01-01' }));
        expect(() => assertHistoryEditable('pea', '2025-01-01', sameDay, 0)).toThrow();
        expect(() => assertHistoryEditable('pea', '2025-01-01', sameDay)).not.toThrow();
    });

    it('uses the final first-day value as Dietz starting capital', () => {
        const flows: Transaction[] = [
            { pocheId: 'pea', type: 'apport', montant: 100, timestamp: '2025-01-01' },
            { pocheId: 'pea', type: 'retrait', montant: 20, timestamp: '2025-01-01', valeurAvant: 100 },
        ];
        const values: Valuation[] = [
            { pocheId: 'pea', valeur: 100, date: '2025-01-01' },
            { pocheId: 'pea', valeur: 80, date: '2025-01-01', transactionId: 'w1' },
            { pocheId: 'pea', valeur: 80, date: '2025-06-01' },
        ];
        expect(getPocketMetrics('pea', flows, values).dietz).toBe(0);
    });

    it('keeps realized and unrealized gains independent from closing or reopening', () => {
        const flows: Transaction[] = [
            { pocheId: 'pea', type: 'apport', montant: 100, timestamp: '2025-01-01' },
            { pocheId: 'pea', type: 'retrait', montant: 60, timestamp: '2025-06-01', valeurAvant: 120 },
        ];
        const values = [{ pocheId: 'pea', valeur: 60, date: '2025-06-01' }];
        expect(getPocketMetrics('pea', flows, values)).toMatchObject({ gainTotal: 20, gainLatent: 10, gainRealise: 10 });
        const full = [{ ...flows[0] }, { ...flows[1], montant: 120 }];
        const zero = [{ ...values[0], valeur: 0 }];
        expect(getPocketMetrics('pea', full, zero).gainLatent).toBe(0);
        expect(getPocketMetrics('pea', full, zero, '2025-06-01').gainLatent).toBe(0);
        expect(getPocketMetrics('pea', [{ ...flows[0] }, { ...flows[1], valeurAvant: undefined }], values).gainLatent).toBeNull();
    });

    it('starts a new cost basis when reinvesting into a liquidated pocket', () => {
        const flows: Transaction[] = [
            { pocheId: 'pea', type: 'apport', montant: 100, timestamp: '2025-01-01' },
            { pocheId: 'pea', type: 'retrait', montant: 120, timestamp: '2025-06-01', valeurAvant: 120 },
            { pocheId: 'pea', type: 'apport', montant: 50, timestamp: '2025-07-01', valeurAvant: 0 },
        ];
        expect(getPocketMetrics('pea', flows, [{ pocheId: 'pea', valeur: 55, date: '2025-12-01' }])).toMatchObject({ gainTotal: 25, gainLatent: 5, gainRealise: 20 });
    });

    it('includes later annual contributions even without a newer valuation', () => {
        const flows: Transaction[] = [
            { pocheId: 'pea', type: 'apport', montant: 100, timestamp: '2024-01-01' },
            { pocheId: 'pea', type: 'apport', montant: 10, timestamp: '2025-12-01' },
        ];
        const values = [{ pocheId: 'pea', valeur: 100, date: '2024-12-31' }, { pocheId: 'pea', valeur: 110, date: '2025-06-01' }];
        const rows = getAnnualPerformanceRows('pea', flows, values);
        expect(rows.find(row => row.y === 2025)).toMatchObject({ apports: 10, emv: 120, perfE: 10 });
        expect(rows.at(-1)?.cumE).toBe(getPocketMetrics('pea', flows, values).gainTotal);
    });

    it('adjusts stale values for later withdrawals without rewriting observations', () => {
        const flows: Transaction[] = [
            { pocheId: 'pea', type: 'apport', montant: 100, timestamp: '2024-01-01' },
            { pocheId: 'pea', type: 'retrait', montant: 20, timestamp: '2025-12-01', valeurAvant: 110 },
        ];
        const values = [{ pocheId: 'pea', valeur: 100, date: '2024-12-31' }, { pocheId: 'pea', valeur: 110, date: '2025-06-01' }];
        const snapshot = JSON.stringify({ flows, values });
        expect(getPocketMetrics('pea', flows, values)).toMatchObject({ valActu: 90, gainTotal: 10, valueEstimated: true });
        expect(getAnnualPerformanceRows('pea', flows, values).at(-1)).toMatchObject({ retraits: 20, emv: 90, perfE: 10, valueEstimated: true });
        expect(JSON.stringify({ flows, values })).toBe(snapshot);
    });
});

describe('withdrawal history repair', () => {
    const pockets = [{ id: 'pea' }];
    const flows: Transaction[] = [
        { pocheId: 'pea', type: 'apport', montant: 100, timestamp: '2025-01-01' },
        { pocheId: 'pea', type: 'retrait', montant: 60, timestamp: '2025-06-01', commentaire: 'Ancien retrait' },
    ];
    const values: Valuation[] = [{ pocheId: 'pea', valeur: 60, date: '2025-06-01' }];

    it('uses the completed value when no later observation supersedes it', () => {
        const oldValues = [{ pocheId: 'pea', valeur: 100, date: '2025-01-01' }];
        const snapshot = JSON.stringify(oldValues);
        const next = completeWithdrawalValue(pockets, flows, oldValues, flows[1], 120);
        expect(getPocketMetrics('pea', next, oldValues)).toMatchObject({ valActu: 60, gainTotal: 20, gainLatent: 10, gainRealise: 10 });
        expect(buildPocketHistory('pea', next, oldValues).at(-1)).toMatchObject({ v: 60, p: 20 });
        expect(getAnnualPerformanceRows('pea', next, oldValues).at(-1)).toMatchObject({ emv: 60, perfE: 20 });
        expect(prepareWithdrawal('pea', 10, '2025-07-01', oldValues, undefined, next)).toMatchObject({ valueBefore: 60, valueAfter: 50 });
        expect(JSON.stringify(oldValues)).toBe(snapshot);
    });

    it('restores latent and realized returns without rewriting financial history', () => {
        const snapshot = JSON.stringify({ pockets, flows, values });
        const original = getPocketMetrics('pea', flows, values);
        expect(original.gainLatent).toBeNull();
        const next = completeWithdrawalValue(pockets, flows, values, flows[1], 120);
        expect(next).toEqual([flows[0], { ...flows[1], valeurAvant: 120 }]);
        expect(next[0]).toBe(flows[0]);
        expect(next[1].id).toBeUndefined();
        expect(getPocketMetrics('pea', next, values)).toMatchObject({ ...original, gainLatent: 10, gainNonRealise: 10, gainRealise: 10 });
        expect(getPortfolioMetrics(pockets, next, values).latent).toBe(10);
        expect(buildPortfolioHistory(pockets, next, values)).toEqual(buildPortfolioHistory(pockets, flows, values));
        expect(getAnnualPerformanceRows('pea', next, values)).toEqual(getAnnualPerformanceRows('pea', flows, values));
        expect(JSON.stringify({ pockets, flows, values })).toBe(snapshot);
    });

    it('keeps the latent unavailable until all required withdrawals are completed', () => {
        const pending: Transaction[] = [...flows, { ...flows[1], montant: 10, timestamp: '2025-07-01' }];
        const first = completeWithdrawalValue(pockets, pending, values, pending[1], 120);
        expect(getPocketMetrics('pea', first, values).gainLatent).toBeNull();
        const second = completeWithdrawalValue(pockets, first, values, first[2], 60);
        expect(getPocketMetrics('pea', second, values).gainLatent).not.toBeNull();
    });

    it('changes only the selected legacy entry even when dates and amounts match', () => {
        const identical = [...flows, { ...flows[1] }];
        const next = completeWithdrawalValue(pockets, identical, values, identical[2], 120);
        expect(next[1]).toBe(identical[1]);
        expect(next[1].valeurAvant).toBeUndefined();
        expect(next[2].valeurAvant).toBe(120);
        expect(() => completeWithdrawalValue(pockets, identical, values, { ...identical[2] }, 120)).toThrow(/changé/);
    });

    it('completes a historical value without deleting or recomputing later linked balances', () => {
        const later: Transaction[] = [...flows, { id: 'w2', pocheId: 'pea', type: 'retrait', montant: 10, timestamp: '2025-07-01', valeurAvant: 60 }];
        const laterValues = [...values, { id: 'v2', pocheId: 'pea', valeur: 50, date: '2025-07-01', transactionId: 'w2' }];
        expect(() => assertHistoryEditable('pea', flows[1].timestamp, laterValues)).toThrow();
        const next = completeWithdrawalValue(pockets, later, laterValues, later[1], 120);
        expect(next[2]).toBe(later[2]);
        expect(getPocketMetrics('pea', next, laterValues).gainLatent).toBeCloseTo(50 / 6);
        expect(() => validatePortfolio(pockets, next, laterValues)).not.toThrow();
    });

    it.each([0, -1, 59.99, NaN, Infinity, Number.MAX_SAFE_INTEGER])('rejects an invalid historical value: %s', value => {
        expect(() => completeWithdrawalValue(pockets, flows, values, flows[1], value)).toThrow();
        expect(flows[1].valeurAvant).toBeUndefined();
    });

    it('uses cents and permits a confirmed full withdrawal', () => {
        expect(completeWithdrawalValue(pockets, flows, values, flows[1], 60)[1].valeurAvant).toBe(60);
        expect(completeWithdrawalValue(pockets, flows, values, flows[1], 120.125)[1].valeurAvant).toBe(120.13);
    });

    it('requires explicit reopening and does not overwrite already completed entries', () => {
        const closed = [{ id: 'pea', closedAt: '2025-06-01' }];
        expect(() => completeWithdrawalValue(closed, flows, values, flows[1], 120)).toThrow(/Rouvrez/);
        expect(() => completeWithdrawalValue([], flows, values, flows[1], 120)).toThrow(/introuvable/);
        expect(() => completeWithdrawalValue(pockets, flows, values, flows[0], 120)).toThrow(/Seul un retrait/);
        const completed = completeWithdrawalValue(pockets, flows, values, flows[1], 120);
        expect(() => completeWithdrawalValue(pockets, completed, values, completed[1], 130)).toThrow(/Seul un retrait/);
    });
});

describe('historical withdrawal estimates', () => {
    const pockets = [{ id: 'pea' }];
    const flows: Transaction[] = [
        { pocheId: 'pea', type: 'apport', montant: 100, timestamp: '2025-01-01' },
        { pocheId: 'pea', type: 'retrait', montant: 60, timestamp: '2025-06-01' },
    ];
    const values: Valuation[] = [{ pocheId: 'pea', valeur: 120, date: '2025-05-01' }];

    it('prefers the balance after the withdrawal and reverses later same-day flows', () => {
        const sameDay: Transaction[] = [...flows, { pocheId: 'pea', type: 'apport', montant: 10, timestamp: '2025-06-01' }];
        const source = [...values, { pocheId: 'pea', valeur: 70, date: '2025-06-01' }];
        expect(estimateWithdrawalValue(sameDay, source, sameDay[1])).toBeNull();
        expect(estimateWithdrawalValue(sameDay, source, sameDay[1], true)).toEqual({ valueBefore: 120, method: 'after-withdrawal', sourceDate: '2025-06-01', sourceValue: 70, sourceAfterDayFlows: true });
    });

    it('requires explicit chronology for unlinked same-day observations and persists it', () => {
        const source = [{ pocheId: 'pea', valeur: 120, date: '2025-06-01' }];
        expect(estimateWithdrawalValue(flows, source, flows[1])).toBeNull();
        const estimate = estimateWithdrawalValue(flows, source, flows[1], true)!;
        expect(estimate.valueBefore).toBe(180);
        const next = completeWithdrawalValue(pockets, flows, source, flows[1], 180, estimate);
        expect(next[1].valeurAvantEstimation?.sourceAfterDayFlows).toBe(true);
        expect(readPortfolioData(JSON.parse(JSON.stringify({ p: pockets, t: next, v: source })))!.transactions[1].valeurAvantEstimation?.sourceAfterDayFlows).toBe(true);
        expect(() => completeWithdrawalValue(pockets, flows, source, flows[1], 180, { ...estimate, sourceAfterDayFlows: undefined })).toThrow(/changé/);
    });

    it('uses a linked later observation without assuming end-of-day ordering', () => {
        const sameDay: Transaction[] = [...flows, { id: 'later', pocheId: 'pea', type: 'apport', montant: 10, timestamp: '2025-06-01', valeurAvant: 60 }];
        const source = [...values, { pocheId: 'pea', valeur: 70, date: '2025-06-01', transactionId: 'later' }];
        expect(() => validatePortfolio(pockets, sameDay, source)).not.toThrow();
        expect(estimateWithdrawalValue(sameDay, source, sameDay[1])).toEqual({ valueBefore: 120, method: 'after-withdrawal', sourceDate: '2025-06-01', sourceValue: 70 });
    });

    it('rejects negative intermediate balances when reversing a full day', () => {
        const sameDay: Transaction[] = [flows[0], flows[1], { pocheId: 'pea', type: 'retrait', montant: 100, timestamp: '2025-06-01' }, { pocheId: 'pea', type: 'apport', montant: 200, timestamp: '2025-06-01' }];
        const source = [{ pocheId: 'pea', valeur: 100, date: '2025-06-01' }];
        expect(estimateWithdrawalValue(sameDay, source, sameDay[1], true)).toBeNull();
        expect(estimateWithdrawalValue(sameDay, source, sameDay[2], true)).toBeNull();
        const negativeStart: Transaction[] = [{ pocheId: 'pea', type: 'apport', montant: 200, timestamp: '2025-06-01' }, flows[1]];
        expect(estimateWithdrawalValue(negativeStart, source, negativeStart[1], true)).toBeNull();
    });

    it('adjusts an older balance by earlier flows without including the target withdrawal', () => {
        const earlier: Transaction[] = [flows[0], { pocheId: 'pea', type: 'apport', montant: 20, timestamp: '2025-05-15' }, flows[1]];
        expect(estimateWithdrawalValue(earlier, values, earlier[2])).toEqual({ valueBefore: 140, method: 'previous-balance', sourceDate: '2025-05-01', sourceValue: 120 });
    });

    it('does not use later market observations, other pockets or an insufficient balance', () => {
        expect(estimateWithdrawalValue(flows, [{ pocheId: 'pea', valeur: 80, date: '2025-07-01' }], flows[1])).toBeNull();
        expect(estimateWithdrawalValue(flows, [{ pocheId: 'other', valeur: 500, date: '2025-05-01' }], flows[1])).toBeNull();
        expect(estimateWithdrawalValue(flows, [{ ...values[0], valeur: 50 }], flows[1])).toBeNull();
        expect(estimateWithdrawalValue(flows, [], flows[1])).toBeNull();
        expect(estimateWithdrawalValue(flows, [{ ...values[0], estimee: true }], flows[1])).toBeNull();
        expect(estimateWithdrawalValue(flows, values, { ...flows[1] })).toBeNull();
    });

    it('does not mistake an earlier linked same-day balance for the balance after the target', () => {
        const sameDay: Transaction[] = [{ ...flows[0], id: 'a', timestamp: '2025-06-01' }, flows[1]];
        expect(estimateWithdrawalValue(sameDay, [{ pocheId: 'pea', valeur: 100, date: '2025-06-01', transactionId: 'a' }], sameDay[1])).toBeNull();
    });

    it('persists provenance, preserves observations and allows later confirmation', () => {
        const snapshot = JSON.stringify({ flows, values });
        const estimate = estimateWithdrawalValue(flows, values, flows[1])!;
        const next = completeWithdrawalValue(pockets, flows, values, flows[1], estimate.valueBefore, estimate);
        expect(next[1].valeurAvantEstimation).toEqual({ method: 'previous-balance', sourceDate: '2025-05-01', sourceValue: 120 });
        const imported = readPortfolioData(JSON.parse(JSON.stringify({ p: pockets, t: next, v: values })))!;
        expect(imported.transactions[1].valeurAvantEstimation).toEqual(next[1].valeurAvantEstimation);
        const confirmed = completeWithdrawalValue(pockets, next, values, next[1], 130);
        expect(confirmed[1].valeurAvant).toBe(130);
        expect(Object.hasOwn(confirmed[1], 'valeurAvantEstimation')).toBe(false);
        expect(JSON.stringify({ flows, values })).toBe(snapshot);
    });

    it('marks gains as estimated without overriding a later observed balance', () => {
        const source = [...values, { pocheId: 'pea', valeur: 60, date: '2025-06-01' }];
        const estimate = estimateWithdrawalValue(flows, source, flows[1], true)!;
        const next = completeWithdrawalValue(pockets, flows, source, flows[1], estimate.valueBefore, estimate);
        expect(getPocketMetrics('pea', next, source)).toMatchObject({ valActu: 60, valueEstimated: false, gainLatent: 10, gainRealise: 10, latentEstimated: true, realizedEstimated: true });
        expect(getPortfolioMetrics(pockets, next, source)).toMatchObject({ latent: 10, latentEstimated: true, valueEstimated: false });
        const observed = [...source, { pocheId: 'pea', valeur: 75, date: '2025-07-01' }];
        expect(getPocketMetrics('pea', next, observed)).toMatchObject({ valActu: 75, valueEstimated: false, latentEstimated: true });
        const confirmed = completeWithdrawalValue(pockets, next, observed, next[1], 120);
        expect(getPocketMetrics('pea', confirmed, observed)).toMatchObject({ latentEstimated: false, realizedEstimated: false });
    });

    it('carries uncertainty into derived movements until a real balance is entered', () => {
        const estimate = estimateWithdrawalValue(flows, values, flows[1])!;
        const next = completeWithdrawalValue(pockets, flows, values, flows[1], estimate.valueBefore, estimate);
        expect(prepareWithdrawal('pea', 10, '2025-07-01', values, undefined, next)).toMatchObject({ valueBefore: 60, valueAfter: 50, estimated: true });
        expect(prepareContribution('pea', 10, '2025-07-01', values, next)).toMatchObject({ valueAfter: 70, estimated: true });
        expect(prepareWithdrawal('pea', 10, '2025-07-01', values, 60, next).estimated).toBeUndefined();
        expect(prepareContribution('pea', 10, '2025-07-01', values, next, 70).estimated).toBeUndefined();
        const later: Transaction[] = [...next, { id: 'later', pocheId: 'pea', type: 'retrait', montant: 10, timestamp: '2025-07-01', valeurAvant: 60, valeurAvantEstimee: true }];
        const snapshots = [...values, { pocheId: 'pea', valeur: 50, date: '2025-07-01', transactionId: 'later', estimee: true }];
        expect(() => validatePortfolio(pockets, later, snapshots)).not.toThrow();
        expect(getPocketMetrics('pea', later, snapshots)).toMatchObject({ valueEstimated: true, latentEstimated: true, realizedEstimated: true });
        expect(buildPocketHistory('pea', later, snapshots).at(-1)?.estimated).toBe(true);
        expect(getAnnualPerformanceRows('pea', later, snapshots).at(-1)).toMatchObject({ valueEstimated: true, performanceEstimated: true });
        const observed = [...snapshots, { pocheId: 'pea', valeur: 55, date: '2025-08-01' }];
        expect(getPocketMetrics('pea', later, observed)).toMatchObject({ valueEstimated: false, latentEstimated: true });
        expect(() => validatePortfolio(pockets, later, snapshots.map(value => ({ ...value, estimee: false })))).toThrow(/statut estimé/);
    });

    it('does not turn a hypothetical full withdrawal into confirmed gains', () => {
        const source = [{ pocheId: 'pea', valeur: 60, date: '2025-05-01' }];
        const estimate = estimateWithdrawalValue(flows, source, flows[1])!;
        const next = completeWithdrawalValue(pockets, flows, source, flows[1], estimate.valueBefore, estimate);
        expect(getPocketMetrics('pea', next, source)).toMatchObject({ valActu: 0, valueEstimated: true, latentEstimated: true, realizedEstimated: true });
        const confirmed = completeWithdrawalValue(pockets, next, source, next[1], 60);
        expect(getPocketMetrics('pea', confirmed, [...source, { pocheId: 'pea', valeur: 0, date: '2025-06-01' }])).toMatchObject({ latentEstimated: false, realizedEstimated: false });
    });

    it('rebuilds dependent estimated transactions and snapshots atomically after confirmation', () => {
        const estimate = estimateWithdrawalValue(flows, values, flows[1])!;
        const saved = completeWithdrawalValue(pockets, flows, values, flows[1], estimate.valueBefore, estimate);
        const later: Transaction[] = [...saved, { id: 'later', pocheId: 'pea', type: 'apport', montant: 10, timestamp: '2025-07-01', valeurAvant: 60, valeurAvantEstimee: true }];
        const snapshots = [...values, { pocheId: 'pea', valeur: 70, date: '2025-07-01', transactionId: 'later', estimee: true }];
        const original = JSON.stringify({ later, snapshots });
        const repaired = completeWithdrawalHistory(pockets, later, snapshots, later[1], 160);
        expect(repaired.transactions[2]).toMatchObject({ valeurAvant: 100, valeurAvantEstimee: true });
        expect(repaired.valuations[1]).toMatchObject({ valeur: 110, estimee: true });
        expect(getPocketMetrics('pea', repaired.transactions, repaired.valuations).valActu).toBe(110);
        expect(() => validatePortfolio(pockets, repaired.transactions, repaired.valuations)).not.toThrow();
        expect(() => completeWithdrawalValue(pockets, later, snapshots, later[1], 160)).toThrow(/soldes estimés/);
        expect(JSON.stringify({ later, snapshots })).toBe(original);
    });

    it('rebuilds successive accepted estimates and their provenance', () => {
        const saved = completeWithdrawalValue(pockets, flows, values, flows[1], 120, estimateWithdrawalValue(flows, values, flows[1])!);
        const later: Transaction[] = [...saved, { pocheId: 'pea', type: 'retrait', montant: 10, timestamp: '2025-07-01' }];
        const accepted = completeWithdrawalValue(pockets, later, values, later[2], 60, estimateWithdrawalValue(later, values, later[2])!);
        const repaired = completeWithdrawalHistory(pockets, accepted, values, accepted[1], 160);
        expect(repaired.transactions[2]).toMatchObject({ valeurAvant: 100, valeurAvantEstimation: { sourceDate: '2025-06-01', sourceValue: 160 } });
        expect(getPocketMetrics('pea', repaired.transactions, repaired.valuations).valActu).toBe(90);
    });

    it('rebuilds same-day linked chains in transaction order without changing another pocket', () => {
        const source = [{ pocheId: 'pea', valeur: 100, date: '2025-01-01' }];
        const original: Transaction[] = [flows[0], { pocheId: 'pea', type: 'retrait', montant: 20, timestamp: '2025-02-01' }];
        const accepted = completeWithdrawalValue(pockets, original, source, original[1], 100, estimateWithdrawalValue(original, source, original[1])!);
        const later: Transaction[] = [...accepted,
        { id: 'a', pocheId: 'pea', type: 'apport', montant: 10, timestamp: '2025-03-01', valeurAvant: 80, valeurAvantEstimee: true },
        { id: 'w', pocheId: 'pea', type: 'retrait', montant: 30, timestamp: '2025-03-01', valeurAvant: 90, valeurAvantEstimee: true },
        { pocheId: 'other', type: 'apport', montant: 500, timestamp: '2025-03-01' }];
        const snapshots = [...source,
        { pocheId: 'pea', valeur: 90, date: '2025-03-01', transactionId: 'a', estimee: true },
        { pocheId: 'pea', valeur: 60, date: '2025-03-01', transactionId: 'w', estimee: true },
        { pocheId: 'other', valeur: 500, date: '2025-03-01' }];
        const repaired = completeWithdrawalHistory([...pockets, { id: 'other' }], later, snapshots, later[1], 140);
        expect(repaired.transactions[2].valeurAvant).toBe(120);
        expect(repaired.transactions[3].valeurAvant).toBe(130);
        expect(repaired.valuations.map(value => value.valeur)).toEqual([100, 130, 100, 500]);
        expect(repaired.transactions[4]).toBe(later[4]);
        expect(repaired.valuations[3]).toBe(snapshots[3]);
        expect(() => validatePortfolio([...pockets, { id: 'other' }], repaired.transactions, repaired.valuations)).not.toThrow();
    });

    it('updates the target snapshot and keeps rebuilding past that newly confirmed balance', () => {
        const saved = completeWithdrawalValue(pockets, flows, values, flows[1], 120, estimateWithdrawalValue(flows, values, flows[1])!);
        const later: Transaction[] = [saved[0], { ...saved[1], id: 'target' }, { id: 'later', pocheId: 'pea', type: 'apport', montant: 10, timestamp: '2025-07-01', valeurAvant: 60, valeurAvantEstimee: true }];
        const snapshots = [...values,
        { pocheId: 'pea', valeur: 60, date: '2025-06-01', transactionId: 'target', estimee: true },
        { pocheId: 'pea', valeur: 70, date: '2025-07-01', transactionId: 'later', estimee: true }];
        const repaired = completeWithdrawalHistory(pockets, later, snapshots, later[1], 160);
        expect(repaired.valuations[1]).toMatchObject({ valeur: 100, estimee: false });
        expect(repaired.valuations[2]).toMatchObject({ valeur: 110, estimee: true });
        expect(repaired.transactions[2].valeurAvant).toBe(100);
        expect(() => validatePortfolio(pockets, repaired.transactions, repaired.valuations)).not.toThrow();
    });

    it('stops rebuilding at a real observation or confirmed movement', () => {
        const saved = completeWithdrawalValue(pockets, flows, values, flows[1], 120, estimateWithdrawalValue(flows, values, flows[1])!);
        const later: Transaction[] = [...saved, { id: 'later', pocheId: 'pea', type: 'apport', montant: 10, timestamp: '2025-07-01', valeurAvant: 80, valeurAvantEstimee: true }];
        const snapshots = [...values, { pocheId: 'pea', valeur: 80, date: '2025-06-15' }, { pocheId: 'pea', valeur: 90, date: '2025-07-01', transactionId: 'later', estimee: true }];
        const repaired = completeWithdrawalHistory(pockets, later, snapshots, later[1], 160);
        expect(repaired.transactions[2]).toBe(later[2]);
        expect(repaired.valuations).toEqual(snapshots);
        const confirmed = later.map(entry => entry.id === 'later' ? { ...entry, valeurAvantEstimee: false } : entry);
        const observed = [values[0], { ...snapshots[2], estimee: false }];
        expect(completeWithdrawalHistory(pockets, confirmed, observed, confirmed[1], 160).transactions[2]).toBe(confirmed[2]);
    });

    it('rejects an impossible downstream estimate without changing any record', () => {
        const saved = completeWithdrawalValue(pockets, flows, values, flows[1], 120, estimateWithdrawalValue(flows, values, flows[1])!);
        const later: Transaction[] = [...saved, { id: 'later', pocheId: 'pea', type: 'retrait', montant: 50, timestamp: '2025-07-01', valeurAvant: 60, valeurAvantEstimee: true }];
        const snapshots = [...values, { pocheId: 'pea', valeur: 10, date: '2025-07-01', transactionId: 'later', estimee: true }];
        const original = JSON.stringify({ later, snapshots });
        expect(() => completeWithdrawalHistory(pockets, later, snapshots, later[1], 80)).toThrow(/insuffisant/);
        expect(JSON.stringify({ later, snapshots })).toBe(original);
    });

    it('rejects stale proposals, forged metadata and edits while closed', () => {
        const estimate = estimateWithdrawalValue(flows, values, flows[1])!;
        expect(() => completeWithdrawalValue(pockets, flows, values, flows[1], 130, estimate)).toThrow(/changé/);
        expect(() => completeWithdrawalValue(pockets, flows, values, flows[1], 120, { ...estimate, sourceValue: 999 })).toThrow(/changé/);
        expect(() => completeWithdrawalValue([{ id: 'pea', closedAt: '2025-06-01' }], flows, values, flows[1], 120, estimate)).toThrow(/Rouvrez/);
        for (const invalid of [null, {}, { ...estimate, method: 'guess' }, { ...estimate, sourceDate: '2025-07-01' }, { ...estimate, sourceValue: -1 }, { ...estimate, sourceAfterDayFlows: true }, { ...estimate, sourceAfterDayFlows: false }]) {
            expect(() => validatePortfolio(pockets, [{ ...flows[1], valeurAvant: 120, valeurAvantEstimation: invalid }], [])).toThrow(/estimation/);
        }
    });
});

describe('pocket closure', () => {
    it('accepts legacy pockets and a dated liquidation without changing entries', () => {
        expect(() => validatePocketClosures([{ id: 'legacy' }], [], [])).not.toThrow();
        const snapshot = JSON.stringify({ pocket, transactions, valuations });
        expect(() => validatePocketClosures([pocket], transactions, valuations, '2025-12-31')).not.toThrow();
        expect(JSON.stringify({ pocket, transactions, valuations })).toBe(snapshot);
        const imported = JSON.parse(snapshot);
        expect(() => validatePocketClosures([imported.pocket], imported.transactions, imported.valuations)).not.toThrow();
        expect(imported.pocket.closedAt).toBe(pocket.closedAt);
    });

    it.each(['2025-02-30', 'invalid', '', null, '2027-01-01'])('rejects invalid or future dates: %s', date => {
        expect(() => validatePocketClosures([{ ...pocket, closedAt: date as string }], transactions, valuations, '2025-12-31')).toThrow();
    });

    it('requires a terminal zero on the closure date and no later entries', () => {
        expect(() => validatePocketClosures([pocket], transactions, [])).toThrow();
        expect(() => validatePocketClosures([pocket], transactions, [{ ...valuations[1], valeur: 1 }])).toThrow();
        expect(() => validatePocketClosures([pocket], transactions, [{ ...valuations[1], date: '2025-05-31' }])).toThrow();
        expect(() => validatePocketClosures([pocket], [...transactions, { ...transactions[0], timestamp: '2025-06-02' }], valuations)).toThrow();
        expect(() => validatePocketClosures([pocket], transactions, [...valuations, { ...valuations[1], date: '2025-06-02' }])).toThrow();
        expect(() => validatePocketClosures([pocket], transactions, [...valuations, { ...valuations[1], valeur: 1 }])).toThrow();
    });

    it('locks financial changes until reopening without deleting entries', () => {
        expect(() => assertPocketWritable([pocket], pocket.id)).toThrow();
        expect(() => assertPocketWritable([], pocket.id)).toThrow();
        expect(() => assertPocketWritable([{ ...pocket, closedAt: undefined }], pocket.id)).not.toThrow();
    });

    it('requires a confirmed zero rather than an estimated terminal balance', () => {
        const estimated = [...valuations.slice(0, -1), { ...valuations.at(-1)!, estimee: true }];
        expect(() => validatePocketClosures([pocket], transactions, estimated)).toThrow(/confirmée/);
        expect(() => validatePortfolio([pocket], transactions, estimated)).toThrow(/confirmée/);
        expect(() => readPortfolioData({ p: [pocket], t: transactions, v: estimated })).toThrow(/confirmée/);
        expect(() => validatePocketClosures([pocket], transactions, [...estimated, { ...valuations.at(-1)!, id: 'confirmed-zero' }])).not.toThrow();
    });

    it.each([120, 80, 0])('preserves the final result after withdrawing %s', amount => {
        const flows = [transactions[0], ...(amount ? [{ ...transactions[1], montant: amount }] : [])];
        const result = getPocketMetrics(pocket.id, flows, valuations, pocket.closedAt);
        expect(result.valActu).toBe(0);
        expect(result.gainTotal).toBe(amount - 100);
        expect(result.gainLatent).toBe(0);
        expect(result.gainNonRealise).toBe(0);
        const aggregate = getPortfolioMetrics([pocket], flows, valuations);
        expect(aggregate.tg).toBe(amount - 100);
        expect(aggregate.latent).toBe(0);
        expect(aggregate.xirr).toBe(getPortfolioMetrics([{ id: pocket.id }], flows, valuations).xirr);
        expect(() => validatePocketClosures([pocket], flows, valuations)).not.toThrow();
    });

    it('keeps closed gains alongside active capital and historical points', () => {
        const active = { id: 'active' };
        const flows: Transaction[] = [...transactions, { pocheId: active.id, type: 'apport', montant: 200, timestamp: '2025-01-01' }];
        const values = [...valuations, { pocheId: active.id, valeur: 220, date: pocket.closedAt }];
        expect(getPortfolioMetrics([pocket, active], flows, values)).toMatchObject({ tv: 220, tg: 40, latent: 20 });
        expect(buildPortfolioHistory([pocket], transactions, valuations)).toEqual(buildPocketHistory(pocket.id, transactions, valuations));
        expect(buildPortfolioHistory([pocket], transactions, valuations).at(-1)).toMatchObject({ v: 0, p: 20, pct: null });
        const duplicateValues = [valuations[0], { ...valuations[1], valeur: 120 }, valuations[1]];
        expect(buildPortfolioHistory([pocket], transactions, duplicateValues).at(-1)?.v).toBe(0);
    });

    it('retains same-year liquidation in annual performance but skips empty years', () => {
        expect(getAnnualPerformanceRows(pocket.id, transactions, valuations)[0]).toMatchObject({ y: 2025, bmv: 0, emv: 0, perfE: 20 });
        expect(getAnnualPerformanceRows('all', transactions, valuations)[0].perfE).toBe(20);
        expect(getAnnualPerformanceRows(pocket.id, transactions, [...valuations, { ...valuations[1], date: '2026-06-01' }])).toHaveLength(1);
    });
});

describe('portfolio import validation', () => {
    const pockets = [{ id: 'pea' }];
    const flows: Transaction[] = [{ id: 'w1', pocheId: 'pea', type: 'retrait', montant: 20, timestamp: '2025-01-01', valeurAvant: 100 }];
    const values: Valuation[] = [{ id: 'v1', pocheId: 'pea', valeur: 80, date: '2025-01-01', transactionId: 'w1' }];

    it('accepts legacy fields, missing optional entry ids and demo data without mutation', () => {
        expect(() => validatePortfolio(DEMO_POCKETS, DEMO_TRANSACTIONS, DEMO_VALUATIONS)).not.toThrow();
        const input = { p: [pocket], t: transactions, v: valuations };
        const original = JSON.stringify(input);
        expect(readPortfolioData(input)).toEqual({ pockets: [pocket], transactions, valuations });
        expect(JSON.stringify(input)).toBe(original);
        expect(readPortfolioData({ simulation: {} })).toBeNull();
        expect(readPortfolioData({ poches: [] })).toEqual({ pockets: [], transactions: [], valuations: [] });
    });

    it('rejects orphan entries even with an empty pocket list', () => {
        expect(() => validatePortfolio([], flows, [])).toThrow(/inexistante/);
        expect(() => validatePortfolio([], [], values)).toThrow(/inexistante/);
        expect(() => validatePortfolio([{ id: 'other' }], flows, values)).toThrow();
        expect(getPortfolioMetrics([], flows, values).xirr).toBeNull();
    });

    it.each([null, [], { p: null }, { poches: {}, transactions: [] }, { poches: [], t: 'bad' }])('rejects malformed containers: %j', input => {
        expect(() => readPortfolioData(input)).toThrow();
    });

    it('rejects invalid schema, ids, types, dates and money', () => {
        for (const invalid of [null, {}, { id: '' }, { id: 'pea', nom: {} }, { id: 'pea', createdAt: '2025-02-30' }]) {
            expect(() => validatePortfolio([invalid], [], [])).toThrow();
        }
        expect(() => validatePortfolio([...pockets, ...pockets], [], [])).toThrow();
        expect(() => validatePortfolio(pockets, [...flows, ...flows], [])).toThrow();
        expect(() => validatePortfolio(pockets, flows, [...values, ...values])).toThrow();
        for (const patch of [{ montant: -1 }, { montant: 0 }, { montant: NaN }, { montant: Infinity }, { montant: '20' }, { type: 'dividende' }, { timestamp: '2025-02-30' }, { valeurAvant: 10 }, { commentaire: {} }]) {
            expect(() => validatePortfolio(pockets, [{ ...flows[0], ...patch }], [])).toThrow();
        }
        for (const patch of [{ valeur: -1 }, { valeur: NaN }, { valeur: Infinity }, { valeur: '80' }, { date: 'invalid' }]) {
            expect(() => validatePortfolio(pockets, flows, [{ ...values[0], ...patch }])).toThrow();
        }
    });

    it('validates linked contributions and withdrawals including cents', () => {
        expect(() => validatePortfolio(pockets, flows, values)).not.toThrow();
        expect(() => validatePortfolio(pockets, [{ ...flows[0], type: 'apport' }], [{ ...values[0], valeur: 120 }])).not.toThrow();
        for (const patch of [{ transactionId: 'missing' }, { valeur: 81 }, { date: '2025-01-02' }]) {
            expect(() => validatePortfolio(pockets, flows, [{ ...values[0], ...patch }])).toThrow();
        }
        expect(() => validatePortfolio(pockets, flows, [values[0], { ...values[0], id: 'v2' }])).toThrow();
        expect(() => validatePortfolio(pockets, [{ ...flows[0], valeurAvant: undefined }], values)).toThrow();
    });
});