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
import { useCurrentUser } from '@/composables/useCurrentUser'

const { currentUser, fetchCurrentUser } = useCurrentUser()

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
      <h1 class="text-3xl font-bold">Настройки</h1>
      <p class="text-muted-foreground">
        Эти настройки отражаются во всех пространствах, в которых вы работаете.
      </p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Пароль</CardTitle>
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
