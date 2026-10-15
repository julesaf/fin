export interface Pocket { name: string; initialCapital: number; annualContribution: number; annualReturnRate: number; taxRate: number; crisisSensitive?: boolean }
export interface Result { capitalStart: number; capitalAfterReturn: number; gross: number; taxable: number; tax: number; net: number; contribution: number; capital: number; basis: number; gains: number; paid: number }
export interface Year { year: number; pockets: Result[]; capital: number; gross: number; net: number; tax: number }
export interface MonteCarloOptions { paths: number; volatility: number; crisisProbability: number; crisisLossMin: number; crisisLossMax: number; seed: number }
export interface SimulationPocket extends Pocket { id: string; color: string }
export interface SimulationConfig { version: 1; pockets: SimulationPocket[]; years: number; withdrawal: number; projection: number; stochastic: boolean; options: MonteCarloOptions }

function validateParameters(pockets: Pocket[], years: number, withdrawal: number, projection: number) {
    if (!Number.isInteger(years) || years < 1 || years > 100 || !Number.isFinite(withdrawal) || withdrawal < 0 || withdrawal > 1) throw new Error('Duree ou retrait invalide');
    if (!Number.isInteger(projection) || projection < years || projection > 150) throw new Error('Projection invalide');
    if (!Array.isArray(pockets) || !pockets.length) throw new Error('Ajoutez au moins une poche');
    pockets.forEach(pocket => {
        if (!pocket || ![pocket.initialCapital, pocket.annualContribution, pocket.annualReturnRate, pocket.taxRate].every(Number.isFinite) || pocket.initialCapital < 0 || pocket.annualContribution < 0 || pocket.annualReturnRate < -1 || pocket.taxRate < 0 || pocket.taxRate > 1 || (pocket.crisisSensitive !== undefined && typeof pocket.crisisSensitive !== 'boolean')) throw new Error('Parametres de poche invalides');
    });
}

export function validateMonteCarlo(options: MonteCarloOptions) {
    if (!options || !Number.isSafeInteger(options.paths) || options.paths < 10 || !Number.isInteger(options.seed) || options.seed < 0 || options.seed > 4294967295 || ![options.volatility, options.crisisProbability, options.crisisLossMin, options.crisisLossMax].every(value => Number.isFinite(value) && value >= 0 && value <= 1) || options.crisisLossMin > options.crisisLossMax) throw new Error('Parametres de simulation crises invalides : baisse min <= max, scenarios entiers >= 10 et graine de 0 a 4294967295');
}

export function createSimulationPocket(index = 0, color = '#E8364A'): SimulationPocket {
    return { id: crypto.randomUUID(), color, name: `Poche ${index + 1}`, initialCapital: 0, annualContribution: 0, annualReturnRate: .087, taxRate: .3, crisisSensitive: true };
}

export function createSimulationConfig(): SimulationConfig {
    return { version: 1, pockets: [createSimulationPocket()], years: 20, withdrawal: .04, projection: 40, stochastic: false, options: { paths: 100000, volatility: .12, crisisProbability: .05, crisisLossMin: .15, crisisLossMax: .3, seed: 42 } };
}

export function readSimulationConfig(value: unknown): SimulationConfig {
    if (!value || typeof value !== 'object') throw new Error('Configuration de simulation invalide');
    const config = value as SimulationConfig;
    if (config.version !== 1 || typeof config.stochastic !== 'boolean') throw new Error('Version de simulation non reconnue');
    validateParameters(config.pockets, config.years, config.withdrawal, config.projection);
    validateMonteCarlo(config.options);
    const ids = new Set<string>();
    const pockets = config.pockets.map(pocket => {
        if (typeof pocket.id !== 'string' || !pocket.id.trim() || ids.has(pocket.id) || typeof pocket.name !== 'string' || !pocket.name.trim() || pocket.name.length > 48 || typeof pocket.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(pocket.color)) throw new Error('Identifiant, nom ou couleur de poche invalide');
        ids.add(pocket.id);
        return { id: pocket.id, color: pocket.color, name: pocket.name, initialCapital: pocket.initialCapital, annualContribution: pocket.annualContribution, annualReturnRate: pocket.annualReturnRate, taxRate: pocket.taxRate, crisisSensitive: pocket.crisisSensitive !== false };
    });
    const { volatility, crisisProbability, crisisLossMin, crisisLossMax, seed } = config.options;
    return { version: 1, pockets, years: config.years, withdrawal: config.withdrawal, projection: config.projection, stochastic: config.stochastic, options: { paths: 100000, volatility, crisisProbability, crisisLossMin, crisisLossMax, seed } };
}

export function simulate(pockets: Pocket[], years: number, withdrawal: number, projection = years, returns?: (year: number, index: number) => number): Year[] {
    validateParameters(pockets, years, withdrawal, projection);
    let states = pockets.map(pocket => ({ capital: pocket.initialCapital, basis: pocket.initialCapital, paid: pocket.initialCapital }));
    const rows: Year[] = [];
    for (let year = 1; year <= projection; year++) {
        const results = pockets.map((pocket, index): Result => {
            const state = states[index];
            const rate = returns ? returns(year, index) : pocket.annualReturnRate;
            if (!Number.isFinite(rate) || rate < -1) throw new Error('Rendement simule invalide');
            const available = state.capital * (1 + rate);
            const contribution = year <= years ? pocket.annualContribution : 0;
            const beforeWithdrawal = available + contribution;
            const beforeBasis = state.basis + contribution;
            const gross = beforeWithdrawal * withdrawal;
            const share = beforeWithdrawal > 0 ? Math.min(1, Math.max(0, (beforeWithdrawal - beforeBasis) / beforeWithdrawal)) : 0;
            const taxable = gross * share;
            const tax = taxable * pocket.taxRate;
            const capital = year > years ? beforeWithdrawal - gross : beforeWithdrawal;
            const basis = year > years ? beforeBasis * (1 - withdrawal) : beforeBasis;
            const paid = state.paid + contribution;
            if (![capital, basis, gross, tax, paid].every(Number.isFinite)) throw new Error('Montants trop eleves pour le calcul');
            return { capitalStart: state.capital, capitalAfterReturn: available, gross, taxable, tax, net: gross - tax, contribution, capital, basis, gains: capital - basis, paid };
        });
        states = results;
        const row = { year, pockets: results, capital: results.reduce((sum, item) => sum + item.capital, 0), gross: results.reduce((sum, item) => sum + item.gross, 0), net: results.reduce((sum, item) => sum + item.net, 0), tax: results.reduce((sum, item) => sum + item.tax, 0) };
        if (![row.capital, row.gross, row.net, row.tax].every(Number.isFinite)) throw new Error('Montants trop eleves pour le calcul');
        rows.push(row);
    }
    return rows;
}

export function monteCarlo(pockets: Pocket[], years: number, withdrawal: number, projection: number, options: MonteCarloOptions, progress?: (completed: number) => void) {
    validateMonteCarlo(options);
    simulate(pockets, years, withdrawal, projection);
    let state = options.seed >>> 0;
    const random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return (state + .5) / 4294967296; };
    const samples = Array.from({ length: projection }, () => new Float64Array(options.paths));
    const seeds = new Uint32Array(options.paths);
    const capitals = new Float64Array(pockets.length);
    const bases = new Float64Array(pockets.length);
    const incomeSamples = Array.from({ length: projection }, () => new Float64Array(options.paths));
    const progressInterval = Math.max(1, Math.min(2000, Math.floor(options.paths / 100)));
    progress?.(0);
    for (let path = 0; path < options.paths; path++) {
        seeds[path] = state;
        pockets.forEach((pocket, index) => { capitals[index] = pocket.initialCapital; bases[index] = pocket.initialCapital; });
        for (let year = 1; year <= projection; year++) {
            const normal = Math.sqrt(-2 * Math.log(random())) * Math.cos(2 * Math.PI * random());
            const crisis = random() < options.crisisProbability;
            const loss = crisis ? options.crisisLossMin + random() * (options.crisisLossMax - options.crisisLossMin) : 0;
            let total = 0;
            let net = 0;
            pockets.forEach((pocket, index) => {
                const factor = Math.max(0, 1 + pocket.annualReturnRate + (pocket.crisisSensitive !== false ? options.volatility * normal : 0));
                capitals[index] *= factor * (crisis && pocket.crisisSensitive !== false ? 1 - loss : 1);
                if (year <= years) { capitals[index] += pocket.annualContribution; bases[index] += pocket.annualContribution; }
                const gross = capitals[index] * withdrawal;
                const share = capitals[index] > 0 ? Math.min(1, Math.max(0, (capitals[index] - bases[index]) / capitals[index])) : 0;
                net += gross * (1 - share * pocket.taxRate);
                if (year > years) { capitals[index] -= gross; bases[index] *= 1 - withdrawal; }
                total += capitals[index];
            });
            if (!Number.isFinite(total) || !Number.isFinite(net)) throw new Error('Montants trop eleves pour le calcul');
            samples[year - 1][path] = total;
            incomeSamples[year - 1][path] = net / 12;
        }
        if ((path + 1) % progressInterval === 0 && path + 1 < options.paths) progress?.(path + 1);
    }
    progress?.(options.paths);
    const finalValues = samples[projection - 1];
    const sortedFinal = finalValues.slice().sort();
    const median = sortedFinal[Math.floor((options.paths - 1) * .5)];
    const reconstruct = (seed: number) => {
        state = seed;
        const shocks = Array.from({ length: projection }, () => {
            const normal = Math.sqrt(-2 * Math.log(random())) * Math.cos(2 * Math.PI * random());
            const crisis = random() < options.crisisProbability;
            const loss = crisis ? options.crisisLossMin + random() * (options.crisisLossMax - options.crisisLossMin) : 0;
            return { normal, crisis, loss };
        });
        return simulate(pockets, years, withdrawal, projection, (year, index) => {
            if (pockets[index].crisisSensitive === false) return pockets[index].annualReturnRate;
            const shock = shocks[year - 1];
            const factor = Math.max(0, 1 + pockets[index].annualReturnRate + options.volatility * shock.normal);
            return factor * (shock.crisis ? 1 - shock.loss : 1) - 1;
        });
    };
    const representative = reconstruct(seeds[finalValues.indexOf(median)]);
    const medianCapitalRows: Year[] = [];
    const percentiles = samples.map((values, index) => {
        const sorted = values.slice().sort();
        const quantile = (fraction: number) => sorted[Math.floor((sorted.length - 1) * fraction)];
        medianCapitalRows.push(reconstruct(seeds[values.indexOf(quantile(.5))])[index]);
        return { year: index + 1, low: quantile(.1), median: quantile(.5), high: quantile(.9) };
    });
    const annualIncomes = incomeSamples.map((values, index) => {
        values.sort();
        const quantile = (fraction: number) => values[Math.floor((options.paths - 1) * fraction)];
        return { year: index + 1, low: quantile(.1), median: quantile(.5), high: quantile(.9) };
    });
    const incomes = annualIncomes.slice(years - 1);
    return Object.assign(percentiles, { representative, medianCapitalRows, annualIncomes, incomes, income: incomes[incomes.length - 1] });
}

export type MonteCarloResult = ReturnType<typeof monteCarlo>;

export function simulationCsv(pockets: Pocket[], rows: Year[], medianIncomes?: { year: number; median: number }[]): string {
    const header = ['Annee', 'Poche', 'Capital debut EUR', 'Apres rendement EUR', 'Verse cumule EUR', 'Depot EUR', 'Patrimoine fin annee EUR', 'Capital place restant EUR', 'Gains ou pertes EUR', 'Gains imposables EUR', 'Impot EUR', 'Retrait net poche EUR', 'Mensuel net poche EUR', ...(medianIncomes ? ['Mensuel net median portefeuille EUR'] : [])];
    const medianNetByYear = new Map(medianIncomes?.map(row => [row.year, row.median]));
    const quote = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const data = rows.flatMap(row => row.pockets.map((item, index) => [row.year, pockets[index].name, item.capitalStart, item.capitalAfterReturn, item.paid, item.contribution, item.capital, item.basis, item.gains, item.taxable, item.tax, item.net, item.net / 12, ...(medianIncomes ? [medianNetByYear.get(row.year) ?? ''] : [])].map(value => quote(typeof value === 'number' ? value.toLocaleString('fr-FR', { useGrouping: false, maximumFractionDigits: 2 }) : value)).join(';')));
    return '\uFEFF' + header.map(quote).join(';') + '\r\n' + data.join('\r\n');
}