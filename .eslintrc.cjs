module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2021: true
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    '@vue/eslint-config-typescript'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  overrides: [
    {
      // Тестовые файлы: инлайновые стабы для mount() — это не компоненты приложения,
      // правила про один компонент в файле и типизацию пропсов к ним неприменимы.
      files: ['tests/**/*.ts'],
      rules: {
        'vue/one-component-per-file': 'off',
        'vue/require-default-prop': 'off',
        'vue/require-prop-types': 'off'
      }
    },
    {
      // Type-aware floating-promise detection. Scoped to src/**: tests/** and vite.config.ts
      // are outside tsconfig.json's `include`, and type-aware linting errors out on files
      // absent from the TS project.
      files: ['src/**/*.ts', 'src/**/*.vue'],
      parserOptions: {
        parser: '@typescript-eslint/parser',
        project: ['./tsconfig.json'],
        extraFileExtensions: ['.vue'],
        tsconfigRootDir: __dirname,
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      rules: {
        '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
        '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
        // `_` — намеренно отбрасываемая часть деструктуризации (`const { class: _, ...delegated }`).
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
      }
    }
    ,
    {
      // beforeunload регистрируется только реестром черновиков: два обработчика дают два диалога.
      files: ['src/composables/usePageDraft.ts'],
      rules: {
        'no-restricted-syntax': 'off'
      }
    }
  ],
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'vue/multi-word-component-names': 'off',
    // Схема черновиков: подтверждение ухода и предупреждение о потере живут в реестре страницы.
    'no-restricted-globals': [
      'error',
      { name: 'confirm', message: 'Уход подтверждается через provideDraftRegistry(); см. usePageDraft.ts' },
      { name: 'alert', message: 'Сообщения показываются через toast или диалог схемы черновиков' }
    ],
    'no-restricted-syntax': [
      'error',
      {
        selector: "CallExpression[callee.object.name='window'][callee.property.name='confirm']",
        message: 'Уход подтверждается через provideDraftRegistry(); см. usePageDraft.ts'
      },
      {
        selector: "CallExpression[callee.property.name='addEventListener'][arguments.0.value='beforeunload']",
        message: 'Единственный обработчик beforeunload живёт в usePageDraft.ts'
      }
    ]
  }
}
