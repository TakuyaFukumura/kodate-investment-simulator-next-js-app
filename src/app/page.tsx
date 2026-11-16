'use client';

import {useCallback, useEffect, useState} from 'react';
import ScenarioWorkspace from './components/ScenarioWorkspace';
import type {PropertyScenario} from '../lib/propertyCsv';
import {parsePropertyCsv} from '../lib/propertyCsv';

async function fetchProperties(): Promise<PropertyScenario[]> {
    const response = await fetch('/data/sample-properties.csv');
    if (!response.ok) {
        throw new Error(`サンプルCSVを読み込めませんでした（HTTP ${response.status}）。`);
    }
    return parsePropertyCsv(await response.text());
}

export default function Home() {
    const [properties, setProperties] = useState<PropertyScenario[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        let isCurrent = true;
        void fetchProperties()
            .then((loadedProperties) => {
                if (isCurrent) {
                    setProperties(loadedProperties);
                }
            })
            .catch((error: unknown) => {
                if (isCurrent) {
                    setLoadError(
                        error instanceof Error ? error.message : 'サンプルCSVの読み込みに失敗しました。'
                    );
                }
            })
            .finally(() => {
                if (isCurrent) {
                    setIsLoading(false);
                }
            });
        return () => {
            isCurrent = false;
        };
    }, []);

    const retryLoadingProperties = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            setProperties(await fetchProperties());
        } catch (error) {
            setProperties([]);
            setLoadError(error instanceof Error
                ? error.message
                : 'サンプルCSVの読み込みに失敗しました。');
        } finally {
            setIsLoading(false);
        }
    }, []);

    return (
        <main
            className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8">
                    <p className="text-sm font-semibold tracking-wide text-emerald-700 dark:text-emerald-300">
                        購入から運用・売却までの比較試算
                    </p>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight">戸建て投資シミュレータ</h1>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                        同梱の架空サンプルを基準に、条件の異なる3ケースを比較できます。入力値は保存されません。
                    </p>
                </div>

                {isLoading && (
                    <div
                        className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
                        <output className="block">サンプル物件を読み込んでいます...</output>
                    </div>
                )}
                {!isLoading && loadError !== null && (
                    <div
                        className="rounded-xl border border-red-300 bg-red-50 p-6 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
                        <p role="alert">サンプルデータを利用できません：{loadError}</p>
                        <button
                            type="button"
                            onClick={() => void retryLoadingProperties()}
                            className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
                        >
                            再読み込み
                        </button>
                    </div>
                )}
                {!isLoading && loadError === null && properties.length > 0 && (
                    <ScenarioWorkspace properties={properties}/>
                )}
            </div>
        </main>
    );
}
