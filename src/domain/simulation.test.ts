import { describe, expect, it } from 'vitest';
import { simulate, monteCarlo, createSimulationConfig, createSimulationPocket, readSimulationConfig, simulationCsv, type Pocket } from './simulation';

const pocket: Pocket = { name: 'A', initialCapital: 1000, annualContribution: 100, annualReturnRate: .1, taxRate: .3 };
const options = { paths: 100, volatility: .12, crisisProbability: .08, crisisLossMin: .2, crisisLossMax: .4, seed: 42 };
const result = (changes: Partial<Pocket> = {}, withdrawal = .1) => simulate([{ ...pocket, ...changes }], 1, withdrawal)[0].pockets[0];

describe('Simulation annuelle', () => {
    it('accepte les grands volumes sans plafond applicatif', () => {
        const settings = { ...options, paths: 10000, volatility: 0, crisisProbability: 0 };
        const output = monteCarlo([pocket], 1, .04, 2, settings);
        expect(output[1].median).toBeCloseTo(simulate([pocket], 1, .04, 2)[1].capital);
        output.incomes.forEach(row => {
            const expected = simulate([pocket], 1, .04, 2)[row.year - 1].net / 12;
            for (const value of [row.low, row.median, row.high]) expect(value).toBeCloseTo(expected);
        });
        expect(output.representative[1].capital).toBeCloseTo(output[1].median);
        expect(monteCarlo([pocket], 1, .04, 1, { ...settings, paths: 1000001 })[0].median).toBeCloseTo(1200);
        expect(() => monteCarlo([pocket], 1, .04, 1, { ...settings, paths: Number.MAX_SAFE_INTEGER + 1 })).toThrow();
    });
    it('arrete les depots apres horizon et reduit la base fiscale', () => {
        const rows = simulate([{ ...pocket, annualReturnRate: 0 }], 1, .04, 3);
        expect(rows.map(row => row.capital)).toEqual([1100, 1056, 1013.76]);
        expect(rows[2].gross).toBeCloseTo(42.24);
        expect(rows[2].pockets[0].basis).toBeCloseTo(1013.76);
        expect(rows[2].pockets[0].paid).toBe(1100);
        const item = simulate([pocket], 1, .1, 2)[1].pockets[0];
        expect(item.capital).toBeCloseTo(1188);
        expect(item.basis).toBeCloseTo(990);
        expect(item.tax).toBeCloseTo(6.6);
    });
    it('conserve le capital pendant accumulation et affiche des revenus potentiels', () => {
        const item = result();
        expect(item.gross).toBeCloseTo(120);
        expect(item.taxable).toBeCloseTo(10);
        expect(item.tax).toBeCloseTo(3);
        expect(item.net).toBeCloseTo(117);
        expect(item.capital).toBeCloseTo(1200);
        expect(item.basis).toBeCloseTo(1100);
        expect(item.gains).toBeCloseTo(100);
        const rows = simulate([pocket], 2, .1);
        expect(rows.map(row => row.capital)).toEqual([1200, 1420]);
        for (const rate of [0, 1]) expect(simulate([pocket], 2, rate).map(row => [row.capital, row.pockets[0].basis])).toEqual(rows.map(row => [row.capital, row.pockets[0].basis]));
    });
    it('gere capital nul, pertes, retrait nul/total et fiscalite zero/100 %', () => {
        expect(result({ initialCapital: 0 }).capital).toBe(100);
        expect(result({ annualReturnRate: 0 }).tax).toBe(0);
        expect(result({}, 0).capital).toBe(1200);
        expect(result({ annualReturnRate: -.5 }).gains).toBe(-500);
        expect(result({ annualReturnRate: -.5 }).tax).toBe(0);
        expect(result({ annualReturnRate: -1 }).capital).toBe(100);
        expect(result({}, 1).capital).toBe(1200);
        expect(result({ taxRate: 0 }).net).toBeCloseTo(120);
        expect(result({ taxRate: 1 }).net).toBeCloseTo(110);
        expect(simulate([pocket], 1, 1, 2)[1].capital).toBe(0);
    });
    it.each([1, 3, 5])('calcule %i poches independantes et leurs agregats', count => {
        const pockets = Array.from({ length: count }, (_, index) => ({ ...pocket, initialCapital: 1000 * (index + 1), taxRate: index / count }));
        simulate(pockets, 2, .1, 4).forEach((row, yearIndex) => {
            for (const key of ['capital', 'gross', 'net', 'tax'] as const) expect(row[key]).toBeCloseTo(row.pockets.reduce((sum, item) => sum + item[key], 0));
            row.pockets.forEach((item, index) => expect(item).toEqual(simulate([pockets[index]], 2, .1, 4)[yearIndex].pockets[0]));
            expect(row.net).toBeCloseTo(row.gross - row.tax);
        });
    });
    it('rejette les durees, montants, listes et agregats invalides', () => {
        for (const years of [0, 101, 1.5, NaN]) expect(() => simulate([pocket], years, .1)).toThrow();
        for (const rate of [-.1, 1.1, Infinity]) expect(() => simulate([pocket], 1, rate)).toThrow();
        for (const changes of [{ initialCapital: -1 }, { annualContribution: NaN }, { annualReturnRate: -1.1 }, { taxRate: 1.1 }]) expect(() => result(changes)).toThrow();
        expect(() => simulate([], 1, .04)).toThrow();
        expect(() => simulate([pocket], 2, .04, 1)).toThrow();
        expect(() => simulate(Array.from({ length: 3 }, () => ({ ...pocket, initialCapital: 8e307, annualReturnRate: 0 })), 1, 0)).toThrow();
    });
});

describe('Monte-Carlo', () => {
    it.each([10, 300, 30000])('signale une progression intermediaire pour %i scenarios', paths => {
        const completed: number[] = [];
        monteCarlo([pocket], 1, .04, 1, { ...options, paths }, value => completed.push(value));
        expect(completed[0]).toBe(0);
        expect(completed.at(-1)).toBe(paths);
        expect(completed.some(value => value > 0 && value < paths)).toBe(true);
        expect(completed.every((value, index) => index === 0 || value > completed[index - 1])).toBe(true);
    });
    it('est reproductible avec une graine et coherent avec la reference sans choc', () => {
        const settings = { ...options, volatility: 0, crisisProbability: 0 };
        const output = monteCarlo([pocket], 1, .04, 3, settings);
        expect(output).toEqual(monteCarlo([pocket], 1, .04, 3, settings));
        expect(output[2].median).toBeCloseTo(simulate([pocket], 1, .04, 3)[2].capital);
        expect(monteCarlo([pocket], 1, .04, 3, { ...settings, crisisProbability: 1, crisisLossMin: 1, crisisLossMax: 1 })[2].high).toBe(0);
    });
    it('fournit une trajectoire comptable unique pour cinq poches', () => {
        const pockets = Array.from({ length: 5 }, (_, index) => ({ ...pocket, initialCapital: (index + 1) * 1000, crisisSensitive: index % 2 === 0 }));
        const output = monteCarlo(pockets, 2, .04, 6, options);
        expect(output.representative.at(-1)!.capital).toBeCloseTo(output.at(-1)!.median);
        output.representative.forEach(row => {
            expect(row.pockets).toHaveLength(5);
            expect(row.net).toBeCloseTo(row.gross - row.tax);
            expect(row.capital).toBeCloseTo(row.pockets.reduce((sum, item) => sum + item.capital, 0));
        });
        expect(output.incomes.map(row => row.year)).toEqual([2, 3, 4, 5, 6]);
    });
    it('respecte les bornes de crises et epargne les poches non exposees', () => {
        const settings = { ...options, volatility: 0, crisisProbability: 1, crisisLossMin: .2, crisisLossMax: .5 };
        const exposed = { ...pocket, annualContribution: 0 };
        const output = monteCarlo([exposed], 1, 0, 1, settings);
        expect(output[0].low).toBeGreaterThanOrEqual(550);
        expect(output[0].high).toBeLessThanOrEqual(880);
        expect(output[0].low).toBeLessThan(output[0].high);
        const mixed = monteCarlo([exposed, { ...exposed, crisisSensitive: false }], 1, .04, 3, settings);
        const safe = simulate([exposed], 1, .04, 3);
        mixed.representative.forEach((row, index) => expect(row.pockets[1].capital).toBeCloseTo(safe[index].capital));
        for (const changes of [{ paths: 0 }, { paths: 10.5 }, { seed: -1 }, { seed: 4294967296 }, { crisisLossMin: .6 }]) expect(() => monteCarlo([pocket], 1, 0, 1, { ...settings, ...changes })).toThrow();
    });
    it('applique la volatilite et les crises seulement aux poches cochees', () => {
        const safePocket = { ...pocket, crisisSensitive: false };
        const baseline = simulate([safePocket], 2, .04, 6);
        const settings = { ...options, volatility: .3, crisisProbability: 1, crisisLossMin: .2, crisisLossMax: .5 };
        const output = monteCarlo([{ ...pocket, crisisSensitive: true }, safePocket], 2, .04, 6, settings);
        output.representative.forEach((row, index) => {
            expect(row.pockets[1]).toEqual(baseline[index].pockets[0]);
            expect(row.capital).toBeCloseTo(row.pockets.reduce((sum, item) => sum + item.capital, 0));
            expect(row.net).toBeCloseTo(row.pockets.reduce((sum, item) => sum + item.net, 0));
        });
        expect(output.representative.some((row, index) => row.pockets[0].capital !== baseline[index].capital)).toBe(true);
        expect(output.at(-1)!.median).toBeCloseTo(output.representative.at(-1)!.capital);
    });
    it('ignore tous les parametres aleatoires lorsque toutes les poches sont decochees', () => {
        const pockets = [{ ...pocket, crisisSensitive: false }, { ...pocket, initialCapital: 2000, taxRate: .1, crisisSensitive: false }];
        const baseline = simulate(pockets, 2, .04, 6);
        for (const settings of [options, { ...options, volatility: .9, crisisProbability: 1, crisisLossMin: 1, crisisLossMax: 1, seed: 1234 }]) {
            const output = monteCarlo(pockets, 2, .04, 6, settings);
            expect(output.representative).toEqual(baseline);
            output.forEach((row, index) => {
                expect(row.low).toBeCloseTo(baseline[index].capital);
                expect(row.median).toBeCloseTo(baseline[index].capital);
                expect(row.high).toBeCloseTo(baseline[index].capital);
            });
            output.incomes.forEach((row, index) => {
                const net = baseline[index + 1].net / 12;
                expect(row.low).toBeCloseTo(net);
                expect(row.median).toBeCloseTo(net);
                expect(row.high).toBeCloseTo(net);
            });
        }
    });
});

describe('Configuration et export', () => {
    it('cree une simulation manuelle distincte et une seule poche', () => {
        const first = createSimulationConfig(), second = createSimulationConfig();
        expect(first.pockets).toHaveLength(1);
        expect(first.pockets[0].initialCapital).toBe(0);
        expect(first.pockets[0].id).not.toBe(second.pockets[0].id);
        expect(first.pockets[0].annualReturnRate).toBe(.087);
        expect(first.pockets[0].crisisSensitive).toBe(true);
        expect(createSimulationPocket(1).annualReturnRate).toBe(.087);
        expect(first.options.paths).toBe(100000);
        expect(first.options.volatility).toBe(.12);
        expect(first.options.crisisProbability).toBe(.05);
        expect(first.options.crisisLossMin).toBe(.15);
        expect(first.options.crisisLossMax).toBe(.3);
        expect(first.options.seed).toBe(42);
        expect(readSimulationConfig(first)).toEqual(first);
    });
    it('conserve les hypotheses sauvegardees avant le changement des valeurs par defaut', () => {
        const config = createSimulationConfig();
        config.pockets[0].annualReturnRate = .05;
        config.options = { ...config.options, crisisProbability: .08, crisisLossMin: .1, crisisLossMax: .5 };
        expect(readSimulationConfig(JSON.parse(JSON.stringify(config)))).toEqual(config);
    });
    it('fixe les anciennes configurations a 100000 scenarios sans changer les hypotheses', () => {
        const config = createSimulationConfig();
        const imported = readSimulationConfig({ ...config, options: { ...config.options, paths: 300 } });
        expect(imported).toEqual(config);
    });
    it('preserve cinq poches et leurs identifiants/couleurs via JSON', () => {
        const config = createSimulationConfig();
        config.pockets = Array.from({ length: 5 }, (_, index) => ({ ...createSimulationPocket(index), initialCapital: 1000 * index }));
        expect(readSimulationConfig(JSON.parse(JSON.stringify(config)))).toEqual(config);
        const remaining = { ...config, pockets: config.pockets.filter((_, index) => index !== 1) };
        expect(readSimulationConfig(remaining).pockets[1]).toEqual(config.pockets[2]);
    });
    it('rejette les versions inconnues et configurations corrompues', () => {
        const config = createSimulationConfig();
        for (const value of [null, {}, { ...config, version: 2 }, { ...config, years: null }, { ...config, pockets: [] }, { ...config, pockets: [config.pockets[0], config.pockets[0]] }, { ...config, pockets: [{ ...config.pockets[0], color: 'red' }] }, { ...config, options: { ...config.options, volatility: NaN } }]) expect(() => readSimulationConfig(value)).toThrow();
    });
    it('exporte chaque annee/poche avec decimales francaises et noms echappes', () => {
        const pockets = Array.from({ length: 3 }, (_, index) => ({ ...pocket, name: `Poche; "${index}"` }));
        const csv = simulationCsv(pockets, simulate(pockets, 1, .04, 2));
        expect(csv.startsWith('\uFEFF')).toBe(true);
        expect(csv.split('\r\n')).toHaveLength(7);
        expect(csv).toContain('"Poche; ""0"""');
        expect(csv).toContain('"3,9"');
    });
});