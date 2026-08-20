import { DndContext } from '@dnd-kit/core'
import { rectSortingStrategy, SortableContext } from '@dnd-kit/sortable'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import SortableChartPanel from '../../../src/pages/charts/components/SortableChartPanel'

function renderSortablePanel(props) {
  return render(
    <DndContext>
      <SortableContext items={[props.id]} strategy={rectSortingStrategy}>
        <SortableChartPanel {...props}>
          <div>Chart body</div>
        </SortableChartPanel>
      </SortableContext>
    </DndContext>,
  )
}

describe('SortableChartPanel', () => {
  it('renders the chart content', () => {
    renderSortablePanel({
      id: 'teros',
      panelColumns: 2,
    })

    expect(screen.getByText('Chart body')).toBeInTheDocument()
  })

  it('calls onRemove with the panel ID when removed', () => {
    const onRemove = vi.fn()

    renderSortablePanel({
      id: 'teros',
      onRemove,
      panelColumns: 2,
    })

    const dragHandle = screen.getByRole('button', {
      name: /drag to reorder panel/i,
    })
    const panel = dragHandle.parentElement

    expect(panel).not.toBeNull()

    fireEvent.mouseEnter(panel)
    fireEvent.click(screen.getByRole('button', { name: /remove panel/i }))

    expect(onRemove).toHaveBeenCalledOnce()
    expect(onRemove).toHaveBeenCalledWith('teros')
  })

  it('does not render a remove button without an onRemove callback', () => {
    renderSortablePanel({
      id: 'teros',
      panelColumns: 2,
    })

    expect(
      screen.queryByRole('button', { name: /remove panel/i }),
    ).not.toBeInTheDocument()
  })

  it('keeps the drag handle keyboard-focusable', () => {
    renderSortablePanel({
      id: 'teros',
      panelColumns: 2,
    })

    const dragHandle = screen.getByRole('button', {
      name: /drag to reorder panel/i,
    })

    expect(dragHandle).toHaveAttribute('tabindex', '0')
  })
})
