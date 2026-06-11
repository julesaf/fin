export type TransactionType =
    | 'apport'
    | 'retrait';

export type Pocket = {
    id: string;
    nom?: string;
    couleur?: string;
    categorie?: string;
    createdAt?: string;
};

export type Transaction = {
    id?: string;
    pocheId: string;
    type: TransactionType;
    montant: number;
    timestamp: string;
    commentaire?: string;
};

export type Valuation = {
    id?: string;
    pocheId: string;
    valeur: number;
    date: string;
    commentaire?: string;
};

export type CashFlow = {
    date: string;
    amount: number;
};

export type PocketMetrics = {
    apports: number;
    retraits: number;
    capital: number;
    valActu: number;
    gainNonRealise: number;
    gainLatent: number;
    xirr: number | null;
    dietz: number | null;
};

export type PortfolioMetrics = {
    tv: number;
    tc: number;
    tg: number;
    latent: number;
    xirr: number | null;
};

export type PerformancePoint = {
    date: string;
    v: number;
    c: number;
    p: number;
    pct: number | null;
    pPos: number | null;
    pNeg: number | null;
    pctPos: number | null;
    pctNeg: number | null;
};

export type AnnualPerformanceRow = {
    y: number;
    bmv: number;
    emv: number;
    apports: number;
    retraits: number;
    netCF: number;
    perfE: number;
    perfPct: number | null;
    dietz: number | null;
    cumE: number;
    cumPct: number | null;
    capitalEnd: number;
};

const CASH_FLOW_TYPES = new Set<TransactionType>(['apport', 'retrait']);
const CAPITAL_TYPES = new Set<TransactionType>(['apport', 'retrait']);
const ONE_DAY_MS = 86_400_000;
const ONE_YEAR_MS = 31_557_600_000;
const EPSILON = 1e-7;

const byDateAsc = <T extends { date: string }>(a: T, b: T) => a.date.localeCompare(b.date);

function lastItem<T>(items: T[]): T | undefined {
    return items.length ? items[items.length - 1] : undefined;
}

function daysBetween(startDate: string, endDate: string): number {
    return (new Date(endDate).getTime() - new Date(startDate).getTime()) / ONE_DAY_MS;
}

function sumTransactions(transactions: Transaction[], type: string): number {
    return transactions
        .filter(transaction => transaction.type === type)
        .reduce((sum, transaction) => sum + transaction.montant, 0);
}

function getPocketTransactions(pocketId: string, transactions: Transaction[]): Transaction[] {
    return transactions.filter(transaction => transaction.pocheId === pocketId);
}

function getPocketValuations(pocketId: string, valuations: Valuation[]): Valuation[] {
    return valuations
        .filter(valuation => valuation.pocheId === pocketId)
        .sort(byDateAsc);
}

function getLastKnownValue(pocketId: string, valuations: Valuation[], date: string): number {
    const latest = valuations
        .filter(valuation => valuation.pocheId === pocketId && valuation.date <= date)
        .sort((a, b) => b.date.localeCompare(a.date))[0];

    return latest?.valeur ?? 0;
}

function toXirrCashFlows(transactions: Transaction[]): CashFlow[] {
    return transactions
        .filter(transaction => CASH_FLOW_TYPES.has(transaction.type))
        .map(transaction => ({
            date: transaction.timestamp,
            amount: transaction.type === 'apport' ? -transaction.montant : transaction.montant,
        }));
}

function toDietzCapitalFlows(transactions: Transaction[]): CashFlow[] {
    return transactions
        .filter(transaction => CAPITAL_TYPES.has(transaction.type))
        .map(transaction => ({
            date: transaction.timestamp,
            amount: transaction.type === 'apport' ? transaction.montant : -transaction.montant,
        }));
}

/**
 * Annualized money-weighted return based on dated cash flows.
 * Contributions and fees are expected as negative amounts; withdrawals,
 * dividends and final market values as positive amounts.
 */
export function calculateXirr(inputFlows: CashFlow[]): number | null {
    if (!inputFlows || inputFlows.length < 2) return null;

    const flows = inputFlows
        .map(flow => ({ date: flow.date, amount: flow.amount }))
        .sort(byDateAsc);

    const firstDate = new Date(flows[0].date).getTime();
    const yearFraction = (date: string) => (new Date(date).getTime() - firstDate) / ONE_YEAR_MS;

    if (!flows.some(flow => flow.amount > 0) || !flows.some(flow => flow.amount < 0)) return null;

    const npv = (rate: number): number | null => {
        if (rate <= -1) return null;

        let total = 0;
        for (const flow of flows) {
            const discount = Math.pow(1 + rate, yearFraction(flow.date));
            if (!Number.isFinite(discount) || discount === 0) return null;
            total += flow.amount / discount;
        }

        return total;
    };

    let rate = 0.1;
    for (let iteration = 0; iteration < 600; iteration++) {
        let value = 0;
        let derivative = 0;

        for (const flow of flows) {
            const t = yearFraction(flow.date);
            const base = 1 + rate;
            if (base <= 0) return null;

            const discounted = Math.pow(base, t);
            if (!Number.isFinite(discounted)) continue;

            value += flow.amount / discounted;
            derivative -= t * flow.amount / (discounted * base);
        }

        if (Math.abs(value) < EPSILON) return rate > -1 ? rate : null;
        if (!derivative || !Number.isFinite(derivative)) break;

        const nextRate = rate - value / derivative;
        if (!Number.isFinite(nextRate)) break;

        if (Math.abs(nextRate - rate) < 1e-9) {
            const nextValue = npv(nextRate);
            if (nextValue != null && Math.abs(nextValue) < EPSILON) return nextRate > -1 ? nextRate : null;
            break;
        }

        rate = Math.max(-0.9999, nextRate);
    }

    let low = -0.9999;
    let high = 1;
    let lowValue = npv(low);
    let highValue = npv(high);

    for (let iteration = 0; iteration < 60 && lowValue != null && highValue != null && lowValue * highValue > 0; iteration++) {
        high *= 2;
        highValue = npv(high);
    }

    if (lowValue == null || highValue == null || lowValue * highValue > 0) return null;

    for (let iteration = 0; iteration < 120; iteration++) {
        const middle = (low + high) / 2;
        const middleValue = npv(middle);
        if (middleValue == null) return null;
        if (Math.abs(middleValue) < EPSILON) return middle;

        if (lowValue * middleValue <= 0) {
            high = middle;
            highValue = middleValue;
        } else {
            low = middle;
            lowValue = middleValue;
        }
    }

    return (low + high) / 2;
}

/**
 * Time-weighted-ish period return using the Modified Dietz approximation.
 * Capital flows are weighted by how long they were invested during the period.
 */
export function calculateModifiedDietz(
    beginningMarketValue: number,
    endingMarketValue: number,
    capitalFlows: CashFlow[],
    startDate: string,
    endDate: string,
    resultAdjustment = 0,
): number | null {
    const periodDays = daysBetween(startDate, endDate);
    if (periodDays <= 0) return null;

    let netCapitalFlow = 0;
    let weightedCapitalFlow = 0;

    for (const flow of capitalFlows) {
        const elapsedDays = daysBetween(startDate, flow.date);
        const weight = Math.max(0, Math.min(1, (periodDays - elapsedDays) / periodDays));

        netCapitalFlow += flow.amount;
        weightedCapitalFlow += flow.amount * weight;
    }

    const denominator = beginningMarketValue + weightedCapitalFlow;
    if (denominator <= 0.01) return null;

    return (endingMarketValue + resultAdjustment - beginningMarketValue - netCapitalFlow) / denominator;
}

export function calculateCapitalAtDate(pocketIds: string[], transactions: Transaction[], date: string): number {
    const transactionsUntilDate = transactions.filter(
        transaction => pocketIds.includes(transaction.pocheId) && transaction.timestamp <= date,
    );

    return sumTransactions(transactionsUntilDate, 'apport') - sumTransactions(transactionsUntilDate, 'retrait');
}

export function calculatePerformanceAtDate(
    pocketIds: string[],
    transactions: Transaction[],
    date: string,
    value: number,
): number {
    const transactionsUntilDate = transactions.filter(
        transaction => pocketIds.includes(transaction.pocheId) && transaction.timestamp <= date,
    );

    return value
        - sumTransactions(transactionsUntilDate, 'apport')
        + sumTransactions(transactionsUntilDate, 'retrait');
}

/** Computes all headline indicators for a single investment pocket. */
export function getPocketMetrics(pocketId: string, transactions: Transaction[], valuations: Valuation[]): PocketMetrics {
    const pocketTransactions = getPocketTransactions(pocketId, transactions);
    const pocketValuations = getPocketValuations(pocketId, valuations);

    const apports = sumTransactions(pocketTransactions, 'apport');
    const retraits = sumTransactions(pocketTransactions, 'retrait');

    const capital = apports - retraits;
    const lastValuation = lastItem(pocketValuations);
    const valActu = lastValuation?.valeur ?? 0;

    const xirrCashFlows = toXirrCashFlows(pocketTransactions);
    if (valActu > 0 && xirrCashFlows.length && lastValuation) {
        xirrCashFlows.push({ date: lastValuation.date, amount: valActu });
    }

    const xirr = xirrCashFlows.length >= 2 ? calculateXirr(xirrCashFlows) : null;

    let dietz: number | null = null;
    if (pocketValuations.length >= 2) {
        const startDate = pocketValuations[0].date;
        const endDate = lastValuation!.date;
        const periodTransactions = pocketTransactions.filter(
            transaction => transaction.timestamp > startDate && transaction.timestamp <= endDate,
        );

        dietz = calculateModifiedDietz(
            pocketValuations[0].valeur,
            valActu,
            toDietzCapitalFlows(periodTransactions),
            startDate,
            endDate,
        );
    }

    const gainNonRealise = valActu - capital;

    return {
        apports,
        retraits,
        capital,
        valActu,
        gainNonRealise,
        gainLatent: gainNonRealise,
        xirr,
        dietz,
    };
}

/** Aggregates pocket metrics and computes portfolio-level XIRR. */
export function getPortfolioMetrics(
    pockets: Pocket[],
    transactions: Transaction[],
    valuations: Valuation[],
    pocketMetrics: Array<Pocket & PocketMetrics> = pockets.map(pocket => ({
        ...pocket,
        ...getPocketMetrics(pocket.id, transactions, valuations),
    })),
): PortfolioMetrics {
    const tv = pocketMetrics.reduce((sum, pocket) => sum + pocket.valActu, 0);
    const tc = pocketMetrics.reduce((sum, pocket) => sum + pocket.capital, 0);
    const latent = pocketMetrics.reduce((sum, pocket) => sum + pocket.gainNonRealise, 0);

    const xirrCashFlows = toXirrCashFlows(transactions);
    for (const pocket of pockets) {
        const pocketValuations = getPocketValuations(pocket.id, valuations);
        const lastValuation = lastItem(pocketValuations);
        if (lastValuation && lastValuation.valeur > 0) {
            xirrCashFlows.push({ date: lastValuation.date, amount: lastValuation.valeur });
        }
    }

    return {
        tv,
        tc,
        tg: pocketMetrics.reduce((sum, pocket) => sum + pocket.gainLatent, 0),
        latent,
        xirr: xirrCashFlows.length >= 2 ? calculateXirr(xirrCashFlows) : null,
    };
}

/** Builds the portfolio chart series: value, capital invested, absolute and percentage performance. */
export function buildPortfolioHistory(
    pockets: Pocket[],
    transactions: Transaction[],
    valuations: Valuation[],
): PerformancePoint[] {
    const dates = [...new Set(valuations.map(valuation => valuation.date))].sort();
    const pocketIds = pockets.map(pocket => pocket.id);

    return dates.map(date => {
        const value = pockets.reduce(
            (sum, pocket) => sum + getLastKnownValue(pocket.id, valuations, date),
            0,
        );
        const performance = calculatePerformanceAtDate(pocketIds, transactions, date, value);
        const capital = calculateCapitalAtDate(pocketIds, transactions, date);
        const pct = capital > 0.01 ? performance / capital : null;

        return {
            date: date.slice(0, 7),
            v: value,
            c: capital,
            p: performance,
            pct,
            pPos: performance >= 0 ? performance : null,
            pNeg: performance < 0 ? performance : null,
            pctPos: pct != null && pct >= 0 ? pct : null,
            pctNeg: pct != null && pct < 0 ? pct : null,
        };
    });
}

/** Builds the chart series for one pocket. */
export function buildPocketHistory(
    pocketId: string,
    transactions: Transaction[],
    valuations: Valuation[],
): PerformancePoint[] {
    return getPocketValuations(pocketId, valuations).map(valuation => {
        const performance = calculatePerformanceAtDate([pocketId], transactions, valuation.date, valuation.valeur);
        const capital = calculateCapitalAtDate([pocketId], transactions, valuation.date);
        const pct = capital > 0.01 ? performance / capital : null;

        return {
            date: valuation.date.slice(0, 7),
            v: valuation.valeur,
            c: capital,
            p: performance,
            pct,
            pPos: performance >= 0 ? performance : null,
            pNeg: performance < 0 ? performance : null,
            pctPos: pct != null && pct >= 0 ? pct : null,
            pctNeg: pct != null && pct < 0 ? pct : null,
        };
    });
}

/** Builds annual performance rows for either one pocket or the whole portfolio with pocketId = 'all'. */
export function getAnnualPerformanceRows(
    pocketId: string,
    transactions: Transaction[],
    valuations: Valuation[],
): AnnualPerformanceRow[] {
    const isPortfolio = pocketId === 'all';
    const pocketIds = isPortfolio
        ? [...new Set([...valuations.map(valuation => valuation.pocheId), ...transactions.map(transaction => transaction.pocheId)])]
        : [pocketId];

    const scopedTransactions = transactions.filter(transaction => pocketIds.includes(transaction.pocheId));
    const scopedValuations = valuations.filter(valuation => pocketIds.includes(valuation.pocheId));

    const valueAtDate = (date: string) => pocketIds.reduce(
        (sum, id) => sum + getLastKnownValue(id, valuations, date),
        0,
    );

    const lastValuationDateInYear = (year: number) => scopedValuations
        .filter(valuation => valuation.date.slice(0, 4) === String(year))
        .map(valuation => valuation.date)
        .sort()
        .pop();

    const years = [...new Set([
        ...scopedTransactions.map(transaction => Number(transaction.timestamp.slice(0, 4))),
        ...scopedValuations.map(valuation => Number(valuation.date.slice(0, 4))),
    ])].sort((a, b) => a - b);

    if (!years.length) return [];

    return years.reduce<AnnualPerformanceRow[]>((rows, year) => {
        const startDate = `${year}-01-01`;
        const endDate = lastValuationDateInYear(year) || `${year}-12-31`;
        const bmv = valueAtDate(`${year - 1}-12-31`);
        const emv = valueAtDate(endDate);

        if (bmv === 0 && emv === 0) return rows;

        const yearTransactions = scopedTransactions.filter(
            transaction => transaction.timestamp >= startDate && transaction.timestamp <= endDate,
        );

        const apports = sumTransactions(yearTransactions, 'apport');
        const retraits = sumTransactions(yearTransactions, 'retrait');
        const netCF = apports - retraits;
        const perfE = emv - bmv - netCF;
        const cumE = rows.reduce((sum, row) => sum + row.perfE, 0) + perfE;
        const capitalEnd = calculateCapitalAtDate(pocketIds, transactions, endDate);
        const perfPct = capitalEnd > 0.01 ? perfE / capitalEnd : null;
        const cumPct = capitalEnd > 0.01 ? cumE / capitalEnd : null;
        const dietz = calculateModifiedDietz(
            bmv,
            emv,
            toDietzCapitalFlows(yearTransactions),
            startDate,
            endDate,
        );

        return [
            ...rows,
            {
                y: year,
                bmv,
                emv,
                apports,
                retraits,
                netCF,
                perfE,
                perfPct,
                dietz,
                cumE,
                cumPct,
                capitalEnd,
            },
        ];
    }, []);
}
