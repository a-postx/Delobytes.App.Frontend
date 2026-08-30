<script setup lang="ts">
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

defineProps<{
  tenantName: string
  loading: boolean
  error: string
}>()

const emit = defineEmits<{
  (e: "update:tenantName", value: string): void
  (e: "submit"): void
}>()
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Настройка рабочего пространства</CardTitle>
    </CardHeader>
    <CardContent>
      <form @submit.prevent="emit('submit')">
        <FieldGroup>
          <Field>
            <FieldLabel for="tenantName">
              Название организации/проекта
            </FieldLabel>
            <Input
              id="tenantName"
              type="text"
              placeholder="Например: Моя компания"
              required
              maxlength="200"
              :model-value="tenantName"
              @update:model-value="emit('update:tenantName', $event as string)"
            />
            <FieldDescription>
              Это название будет отображаться во всех отчётах и документах.
            </FieldDescription>
          </Field>
          <Field v-if="error">
            <div class="rounded-md bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
              {{ error }}
            </div>
          </Field>
          <Field>
            <Button
              type="submit"
              class="w-full"
              :disabled="loading || !tenantName.trim()"
            >
              {{ loading ? 'Создание...' : 'Создать и начать работу' }}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </CardContent>
  </Card>
</template>
