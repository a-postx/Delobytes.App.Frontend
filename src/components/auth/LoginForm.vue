<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"
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
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const props = defineProps<{
  class?: HTMLAttributes["class"]
  email: string
  password: string
  loading: boolean
  error: string
}>()

const emit = defineEmits<{
  (e: "update:email", value: string): void
  (e: "update:password", value: string): void
  (e: "submit"): void
  (e: "yandex"): void
}>()
</script>

<template>
  <div :class="cn('flex flex-col gap-6', props.class)">
    <Card>
      <CardHeader class="text-center">
        <CardTitle class="text-xl">
          Вход в Delobytes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="emit('submit')">
          <FieldGroup>
            <Field>
              <Button
                variant="outline"
                type="button"
                class="w-full"
                :disabled="loading"
                @click="emit('yandex')"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  class="size-4"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M2.04 12c0-5.523 4.476-10 9.998-10C17.522 2 22 6.477 22 12s-4.478 10-10.002 10C6.516 22 2.04 17.523 2.04 12zm11.212 4.688V7.313h1.046c1.812 0 2.77.978 2.77 2.644 0 1.09-.479 1.88-1.358 2.32l1.937 4.411h-1.585l-1.69-4.085h-.597v4.085h-1.523zm0-5.277h.93c.882 0 1.356-.527 1.356-1.496 0-.97-.474-1.47-1.357-1.47h-.929v2.966z"/>
                </svg>
                Войти через Yandex ID
              </Button>
            </Field>
            <FieldSeparator>
              или продолжить с email
            </FieldSeparator>
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
            </Field>
            <Field>
              <div class="flex items-center">
                <FieldLabel for="password">
                  Пароль
                </FieldLabel>
              </div>
              <Input
                id="password"
                type="password"
                required
                :model-value="password"
                @update:model-value="emit('update:password', $event as string)"
              />
            </Field>
            <Field v-if="error">
              <div class="rounded-md bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
                {{ error }}
              </div>
            </Field>
            <Field>
              <Button type="submit" class="w-full" :disabled="loading">
                {{ loading ? 'Вход...' : 'Войти' }}
              </Button>
              <FieldDescription class="text-center">
                Нет аккаунта?
                <router-link to="/register">
                  Зарегистрируйтесь
                </router-link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
    <FieldDescription class="px-6 text-center">
      Продолжая, вы соглашаетесь с нашими <a href="#">Условиями использования</a>
      и <a href="#">Политикой конфиденциальности</a>.
    </FieldDescription>
  </div>
</template>
