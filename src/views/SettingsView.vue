<script setup lang="ts">
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import ChangePasswordDialog from '@/components/features/ChangePasswordDialog.vue'
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

    <Card>
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
