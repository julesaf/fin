import { ACCENT_COLOR } from '../config/appConstants';

export type AppTheme = {
    dark: boolean;
    bg: string;
    s1: string;
    s2: string;
    s3: string;
    brd: string;
    brd2: string;
    t1: string;
    t2: string;
    t3: string;
    inp: string;
};

export function createDarkTheme(): AppTheme {
    return {
        dark: true,
        bg: '#0A0A0E',
        s1: '#15151C',
        s2: '#1C1C26',
        s3: '#252530',
        brd: 'rgba(255,255,255,0.11)',
        brd2: `${ACCENT_COLOR}40`,
        t1: '#EEEEFF',
        t2: '#8080A8',
        t3: '#404060',
        inp: '#10101A',
    };
}

export function createLightTheme(): AppTheme {
    return {
        dark: false,
        bg: '#F0EFF8',
        s1: '#FFFFFF',
        s2: '#F5F4FC',
        s3: '#EBEAF5',
        brd: 'rgba(0,0,0,0.07)',
        brd2: `${ACCENT_COLOR}30`,
        t1: '#0A0A14',
        t2: '#6060A0',
        t3: '#B0B0CC',
        inp: '#FFFFFF',
    };
}
