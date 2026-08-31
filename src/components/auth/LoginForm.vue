<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
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
import { Button } from "@/components/ui/button"
import YandexLoginButton from "@/components/auth/YandexLoginButton.vue"
import GoogleLoginButton from "@/components/auth/GoogleLoginButton.vue"

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
  (e: "google"): void
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
              <YandexLoginButton
                :loading="loading"
                @click="emit('yandex')"
              />
            </Field>
            <Field>
              <GoogleLoginButton
                :loading="loading"
                @click="emit('google')"
              />
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
