import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/out-tsc',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
      '**/test-output',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            // shared/types can import nothing (except npm packages)
            {
              sourceTag: 'type:types',
              onlyDependOnLibsWithTags: [],
            },
            // shared/utils can import shared/types
            {
              sourceTag: 'type:utils',
              onlyDependOnLibsWithTags: ['type:types'],
            },
            // shared/i18n can import shared/types and shared/utils
            {
              sourceTag: 'type:i18n',
              onlyDependOnLibsWithTags: ['type:types', 'type:utils'],
            },
            // data-access can import shared/types
            {
              sourceTag: 'type:data-access',
              onlyDependOnLibsWithTags: ['type:types'],
            },
            // feature-* can import shared/* and data-access
            {
              sourceTag: 'scope:feature',
              onlyDependOnLibsWithTags: [
                'scope:shared',
                'type:data-access',
              ],
            },
            // apps/api can import all libs
            {
              sourceTag: 'scope:api',
              onlyDependOnLibsWithTags: [
                'scope:shared',
                'scope:feature',
                'type:data-access',
              ],
            },
            // apps/web can only import shared/*
            {
              sourceTag: 'scope:web',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
