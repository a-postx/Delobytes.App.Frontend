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
  email: string
  password: string
  confirmPassword: string
  loading: boolean
  error: string
}>()

const emit = defineEmits<{
  (e: "update:email", value: string): void
  (e: "update:password", value: string): void
  (e: "update:confirmPassword", value: string): void
  (e: "submit"): void
}>()
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Регистрация в Delobytes</CardTitle>
      <CardDescription>
        Введите данные ниже для создания аккаунта
      </CardDescription>
    </CardHeader>
    <CardContent>
      <form @submit.prevent="emit('submit')">
        <FieldGroup>
          <Field>
            <FieldLabel for="email">
              Email
            </FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              required
              :model-value="email"
              @update:model-value="emit('update:email', $event as string)"
            />
            <FieldDescription>
              Мы будем использовать его для связи с вами. Мы не передаём email третьим лицам.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel for="password">
              Пароль
            </FieldLabel>
            <Input
              id="password"
              type="password"
              required
              :model-value="password"
              @update:model-value="emit('update:password', $event as string)"
            />
            <FieldDescription>Минимум 6 символов.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel for="confirm-password">
              Подтвердите пароль
            </FieldLabel>
            <Input
              id="confirm-password"
              type="password"
              required
              :model-value="confirmPassword"
              @update:model-value="emit('update:confirmPassword', $event as string)"
            />
            <FieldDescription>Повторите введённый пароль.</FieldDescription>
          </Field>
          <Field v-if="error">
            <div class="rounded-md bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
              {{ error }}
            </div>
          </Field>
          <FieldGroup>
            <Field>
              <Button type="submit" class="w-full" :disabled="loading">
                {{ loading ? 'Регистрация...' : 'Создать аккаунт' }}
              </Button>
              <FieldDescription class="text-center">
                Уже есть аккаунт?
                <router-link to="/login">Войти</router-link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </FieldGroup>
      </form>
    </CardContent>
  </Card>
</template>
