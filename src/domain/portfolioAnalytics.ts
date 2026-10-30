export type TransactionType =
    | 'apport'
    | 'retrait';

export type Pocket = {
    id: string;
    nom?: string;
    couleur?: string;
    categorie?: string;
    createdAt?: string;
    closedAt?: string;
};

export type Transaction = {
    id?: string;
    pocheId: string;
    type: TransactionType;
    montant: number;
    timestamp: string;
    commentaire?: string;
    valeurAvant?: number;
    valeurAvantEstimation?: Omit<WithdrawalValueEstimate, 'valueBefore'>;
    valeurAvantEstimee?: boolean;
};

export type WithdrawalValueEstimate = {
    valueBefore: number;
    method: 'after-withdrawal' | 'previous-balance';
    sourceDate: string;
    sourceValue: number;
};

export type Valuation = {
    id?: string;
    pocheId: string;
    valeur: number;
    date: string;
    commentaire?: string;
    transactionId?: string;
    estimee?: boolean;
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
    valueEstimated: boolean;
    latentEstimated: boolean;
    realizedEstimated: boolean;
    dietzEstimated: boolean;
    gainTotal: number;
    gainNonRealise: number | null;
    gainLatent: number | null;
    gainRealise: number | null;
    xirr: number | null;
    dietz: number | null;
};

export type PortfolioMetrics = {
    tv: number;
    tc: number;
    tg: number;
    latent: number | null;
    valueEstimated: boolean;
    latentEstimated: boolean;
    xirr: number | null;
};

export type PerformancePoint = {
    date: string;
    estimated: boolean;
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
    valueEstimated: boolean;
    performanceEstimated: boolean;
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
    const latest = lastItem(valuations
        .filter(valuation => valuation.pocheId === pocketId && valuation.date <= date)
        .sort(byDateAsc));

    return latest?.valeur ?? 0;
}

export function localToday(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function getPocketValueAtDate(pocketId: string, transactions: Transaction[], valuations: Valuation[], date: string): number {
    const latest = lastItem(getPocketValuations(pocketId, valuations).filter(valuation => valuation.date <= date));
    const pending = getPocketTransactions(pocketId, transactions).filter(transaction => transaction.timestamp <= date
        && (!latest || transaction.timestamp > latest.date)).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    let valueCents = Math.round((latest?.valeur ?? 0) * 100);
    for (const transaction of pending) {
        if (transaction.valeurAvant !== undefined) valueCents = Math.round(transaction.valeurAvant * 100);
        valueCents += (transaction.type === 'apport' ? 1 : -1) * Math.round(transaction.montant * 100);
    }
    return Math.max(0, valueCents / 100);
}

export function isPocketValueEstimatedAtDate(pocketId: string, transactions: Transaction[], valuations: Valuation[], date: string): boolean {
    const latest = lastItem(getPocketValuations(pocketId, valuations).filter(valuation => valuation.date <= date));
    return !!latest?.estimee || getPocketTransactions(pocketId, transactions).some(transaction => transaction.timestamp <= date
        && (!latest || transaction.timestamp > latest.date));
}

export function assertHistoryEditable(pocketId: string, date: string, valuations: Valuation[], sourceIndex = Infinity): void {
    if (valuations.some((valuation, index) => valuation.pocheId === pocketId && valuation.transactionId
        && (valuation.date > date || valuation.date === date && index > sourceIndex))) {
        throw new Error('Des mouvements calculés existent après cette date. Supprimez d’abord les mouvements suivants pour corriger cet historique.');
    }
}

export function prepareContribution(
    pocketId: string, amount: number, date: string, valuations: Valuation[], transactions: Transaction[] = [], updatedAfter?: number,
): { valueBefore: number; valueAfter: number; estimated?: boolean } {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))
        || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('Choisissez une date d’apport valide.');
    if (date > localToday()) throw new Error('La date d’apport ne peut pas être future.');
    assertHistoryEditable(pocketId, date, valuations);
    if (!Number.isFinite(amount) || Math.round(amount * 100) <= 0) throw new Error('Le montant de l’apport doit être strictement positif.');
    const amountCents = Math.round(amount * 100);
    const afterCents = Math.round((updatedAfter ?? getPocketValueAtDate(pocketId, transactions, valuations, date) + amountCents / 100) * 100);
    if (!Number.isFinite(afterCents) || afterCents < amountCents) throw new Error('La valeur après apport doit inclure le montant versé.');
    const estimated = updatedAfter === undefined && isPocketValueEstimatedAtDate(pocketId, transactions, valuations, date);
    return { valueBefore: (afterCents - amountCents) / 100, valueAfter: afterCents / 100, ...(estimated ? { estimated: true } : {}) };
}

export function prepareWithdrawal(
    pocketId: string, amount: number, date: string, valuations: Valuation[], updatedValue?: number, transactions: Transaction[] = [],
): { valueBefore: number; valueAfter: number; estimated?: boolean } {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))
        || new Date(date).toISOString().slice(0, 10) !== date) {
        throw new Error('Choisissez une date de retrait valide.');
    }
    if (date > localToday()) throw new Error('La date de retrait ne peut pas être future.');
    assertHistoryEditable(pocketId, date, valuations);
    const latest = lastItem(getPocketValuations(pocketId, valuations).filter(valuation => valuation.date <= date));
    const valueBefore = updatedValue ?? (latest || transactions.some(transaction => transaction.pocheId === pocketId && transaction.timestamp <= date)
        ? getPocketValueAtDate(pocketId, transactions, valuations, date) : undefined);
    if (valueBefore === undefined) throw new Error('Renseignez la valeur de la poche avant le retrait.');
    if (!Number.isFinite(valueBefore) || valueBefore < 0) throw new Error('La valeur avant retrait doit être positive ou nulle.');
    if (!Number.isFinite(amount) || Math.round(amount * 100) <= 0) throw new Error('Le montant du retrait doit être strictement positif.');
    const availableCents = Math.round(valueBefore * 100);
    const withdrawalCents = Math.round(amount * 100);
    if (withdrawalCents > availableCents) {
        throw new Error('Le retrait dépasse la valeur de la poche. Actualisez la valorisation avant retrait.');
    }
    const estimated = updatedValue === undefined && isPocketValueEstimatedAtDate(pocketId, transactions, valuations, date);
    return { valueBefore: availableCents / 100, valueAfter: (availableCents - withdrawalCents) / 100, ...(estimated ? { estimated: true } : {}) };
}

export function validatePocketClosures(
    pockets: Pocket[], transactions: Transaction[], valuations: Valuation[], today = localToday(),
): void {
    for (const pocket of pockets) {
        if (pocket.closedAt === undefined) continue;
        const date = pocket.closedAt;
        if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)
            || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
            throw new Error('Date de clôture invalide.');
        }
        if (date > today) throw new Error('La date de clôture ne peut pas être future.');
        const pocketValues = getPocketValuations(pocket.id, valuations);
        if (getPocketTransactions(pocket.id, transactions).some(transaction => transaction.timestamp > date)
            || pocketValues.some(valuation => valuation.date > date)) {
            throw new Error('Des opérations existent après la date de clôture.');
        }
        const terminal = lastItem(pocketValues);
        if (!terminal || terminal.date !== date || terminal.valeur !== 0) {
            throw new Error('Enregistrez une valorisation finale à 0 € à la date de clôture, après les retraits réellement reçus.');
        }
    }
}

export function assertPocketWritable(pockets: Pocket[], pocketId: string): void {
    const pocket = pockets.find(candidate => candidate.id === pocketId);
    if (!pocket) throw new Error('Poche introuvable.');
    if (pocket.closedAt !== undefined) throw new Error('Rouvrez la poche avant de modifier ses opérations.');
}

export function completeWithdrawalValue(
    pockets: Pocket[], transactions: Transaction[], valuations: Valuation[], transaction: Transaction, valueBefore: number,
    estimate?: WithdrawalValueEstimate,
): Transaction[] {
    const index = transactions.indexOf(transaction);
    if (index < 0) throw new Error('Cette transaction a changé. Fermez puis rouvrez la correction.');
    assertPocketWritable(pockets, transaction.pocheId);
    if (transaction.type !== 'retrait' || transaction.valeurAvant !== undefined && !transaction.valeurAvantEstimation) throw new Error('Seul un retrait sans valeur avant retrait ou avec une estimation peut être complété.');
    if (!Number.isFinite(valueBefore) || valueBefore <= 0 || valueBefore > Number.MAX_SAFE_INTEGER / 100
        || Math.round(valueBefore * 100) < Math.round(transaction.montant * 100)) {
        throw new Error('La valeur avant retrait doit être au moins égale au montant retiré.');
    }
    if (estimate) {
        const proposed = estimateWithdrawalValue(transactions, valuations, transaction);
        if (!proposed || Math.round(valueBefore * 100) !== Math.round(proposed.valueBefore * 100)
            || estimate.method !== proposed.method || estimate.sourceDate !== proposed.sourceDate || estimate.sourceValue !== proposed.sourceValue) {
            throw new Error('L’estimation a changé. Fermez puis rouvrez la correction.');
        }
    }
    const next = transactions.map((entry, entryIndex) => {
        if (entryIndex !== index) return entry;
        const completed = { ...entry, valeurAvant: Math.round(valueBefore * 100) / 100 };
        if (estimate) completed.valeurAvantEstimation = { method: estimate.method, sourceDate: estimate.sourceDate, sourceValue: estimate.sourceValue };
        else delete completed.valeurAvantEstimation;
        return completed;
    });
    validatePortfolio(pockets, next, valuations);
    return next;
}

export function estimateWithdrawalValue(transactions: Transaction[], valuations: Valuation[], transaction: Transaction): WithdrawalValueEstimate | null {
    if (!transactions.includes(transaction) || transaction.type !== 'retrait') return null;
    const ordered = getPocketTransactions(transaction.pocheId, transactions).sort((left, right) => left.timestamp.localeCompare(right.timestamp));
    const targetIndex = ordered.indexOf(transaction);
    const values = getPocketValuations(transaction.pocheId, valuations).filter(valuation => !valuation.estimee);
    const after = lastItem(values.filter(valuation => valuation.date === transaction.timestamp));
    const afterIndex = after?.transactionId
        ? ordered.findIndex(entry => entry.id === after.transactionId)
        : ordered.reduce((lastIndex, entry, entryIndex) => entry.timestamp === transaction.timestamp ? entryIndex : lastIndex, -1);
    const signedCents = (entry: Transaction) => (entry.type === 'apport' ? 1 : -1) * Math.round(entry.montant * 100);
    const result = (valueCents: number, method: WithdrawalValueEstimate['method'], sourceDate: string, sourceValue: number): WithdrawalValueEstimate | null => {
        if (!Number.isSafeInteger(valueCents) || valueCents < Math.round(transaction.montant * 100)) return null;
        return { valueBefore: valueCents / 100, method, sourceDate, sourceValue };
    };
    if (after && afterIndex >= targetIndex) {
        const flows = ordered.slice(targetIndex, afterIndex + 1).reduce((total, entry) => total + signedCents(entry), 0);
        return result(Math.round(after.valeur * 100) - flows, 'after-withdrawal', after.date, after.valeur);
    }
    const before = lastItem(values.filter(valuation => valuation.date < transaction.timestamp));
    if (!before) return null;
    let valueCents = Math.round(before.valeur * 100);
    let sourceDate = before.date;
    let sourceValue = before.valeur;
    for (const entry of ordered.slice(0, targetIndex).filter(entry => entry.timestamp > before.date)) {
        if (entry.valeurAvant !== undefined) {
            valueCents = Math.round(entry.valeurAvant * 100);
            if (entry.valeurAvantEstimation) {
                sourceDate = entry.valeurAvantEstimation.sourceDate;
                sourceValue = entry.valeurAvantEstimation.sourceValue;
            } else if (!entry.valeurAvantEstimee) {
                sourceDate = entry.timestamp;
                sourceValue = entry.valeurAvant;
            }
        }
        valueCents += signedCents(entry);
        if (valueCents < 0) return null;
    }
    return result(valueCents, 'previous-balance', sourceDate, sourceValue);
}

export function validatePortfolio(pockets: unknown, transactions: unknown, valuations: unknown): void {
    const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
    const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
        && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
    const validId = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
    const money = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
        && value >= 0 && value <= Number.MAX_SAFE_INTEGER / 100;
    if (!Array.isArray(pockets) || !Array.isArray(transactions) || !Array.isArray(valuations)) throw new Error('Les poches, transactions et valorisations doivent être des listes.');
    const today = localToday();
    const pocketIds = new Set<string>();
    for (const pocket of pockets) {
        if (!record(pocket) || !validId(pocket.id) || pocketIds.has(pocket.id)) throw new Error('Identifiant de poche absent ou dupliqué.');
        pocketIds.add(pocket.id);
        for (const key of ['nom', 'couleur', 'categorie']) if (pocket[key] !== undefined && typeof pocket[key] !== 'string') throw new Error('Métadonnées de poche invalides.');
        if (pocket.createdAt !== undefined && !validDate(pocket.createdAt)) throw new Error('Date de création invalide.');
    }
    const transactionIds = new Set<string>();
    for (const transaction of transactions) {
        if (!record(transaction) || !validId(transaction.pocheId) || !pocketIds.has(transaction.pocheId)) throw new Error('Une transaction référence une poche inexistante.');
        if (!['apport', 'retrait'].includes(transaction.type as string) || !money(transaction.montant) || Math.round(transaction.montant * 100) <= 0
            || !validDate(transaction.timestamp)) throw new Error('Type, montant ou date de transaction invalide.');
        if (transaction.timestamp > today) throw new Error('La date de transaction ne peut pas être future.');
        if (transaction.id !== undefined) {
            if (!validId(transaction.id) || transactionIds.has(transaction.id)) throw new Error('Identifiant de transaction invalide ou dupliqué.');
            transactionIds.add(transaction.id);
        }
        if (transaction.valeurAvant !== undefined && (!money(transaction.valeurAvant)
            || transaction.type === 'retrait' && Math.round(transaction.valeurAvant * 100) < Math.round(transaction.montant * 100))) throw new Error('Valeur avant mouvement invalide.');
        if (transaction.valeurAvantEstimation !== undefined) {
            const estimate = transaction.valeurAvantEstimation;
            if (transaction.type !== 'retrait' || transaction.valeurAvant === undefined || !record(estimate)
                || !['after-withdrawal', 'previous-balance'].includes(estimate.method as string)
                || !validDate(estimate.sourceDate) || estimate.sourceDate > transaction.timestamp || !money(estimate.sourceValue)
                || estimate.method === 'after-withdrawal' && estimate.sourceDate !== transaction.timestamp) {
                throw new Error('Provenance de l’estimation historique invalide.');
            }
        }
        if (transaction.valeurAvantEstimee !== undefined && (typeof transaction.valeurAvantEstimee !== 'boolean'
            || transaction.valeurAvant === undefined)) throw new Error('Statut de la valeur avant mouvement invalide.');
        if (transaction.commentaire !== undefined && typeof transaction.commentaire !== 'string') throw new Error('Commentaire de transaction invalide.');
    }
    const valuationIds = new Set<string>(), linkedIds = new Set<string>();
    for (const valuation of valuations) {
        if (!record(valuation) || !validId(valuation.pocheId) || !pocketIds.has(valuation.pocheId)) throw new Error('Une valorisation référence une poche inexistante.');
        if (!money(valuation.valeur) || !validDate(valuation.date)) throw new Error('Montant ou date de valorisation invalide.');
        if (valuation.date > today) throw new Error('La date de valorisation ne peut pas être future.');
        if (valuation.estimee !== undefined && typeof valuation.estimee !== 'boolean') throw new Error('Statut de valorisation invalide.');
        if (valuation.id !== undefined) {
            if (!validId(valuation.id) || valuationIds.has(valuation.id)) throw new Error('Identifiant de valorisation invalide ou dupliqué.');
            valuationIds.add(valuation.id);
        }
        if (valuation.commentaire !== undefined && typeof valuation.commentaire !== 'string') throw new Error('Commentaire de valorisation invalide.');
        if (valuation.transactionId !== undefined) {
            if (!validId(valuation.transactionId) || linkedIds.has(valuation.transactionId)) throw new Error('Lien de mouvement invalide ou dupliqué.');
            linkedIds.add(valuation.transactionId);
            const transaction = transactions.find(transaction => transaction.id === valuation.transactionId);
            if (!transaction || transaction.pocheId !== valuation.pocheId || transaction.timestamp !== valuation.date || transaction.valeurAvant === undefined) throw new Error('La valorisation liée ne correspond pas à sa transaction.');
            const expected = Math.round(transaction.valeurAvant * 100) + (transaction.type === 'apport' ? 1 : -1) * Math.round(transaction.montant * 100);
            if (Math.round(valuation.valeur * 100) !== expected) throw new Error('Le solde lié au mouvement est incohérent.');
            if (!!valuation.estimee !== !!(transaction.valeurAvantEstimee || transaction.valeurAvantEstimation)) throw new Error('Le statut estimé du solde lié est incohérent.');
        }
    }
    validatePocketClosures(pockets as Pocket[], transactions as Transaction[], valuations as Valuation[]);
}

export function readPortfolioData(input: unknown): { pockets: Pocket[]; transactions: Transaction[]; valuations: Valuation[] } | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Format non reconnu.');
    const data = input as Record<string, unknown>;
    const keys = ['poches', 'p', 'transactions', 't', 'valorisations', 'v'];
    if (!keys.some(key => Object.hasOwn(data, key))) return null;
    for (const key of keys) if (Object.hasOwn(data, key) && !Array.isArray(data[key])) throw new Error(`La rubrique « ${key} » doit être une liste.`);
    const pockets = data.poches ?? data.p ?? [], transactions = data.transactions ?? data.t ?? [], valuations = data.valorisations ?? data.v ?? [];
    validatePortfolio(pockets, transactions, valuations);
    return { pockets: pockets as Pocket[], transactions: transactions as Transaction[], valuations: valuations as Valuation[] };
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

    if (inputFlows.some(flow => !Number.isFinite(flow.amount) || !Number.isFinite(Date.parse(flow.date)))) return null;
    const dailyAmounts = new Map<string, number>();
    for (const flow of inputFlows) dailyAmounts.set(flow.date, (dailyAmounts.get(flow.date) ?? 0) + flow.amount);
    const flows = [...dailyAmounts].map(([date, amount]) => ({ date, amount }))
        .filter(flow => Math.abs(flow.amount) > EPSILON)
        .sort(byDateAsc);

    if (flows.length < 2) return null;

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
export function getPocketMetrics(pocketId: string, transactions: Transaction[], valuations: Valuation[], closedAt?: string): PocketMetrics {
    const pocketTransactions = getPocketTransactions(pocketId, transactions);
    const pocketValuations = getPocketValuations(pocketId, valuations);

    const apports = sumTransactions(pocketTransactions, 'apport');
    const retraits = sumTransactions(pocketTransactions, 'retrait');

    const capital = apports - retraits;
    const endDate = [...pocketValuations.map(valuation => valuation.date), ...pocketTransactions.map(transaction => transaction.timestamp)].sort().pop();
    const valActu = endDate ? getPocketValueAtDate(pocketId, transactions, valuations, endDate) : 0;
    const valueEstimated = endDate ? isPocketValueEstimatedAtDate(pocketId, transactions, valuations, endDate) : false;

    const xirrCashFlows = toXirrCashFlows(pocketTransactions);
    if (valActu > 0 && xirrCashFlows.length && endDate) {
        xirrCashFlows.push({ date: endDate, amount: valActu });
    }

    const xirr = xirrCashFlows.length >= 2 ? calculateXirr(xirrCashFlows) : null;

    let dietz: number | null = null;
    if (pocketValuations.length >= 2) {
        const startDate = pocketValuations[0].date;
        const periodTransactions = pocketTransactions.filter(
            transaction => transaction.timestamp > startDate && transaction.timestamp <= endDate!,
        );

        dietz = calculateModifiedDietz(
            getPocketValueAtDate(pocketId, transactions, valuations, startDate),
            valActu,
            toDietzCapitalFlows(periodTransactions),
            startDate,
            endDate!,
        );
    }

    const gainTotal = valActu - capital;
    let remainingCost: number | null = 0;
    let costEstimated = false;
    for (const transaction of [...pocketTransactions].sort((a, b) => a.timestamp.localeCompare(b.timestamp))) {
        const beforeEstimated = !!(transaction.valeurAvantEstimation || transaction.valeurAvantEstimee);
        if (transaction.type === 'apport') {
            if (transaction.valeurAvant === 0) { remainingCost = 0; costEstimated = beforeEstimated; }
            if (remainingCost !== null) remainingCost += transaction.montant;
        } else if (transaction.valeurAvant !== undefined && Math.round(transaction.valeurAvant * 100) === Math.round(transaction.montant * 100)) {
            remainingCost = 0;
            costEstimated = beforeEstimated;
        } else if (remainingCost !== null) {
            if (transaction.valeurAvant === undefined || transaction.valeurAvant <= 0) remainingCost = null;
            else { remainingCost *= Math.max(0, 1 - transaction.montant / transaction.valeurAvant); costEstimated ||= beforeEstimated; }
        }
    }
    const gainNonRealise = valActu === 0 ? 0 : remainingCost === null ? null : valActu - remainingCost;

    return {
        apports,
        retraits,
        capital,
        valActu,
        valueEstimated,
        latentEstimated: gainNonRealise !== null && (costEstimated || valueEstimated),
        realizedEstimated: gainNonRealise !== null && costEstimated,
        dietzEstimated: dietz !== null && (valueEstimated || isPocketValueEstimatedAtDate(pocketId, transactions, valuations, pocketValuations[0].date)),
        gainTotal,
        gainNonRealise,
        gainLatent: gainNonRealise,
        gainRealise: gainNonRealise === null ? null : gainTotal - gainNonRealise,
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
        ...getPocketMetrics(pocket.id, transactions, valuations, pocket.closedAt),
    })),
): PortfolioMetrics {
    const tv = pocketMetrics.reduce((sum, pocket) => sum + pocket.valActu, 0);
    const tc = pocketMetrics.reduce((sum, pocket) => sum + pocket.capital, 0);
    const latent = pocketMetrics.some(pocket => pocket.gainNonRealise === null) ? null
        : pocketMetrics.reduce((sum, pocket) => sum + pocket.gainNonRealise!, 0);

    const pocketIds = new Set(pockets.map(pocket => pocket.id));
    const scopedTransactions = transactions.filter(transaction => pocketIds.has(transaction.pocheId));
    const xirrCashFlows = toXirrCashFlows(scopedTransactions);
    const endDate = [...valuations.filter(valuation => pocketIds.has(valuation.pocheId)).map(valuation => valuation.date),
    ...scopedTransactions.map(transaction => transaction.timestamp)].sort().pop();
    for (const pocket of pockets) {
        const value = endDate ? getPocketValueAtDate(pocket.id, transactions, valuations, endDate) : 0;
        if (endDate && value > 0) {
            xirrCashFlows.push({ date: endDate, amount: value });
        }
    }

    return {
        tv,
        tc,
        tg: pocketMetrics.reduce((sum, pocket) => sum + pocket.gainTotal, 0),
        latent,
        valueEstimated: pocketMetrics.some(pocket => pocket.valueEstimated),
        latentEstimated: latent !== null && pocketMetrics.some(pocket => pocket.latentEstimated),
        xirr: xirrCashFlows.length >= 2 ? calculateXirr(xirrCashFlows) : null,
    };
}

/** Builds the portfolio chart series: value, capital invested, absolute and percentage performance. */
export function buildPortfolioHistory(
    pockets: Pocket[],
    transactions: Transaction[],
    valuations: Valuation[],
): PerformancePoint[] {
    const pocketIds = pockets.map(pocket => pocket.id);
    const dates = [...new Set([...valuations.filter(valuation => pocketIds.includes(valuation.pocheId)).map(valuation => valuation.date),
    ...transactions.filter(transaction => pocketIds.includes(transaction.pocheId)).map(transaction => transaction.timestamp)])].sort();

    return dates.map(date => {
        const value = pockets.reduce(
            (sum, pocket) => sum + getPocketValueAtDate(pocket.id, transactions, valuations, date),
            0,
        );
        const performance = calculatePerformanceAtDate(pocketIds, transactions, date, value);
        const capital = calculateCapitalAtDate(pocketIds, transactions, date);
        const pct = capital > 0.01 ? performance / capital : null;

        return {
            date: date.slice(0, 7),
            estimated: pockets.some(pocket => isPocketValueEstimatedAtDate(pocket.id, transactions, valuations, date)),
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
    return buildPortfolioHistory([{ id: pocketId }], transactions, valuations);
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
        (sum, id) => sum + getPocketValueAtDate(id, transactions, valuations, date),
        0,
    );

    const years = [...new Set([
        ...scopedTransactions.map(transaction => Number(transaction.timestamp.slice(0, 4))),
        ...scopedValuations.map(valuation => Number(valuation.date.slice(0, 4))),
    ])].sort((a, b) => a - b);

    if (!years.length) return [];

    return years.reduce<AnnualPerformanceRow[]>((rows, year) => {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        const bmv = valueAtDate(`${year - 1}-12-31`);
        const emv = valueAtDate(endDate);
        const valueEstimated = pocketIds.some(id => isPocketValueEstimatedAtDate(id, transactions, valuations, endDate));
        const performanceEstimated = valueEstimated || pocketIds.some(id => isPocketValueEstimatedAtDate(id, transactions, valuations, `${year - 1}-12-31`));

        const yearTransactions = scopedTransactions.filter(
            transaction => transaction.timestamp >= startDate && transaction.timestamp <= endDate,
        );

        if (bmv === 0 && emv === 0 && yearTransactions.length === 0) return rows;

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
                valueEstimated,
                performanceEstimated,
            },
        ];
    }, []);
}
