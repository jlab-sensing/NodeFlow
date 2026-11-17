export function readLayout(storage, key) {
  try {
    const value = JSON.parse(storage.getItem(key))

    if (value?.version !== 1 || !Array.isArray(value.instances)) {
      return null
    }

    const seen = new Set()
    const validIds = (ids) =>
      ids === null ||
      (Array.isArray(ids) &&
        ids.every((id) => typeof id === 'string'))

    for (const instance of value.instances) {
      if (
        !instance ||
        typeof instance.id !== 'string' ||
        typeof instance.templateId !== 'string' ||
        typeof instance.hidden !== 'boolean' ||
        !validIds(instance.seriesIds) ||
        (instance.restoreIds !== undefined &&
          !validIds(instance.restoreIds)) ||
        seen.has(instance.id)
      ) {
        return null
      }

      seen.add(instance.id)
    }

    return value
  } catch {
    return null
  }
}

export function reconcileLayout(layout, templates, initialOrder) {
  const instances = [...(layout?.instances ?? [])]
  const known = new Set(
    instances.map((instance) => instance.templateId),
  )

  const requested = initialOrder?.length
    ? initialOrder
    : templates.map((template) => template.id)

  const ordered = [
    ...requested.map((id) =>
      templates.find((template) => template.id === id),
    ),
    ...templates,
  ].filter(Boolean)

  for (const template of ordered) {
    if (known.has(template.id)) continue

    known.add(template.id)

    instances.push({
      id: `default:${template.id}`,
      templateId: template.id,

      // null means all compatible lines.
      // An array means an explicitly customized selection.
      seriesIds: null,

      hidden: !requested.includes(template.id),
    })
  }

  return { version: 1, instances }
}

export function selectedIds(instance, templates) {
  const template = templates.find(
    (entry) => entry.id === instance?.templateId,
  )

  if (!template) return []

  const available = template.series.map((series) => series.id)

  return instance.seriesIds === null
    ? available
    : instance.seriesIds.filter((id) => available.includes(id))
}

export function visibleInstances(layout, templates) {
  return layout.instances.filter(
    (instance) =>
      !instance.hidden &&
      selectedIds(instance, templates).length > 0,
  )
}

export function splitLine(
  layout,
  templates,
  instanceId,
  seriesId,
  newId,
) {
  const source = layout.instances.find(
    (instance) => instance.id === instanceId,
  )

  if (
    !source ||
    !selectedIds(source, templates).includes(seriesId)
  ) {
    return layout
  }

  const current =
    source.seriesIds ?? selectedIds(source, templates)

  const remaining = current.filter((id) => id !== seriesId)

  return {
    ...layout,
    instances: layout.instances.flatMap((instance) =>
      instance.id === instanceId
        ? [
            {
              ...instance,
              seriesIds: remaining,
              hidden: remaining.length === 0,
              ...(remaining.length === 0
                ? { restoreIds: current }
                : {}),
            },
            {
              id: newId,
              templateId: instance.templateId,
              seriesIds: [seriesId],
              hidden: false,
            },
          ]
        : [instance],
    ),
  }
}

export function addLine(layout, templates, instanceId, seriesId) {
  const target = layout.instances.find(
    (instance) => instance.id === instanceId,
  )

  const template = templates.find(
    (entry) => entry.id === target?.templateId,
  )

  if (!template?.series.some((series) => series.id === seriesId)) {
    return layout
  }

  return {
    ...layout,
    instances: layout.instances.map((instance) => {
      // Other charts are returned unchanged.
      if (instance.id !== instanceId) return instance

      const current =
        instance.seriesIds ?? selectedIds(instance, templates)

      return {
        ...instance,
        hidden: false,
        seriesIds: [...new Set([...current, seriesId])],
      }
    }),
  }
}

export function hideInstance(layout, instanceId) {
  return {
    ...layout,
    instances: layout.instances.map((instance) =>
      instance.id === instanceId
        ? { ...instance, hidden: true }
        : instance,
    ),
  }
}

export function restoreInstance(layout, instanceId) {
  return {
    ...layout,
    instances: layout.instances.map((instance) =>
      instance.id === instanceId
        ? {
            ...instance,
            hidden: false,
            seriesIds:
              instance.seriesIds?.length === 0
                ? (instance.restoreIds ?? null)
                : instance.seriesIds,
          }
        : instance,
    ),
  }
}

export function reorderInstances(layout, templates, order) {
  const visible = visibleInstances(layout, templates)
  const ids = new Set(visible.map((instance) => instance.id))

  if (
    order.length !== ids.size ||
    new Set(order).size !== ids.size ||
    order.some((id) => !ids.has(id))
  ) {
    return layout
  }

  const byId = new Map(
    visible.map((instance) => [instance.id, instance]),
  )

  let index = 0

  return {
    ...layout,
    instances: layout.instances.map((instance) =>
      ids.has(instance.id)
        ? byId.get(order[index++])
        : instance,
    ),
  }
}