export const ACCENT_COLOR = '#E8364A';
export const VALUE_COLOR = '#38BDF8';
export const GAIN_COLOR = '#10B981';
export const LOSS_COLOR = '#FB7185';
export const WARNING_COLOR = '#F59E0B';

export const POCKET_COLORS = [
    ACCENT_COLOR,
    VALUE_COLOR,
    GAIN_COLOR,
    WARNING_COLOR,
    '#8B5CF6',
    '#F97316',
    '#06B6D4',
    '#EC4899',
];

export type TransactionOption = {
    v: string;
    l: string;
    c: string;
};

export const TRANSACTION_TYPES: TransactionOption[] = [
    { v: 'apport', l: 'Apport', c: '#818CF8' },
    { v: 'retrait', l: 'Retrait', c: WARNING_COLOR },
];

export function getTransactionLabel(type: string): string {
    return TRANSACTION_TYPES.find(transactionType => transactionType.v === type)?.l || type;
}

export function getTransactionColor(type: string): string {
    return TRANSACTION_TYPES.find(transactionType => transactionType.v === type)?.c || '#64748B';
}
