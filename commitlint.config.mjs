/**
 * Validación de mensajes de commit sobre Conventional Commits: tipos
 * fijados, asunto de 72 caracteres como máximo y sin restricción de
 * mayúsculas en el asunto, que se redacta en español.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'],
    ],
    'header-max-length': [2, 'always', 72],
    'subject-case': [0],
  },
};
