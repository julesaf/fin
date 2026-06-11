import { ACCENT_COLOR, GAIN_COLOR, WARNING_COLOR } from '../config/appConstants';
import type { Pocket, Transaction, Valuation } from '../domain/portfolioAnalytics';

export const DEMO_POCKETS: Pocket[] = [
    { id: 'p1', nom: 'PEA', couleur: ACCENT_COLOR, createdAt: '2023-01-01' },
    { id: 'p2', nom: 'Crypto', couleur: WARNING_COLOR, createdAt: '2023-06-01' },
    { id: 'p3', nom: 'SCPI', couleur: GAIN_COLOR, createdAt: '2023-03-01' },
];

export const DEMO_TRANSACTIONS: Transaction[] = [
    { id: 't1', type: 'apport', montant: 5000, timestamp: '2023-01-15', pocheId: 'p1' },
    { id: 't2', type: 'apport', montant: 1000, timestamp: '2023-07-01', pocheId: 'p1' },
    { id: 't4', type: 'apport', montant: 1500, timestamp: '2024-01-10', pocheId: 'p1' },
    { id: 't7', type: 'apport', montant: 2000, timestamp: '2023-06-01', pocheId: 'p2' },
    { id: 't8', type: 'apport', montant: 500, timestamp: '2024-02-01', pocheId: 'p2' },
    { id: 't9', type: 'retrait', montant: 800, timestamp: '2024-10-15', pocheId: 'p2' },
    { id: 't10', type: 'apport', montant: 20000, timestamp: '2023-03-01', pocheId: 'p3' },
];

export const DEMO_VALUATIONS: Valuation[] = [
    { id: 'v1', pocheId: 'p1', valeur: 5100, date: '2023-03-01' },
    { id: 'v2', pocheId: 'p1', valeur: 5800, date: '2023-06-01' },
    { id: 'v3', pocheId: 'p1', valeur: 6400, date: '2023-09-01' },
    { id: 'v4', pocheId: 'p1', valeur: 7100, date: '2023-12-31' },
    { id: 'v5', pocheId: 'p1', valeur: 8200, date: '2024-04-01' },
    { id: 'v6', pocheId: 'p1', valeur: 8900, date: '2024-08-01' },
    { id: 'v7', pocheId: 'p1', valeur: 9400, date: '2024-12-31' },
    { id: 'v8', pocheId: 'p1', valeur: 9800, date: '2025-04-01' },
    { id: 'v9', pocheId: 'p2', valeur: 2100, date: '2023-08-01' },
    { id: 'v10', pocheId: 'p2', valeur: 3200, date: '2023-12-31' },
    { id: 'v11', pocheId: 'p2', valeur: 4100, date: '2024-04-01' },
    { id: 'v12', pocheId: 'p2', valeur: 2800, date: '2024-08-01' },
    { id: 'v13', pocheId: 'p2', valeur: 3500, date: '2024-12-31' },
    { id: 'v14', pocheId: 'p2', valeur: 3800, date: '2025-04-01' },
    { id: 'v15', pocheId: 'p3', valeur: 20300, date: '2023-06-01' },
    { id: 'v16', pocheId: 'p3', valeur: 20700, date: '2023-12-31' },
    { id: 'v17', pocheId: 'p3', valeur: 21100, date: '2024-06-01' },
    { id: 'v18', pocheId: 'p3', valeur: 21600, date: '2024-12-31' },
    { id: 'v19', pocheId: 'p3', valeur: 22000, date: '2025-04-01' },
];
