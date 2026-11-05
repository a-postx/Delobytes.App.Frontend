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
    }
  ],
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'vue/multi-word-component-names': 'off'
  }
}
