import { monteCarlo, type SimulationConfig } from './simulation';

self.onmessage = (event: MessageEvent<{ key: string; config: SimulationConfig }>) => {
    const { key, config } = event.data;
    try {
        const result = monteCarlo(config.pockets, config.years, config.withdrawal, config.projection, config.options, completed => {
            self.postMessage({ key, type: 'progress', completed });
        });
        self.postMessage({ key, type: 'result', percentiles: Array.from(result), representative: result.representative, income: result.income, incomes: result.incomes });
    } catch (error) {
        self.postMessage({ key, type: 'error', message: error instanceof Error ? error.message : 'Calcul impossible' });
    }
};