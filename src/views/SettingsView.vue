<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import ChangePasswordDialog from '@/components/features/ChangePasswordDialog.vue'
import { useCurrentUser } from '@/composables/useCurrentUser'

const { currentUser, fetchCurrentUser } = useCurrentUser()

// Секция показывается только когда бэкенд подтвердил, что пароль можно менять.
const canChangePassword = computed<boolean>(() => currentUser.value?.canChangePassword === true)

onMounted(async () => {
  if (!currentUser.value) {
    await fetchCurrentUser()
  }
})
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <div class="flex flex-col gap-2">
      <h1 class="text-xl font-bold">
        Настройки
      </h1>
      <p class="text-muted-foreground">
        Настройте всё как надо.
      </p>
    </div>

    <Card v-if="canChangePassword">
      <CardHeader>
        <CardTitle class="text-lg">
          Пароль
        </CardTitle>
        <CardDescription>
          Смените пароль. После сохранения текущая сессия завершится,
          и вы войдёте заново с новым паролем.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChangePasswordDialog />
      </CardContent>
    </Card>
  </div>
</template>
