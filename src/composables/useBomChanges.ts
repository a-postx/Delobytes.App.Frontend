import { computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'

/**
 * Строка состава для сравнения. Учитываются только компонент и количество:
 * id строки и дата начала действия не влияют на то, что пользователь видит в редакторе,
 * поэтому пересохранение без правок не должно выглядеть как изменение.
 *
 * Количество объявлено как number | string, потому что v-model на input[type=number]
 * отдаёт строку, а ответ API приходит числом. Приведение делается при сравнении.
 */
export interface BomLineComparable {
  componentId: string
  quantity: number | string
}

/**
 * Отслеживает несохранённые изменения в составе товара.
 * Сравнивает серверный состав с редактируемым независимо от порядка строк.
 */
export function useBomChanges(
  serverLines: Ref<BomLineComparable[]>,
  editedLines: Ref<BomLineComparable[]>,
): { hasUnsavedChanges: ComputedRef<boolean> } {
  const hasUnsavedChanges: ComputedRef<boolean> = computed<boolean>(() => {
    const server = normalizeLines(serverLines.value)
    const edited = normalizeLines(editedLines.value)

    if (server.length !== edited.length) {
      return true
    }

    for (let i = 0; i < server.length; i++) {
      if (
        server[i].componentId !== edited[i].componentId ||
        server[i].quantity !== edited[i].quantity
      ) {
        return true
      }
    }

    return false
  })

  return { hasUnsavedChanges }
}

/**
 * Нормализует строки для сравнения: сортирует по componentId, чтобы перестановка
 * строк в UI не считалась изменением, и приводит количество к числу.
 */
function normalizeLines(lines: BomLineComparable[]): { componentId: string; quantity: number }[] {
  return lines
    .map((line) => ({ componentId: line.componentId, quantity: Number(line.quantity) }))
    .sort((a, b) => a.componentId.localeCompare(b.componentId))
}
