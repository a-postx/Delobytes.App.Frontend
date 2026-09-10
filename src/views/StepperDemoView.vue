<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import {
  StepperRoot,
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperTitle,
  StepperDescription,
  StepperSeparator,
} from '@/components/ui/stepper'
import { Button } from '@/components/ui/button'
import { CheckIcon } from 'lucide-vue-next'

const stepper = useTemplateRef<InstanceType<typeof StepperRoot>>('stepper')

interface Step {
  step: number
  title: string
  description: string
}

const steps: Step[] = [
  { step: 1, title: 'Основная информация', description: 'Заполните данные о продукте' },
  { step: 2, title: 'Параметры', description: 'Настройте ценообразование' },
  { step: 3, title: 'Подтверждение', description: 'Проверьте и отправьте данные' },
]

const currentStep = ref<number>(1)
</script>

<template>
  <div class="flex flex-col gap-8 p-6">
    <div class="flex flex-col gap-2">
      <h1 class="text-xl font-bold">Пример Stepper</h1>
      <p class="text-muted-foreground">Компонент пошагового прогресса из reka-ui.</p>
    </div>

    <!-- Horizontal stepper -->
    <div class="flex flex-col gap-4">
      <h2 class="text-base font-semibold text-foreground">Горизонтальный</h2>
      <StepperRoot
        ref="stepper"
        v-model="currentStep"
        class="flex w-full items-start gap-0"
      >
        <StepperItem
          v-for="item in steps"
          :key="item.step"
          :step="item.step"
          class="group relative flex flex-1 flex-col items-center gap-3"
        >
          <!-- Connector line -->
          <div class="flex w-full items-center">
            <!-- Left side connector -->
            <div
              :class="[
                'h-0.5 flex-1 rounded-full transition-colors duration-200',
                item.step === 1 ? 'invisible' : '',
                currentStep >= item.step ? 'bg-primary' : 'bg-border',
              ]"
            />
            <!-- Trigger button -->
            <StepperTrigger />
            <!-- Right side connector -->
            <div
              :class="[
                'h-0.5 flex-1 rounded-full transition-colors duration-200',
                item.step === steps[steps.length - 1].step ? 'invisible' : '',
                currentStep > item.step ? 'bg-primary' : 'bg-border',
              ]"
            />
          </div>

          <!-- Labels below -->
          <div class="flex flex-col items-center text-center">
            <StepperTitle>{{ item.title }}</StepperTitle>
            <StepperDescription class="hidden sm:block mt-0.5">
              {{ item.description }}
            </StepperDescription>
          </div>

          <StepperIndicator>
            <!-- Indicator slot provided by parent trigger; content renders inside trigger -->
          </StepperIndicator>
        </StepperItem>
      </StepperRoot>

      <!-- Navigation controls -->
      <div class="flex gap-2 justify-between mt-2">
        <Button
          variant="outline"
          :disabled="!stepper?.hasPrev()"
          @click="stepper?.prevStep()"
        >
          Назад
        </Button>
        <Button
          :disabled="!stepper?.hasNext()"
          @click="stepper?.nextStep()"
        >
          Далее
        </Button>
      </div>
    </div>

    <!-- Vertical stepper -->
    <div class="flex flex-col gap-4">
      <h2 class="text-base font-semibold text-foreground">Вертикальный</h2>
      <StepperRoot
        :default-value="2"
        orientation="vertical"
        class="flex flex-col gap-0"
      >
        <StepperItem
          v-for="(item, index) in steps"
          :key="item.step"
          :step="item.step"
          class="group relative flex gap-4"
        >
          <!-- Left column: trigger + vertical separator -->
          <div class="flex flex-col items-center">
            <StepperTrigger>
              <StepperIndicator>
                <CheckIcon
                  v-if="item.step < 2"
                  class="w-4 h-4"
                />
                <span v-else>{{ item.step }}</span>
              </StepperIndicator>
            </StepperTrigger>
            <!-- Vertical connector, not shown after last item -->
            <StepperSeparator
              v-if="index !== steps.length - 1"
              class="mt-1 w-0.5 flex-1"
            />
          </div>

          <!-- Right column: text content -->
          <div class="flex flex-col gap-0.5 pb-6">
            <StepperTitle>{{ item.title }}</StepperTitle>
            <StepperDescription>{{ item.description }}</StepperDescription>
          </div>
        </StepperItem>
      </StepperRoot>
    </div>
  </div>
</template>
