export const PORTFOLIO_STORAGE_KEY = 'inv_v9';

export interface StorageAdapter {
    get(key: string): Promise<{ value: string } | null>;
    set(key: string, value: string): Promise<void>;
    remove?(key: string): Promise<void>;
}

export type StorageLock = <Result>(action: () => Promise<Result>) => Promise<Result>;

export class StorageConflictError extends Error {
    constructor() {
        super('La sauvegarde a changé dans un autre onglet. Exportez vos modifications avant de recharger les données.');
        this.name = 'StorageConflictError';
    }
}

const withBrowserLock: StorageLock = action => {
    if (!navigator.locks) return Promise.reject(new Error('Ce navigateur ne permet pas une sauvegarde locale protégée. Exportez vos données.'));
    return navigator.locks.request(PORTFOLIO_STORAGE_KEY, action);
};

export function createPortfolioPersistence(storage: StorageAdapter, lock: StorageLock = withBrowserLock) {
    let expected: string | null | undefined;
    const assertCurrent = async () => {
        if (expected === undefined) throw new Error('La sauvegarde doit être chargée avant toute modification.');
        const current = await storage.get(PORTFOLIO_STORAGE_KEY);
        if ((current?.value ?? null) !== expected) throw new StorageConflictError();
    };

    return {
        async read() {
            const current = await storage.get(PORTFOLIO_STORAGE_KEY);
            expected = current?.value ?? null;
            return current;
        },
        save(value: string) {
            return lock(async () => {
                await assertCurrent();
                if (value !== expected) await storage.set(PORTFOLIO_STORAGE_KEY, value);
                expected = value;
            });
        },
        remove() {
            return lock(async () => {
                await assertCurrent();
                if (!storage.remove) throw new Error('La suppression de la sauvegarde est indisponible.');
                await storage.remove(PORTFOLIO_STORAGE_KEY);
                expected = null;
            });
        },
        hasExternalChange(value: string | null) {
            return expected !== undefined && value !== expected;
        },
    };
}