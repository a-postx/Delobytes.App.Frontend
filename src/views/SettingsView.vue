<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useTheme } from '@/composables/useTheme'
import type { Theme } from '@/composables/useTheme'

const { currentUser, fetchCurrentUser } = useCurrentUser()
const { theme, setTheme } = useTheme()

onMounted(async () => {
  if (!currentUser.value) {
    await fetchCurrentUser()
  }
})

const userEmail = computed(() => currentUser.value?.email ?? '')
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <div class="flex flex-col gap-2">
      <h1 class="text-2xl font-bold">Настройки</h1>
      <p class="text-muted-foreground">
        Настройте всё как надо.
      </p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle class="text-lg">Внешний вид</CardTitle>
        <CardDescription>
          Выберите тему оформления интерфейса
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          class="flex flex-col gap-2.5"
          :model-value="theme"
          @update:model-value="(v) => setTheme(v as Theme)"
        >
          <div class="flex items-center">
            <RadioGroupItem id="light" value="light" />
            <Label for="light" class="cursor-pointer font-normal pl-[15px]">Светло</Label>
          </div>
          <div class="flex items-center">
            <RadioGroupItem id="dark" value="dark" />
            <Label for="dark" class="cursor-pointer font-normal pl-[15px]">Темно</Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="text-lg">Пароль</CardTitle>
        <CardDescription>
          Мы отправим письмо с волшебной ссылкой на {{ userEmail }}.
          Эта ссылка позволит создать новый пароль.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button disabled>Сменить пароль</Button>
      </CardContent>
    </Card>
  </div>
</template>
