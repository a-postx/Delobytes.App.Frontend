<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Ref } from 'vue'
import { useRoute } from 'vue-router'
import { Home, ChevronDown, Terminal } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CopyButton } from '@/components/ui/copy-button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import ErrorVariantToolbar from '@/components/errors/ErrorVariantToolbar.vue'

const route = useRoute()
const attemptedPath: Ref<string> = ref<string>(route.fullPath)

/** ID для обращения в поддержку — реальный запрос генерировал бы его на сервере. */
const requestId: string = crypto.randomUUID().slice(0, 18)
const timestamp: string = new Date().toISOString()

const availableRoutes: string[] = [
  '/',
  '/settings',
  '/tenant-settings',
  '/integrations',
  '/catalogs/suppliers',
  '/catalogs/components',
  '/catalogs/work-rates',
  '/catalogs/tariff-grids',
]

const copyPayload = computed<string>(
  () => `GET ${attemptedPath.value} -> 404\nrequest-id: ${requestId}\nts: ${timestamp}`,
)
</script>

<template>
  <div class="flex min-h-svh flex-col bg-background">
    <ErrorVariantToolbar current-key="console" />

    <div class="flex flex-1 flex-col items-center justify-center px-6 py-14">
      <div class="w-full max-w-xl">
        <div class="mb-6 flex items-center gap-2 text-muted-foreground">
          <Terminal class="size-4" />
          <span class="text-xs font-medium uppercase tracking-[0.15em]">Диагностика запроса</span>
        </div>

        <!-- Карточка-лог: технической аудитории привычнее читать статус так,
             как он выглядит в консоли/сетевой панели браузера. -->
        <div class="overflow-hidden rounded-xl border border-border bg-card font-mono text-sm shadow-sm">
          <div class="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2.5">
            <div class="flex items-center gap-2">
              <span class="size-2.5 rounded-full bg-destructive" />
              <span class="text-xs text-muted-foreground">response.log</span>
            </div>
            <CopyButton
              :value="copyPayload"
              tooltip-text="Скопировать данные запроса"
            />
          </div>

          <div class="space-y-2 px-4 py-4">
            <div class="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                GET
              </Badge>
              <span class="truncate text-foreground">{{ attemptedPath }}</span>
            </div>
            <div class="flex items-center gap-2">
              <Badge variant="destructive">
                404
              </Badge>
              <span class="text-muted-foreground">Not Found</span>
            </div>
            <div class="pt-2 text-xs text-muted-foreground">
              <div>request-id: <span class="text-foreground">{{ requestId }}</span></div>
              <div>timestamp: <span class="text-foreground">{{ timestamp }}</span></div>
            </div>
          </div>
        </div>

        <h1 class="mt-6 text-xl font-semibold text-foreground">
          Маршрут не зарегистрирован
        </h1>
        <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
          Сервер не нашёл обработчик для этого пути. Если вы уверены, что раздел должен существовать —
          приложите request-id при обращении в поддержку.
        </p>

        <!-- Список доступных маршрутов свернут по умолчанию: он полезен, но не должен
             доминировать над основным действием "На главную". -->
        <Collapsible class="mt-5 group/collapsible">
          <CollapsibleTrigger as-child>
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Показать доступные маршруты
              <ChevronDown class="size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul class="mt-2 space-y-1 rounded-md border border-border bg-muted/40 p-3 font-mono text-xs text-muted-foreground">
              <li
                v-for="path in availableRoutes"
                :key="path"
              >
                <RouterLink
                  :to="path"
                  class="hover:text-primary hover:underline"
                >
                  {{ path }}
                </RouterLink>
              </li>
            </ul>
          </CollapsibleContent>
        </Collapsible>

        <div class="mt-6 flex gap-3">
          <Button as-child>
            <RouterLink to="/">
              <Home />
              На главную
            </RouterLink>
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
