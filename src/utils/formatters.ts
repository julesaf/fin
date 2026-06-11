import { GAIN_COLOR, LOSS_COLOR } from '../config/appConstants';

export const TODAY = new Date().toISOString().split('T')[0];
export const CURRENT_YEAR = new Date().getFullYear();

const euroFormatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
});

export function formatEuro(value: number | null | undefined): string {
    return value == null ? '–' : euroFormatter.format(value);
}

export function formatSignedEuro(value: number | null | undefined): string {
    return value == null ? '–' : `${value > 0 ? '+' : ''}${formatEuro(value)}`;
}

export function formatPercent(value: number | null | undefined): string {
    return value == null ? '–' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)} %`;
}

export function formatDate(value: string | null | undefined): string {
    return value ? new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR') : '–';
}

export function getGainColor(value: number | null | undefined): string | undefined {
    if (value == null) return undefined;
    return value >= 0 ? GAIN_COLOR : LOSS_COLOR;
}
