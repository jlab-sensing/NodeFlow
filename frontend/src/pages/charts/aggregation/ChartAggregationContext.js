import { createContext, useContext, useMemo } from 'react'

export const ChartAggregationContext = createContext(null)
export function useChartAggregation() {
    return useContext(ChartAggregationContext)
}

export function useChartInstanceData(sourceData) {
    const aggregation = useChartAggregation()
    const ids = aggregation?.seriesIds

    return useMemo(() => {
        if (!ids) return sourceData

        const selected = new Set(ids)

        return structuredClone({
            ...sourceData,
            datasets: sourceData.datasets.filter((dataset) =>
                selected.has(dataset.id),
            ),
        })
    }, [sourceData, ids])
}
export function useChartInstanceAxes() {
    return useChartAggregation()?.axisIds ?? null
}