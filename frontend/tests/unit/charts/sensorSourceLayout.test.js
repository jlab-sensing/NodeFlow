import { availablePanelIdsForSensors, defaultPanelOrderForSensors, panelsMissingForSensors } from '../../../src/pages/charts/catalog/sensorSourceLayout'
import { describe, expect, it } from 'vitest'

describe('availablePanelIdsForSensors', () => {
    it('returns the panels available from the selected sensors', () => {
        const sensors = [
            {
                uuid: 'sensor-1',
                panel_ids: ['teros', 'temp'],
            },
        ]
        const result = availablePanelIdsForSensors(sensors)
        expect(result).toEqual(new Set(['teros', 'temp']))
    })

    it('combines panel IDs from multiple sensors without duplicates', () => {
        const sensors = [
            {
                uuid: 'sensor-1',
                panel_ids: ['teros', 'temp'],
            },
            {
                uuid: 'sensor-2',
                panel_ids: ['temp', 'u:co2'],
            },
        ]
        const result = availablePanelIdsForSensors(sensors)
        expect(result).toEqual(new Set(['teros', 'temp', 'u:co2']))
    })

    it('handles sensors without panel IDs', () => {
        const sensors = [
            {
                uuid: 'sensor-1',
            },
            {
                uuid: 'sensor-2',
                panel_ids: ['temp'],
            },
        ]

        const result = availablePanelIdsForSensors(sensors)
        expect(result).toEqual(new Set(['temp']))
    })

    it('returns an empty set when there are no sensors', () => {
        expect(availablePanelIdsForSensors([])).toEqual(new Set())
    })
})

describe('defaultPanelOrderForSensors', () => {
    it('returns supported panels in catalog order', () => {
        const sensors = [
            {
                uuid: 'sensor-1',
                panel_ids: ['temp', 'teros'],
            },
        ]
        const catalogOrder = ['power', 'teros', 'temp', 'u:co2']
        const result = defaultPanelOrderForSensors(sensors, catalogOrder)
        expect(result).toEqual(['teros', 'temp'])
    })

    it('excludes catalog panels unsupported by selected sensor', () => {
        const sensors = [
            {
                uuid: 'sensor-1',
                panel_ids: ['temp'],
            },
        ]

        const catalogOrder = ['teros', 'temp', 'power']
        const result = defaultPanelOrderForSensors(sensors, catalogOrder)
        expect(result).toEqual(['temp'])
    })

    it('returns empty array when no sensor panels are available', () => {
        const catalogOrder = ['teros', 'temp', 'power']
        expect(defaultPanelOrderForSensors([], catalogOrder)).toEqual([])
    })
})

describe('panelsMissingForSensors', () => {
    it('returns requested panels unavailable to selected sensors', () => {
        const panelOrder = ['teros', 'temp', 'u:co2']
        const availablPanelIDs = new Set(['teros'])
        const result = panelsMissingForSensors(panelOrder, availablPanelIDs)
        expect(result).toEqual(['temp', 'u:co2'])
    })

    it('returns an empty array when every requested panel is available', () => {
        const panelOrder = ['teros', 'temp']
        const availablePanelIDs = new Set(['teros', 'temp'])
        const result = panelsMissingForSensors(panelOrder, availablePanelIDs)
        expect(result).toEqual([])
    })

    it('preserves requested order to missing panels', () => {
        const panelOrder = ['u:co2', 'temp', 'power']
        const availablePanelIDs = new Set()
        const result = panelsMissingForSensors(panelOrder, availablePanelIDs)
        expect(result).toEqual(['u:co2', 'temp', 'power'])
    })
})