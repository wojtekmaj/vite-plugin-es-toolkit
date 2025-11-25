import * as esToolkitCompat from 'es-toolkit/compat';

import type { PluginOption } from 'vite';

const defaultImportRegex = /import\s+(\w+)\s+from\s+['"]lodash['"]/gm;
const starImportRegex = /import\s+\*\s+as\s+(\w+)\s+from\s+['"](lodash(?:-es)?)['"]/gm;
const namedImportsRegex =
  /import\s+\{\s*([\w( as \w)\s,]+)\s*\}\s+from\s*['"](lodash(?:-es)?)['"]/gm;
const defaultSingleImportRegex = /import\s+(\w+)\s+from\s+['"](lodash(?:-es)?)\/(\w+)(\.js)?['"]/gm;
const standalonePackageImportRegex = /import\s+(\w+)\s+from\s+['"]lodash\.(\w+)['"]/gm;

type NamedImport = {
  actual: string;
  custom: string;
};

export default function viteEsToolkitPlugin(): {
  name: string;
  transform(src: string, id: string): { code: string; map: null } | undefined;
} {
  const actualFunctionNameMap = new Map<string, string>();

  const supportedFunctions = new Set(Object.keys(esToolkitCompat));

  const supportedStandalonePackages = new Set(
    Array.from(supportedFunctions).map((name) => {
      const result = name.toLowerCase();

      actualFunctionNameMap.set(result, name);

      return result;
    }),
  );

  const transformCache = new Map<string, { code: string; map: null }>();

  function isSupportedFunction(name: string): boolean {
    return supportedFunctions.has(name);
  }

  function isUnsupportedFunction(name: string): boolean {
    return !supportedFunctions.has(name);
  }

  function isUnsupportedStandalonePackage(name: string): boolean {
    return !supportedStandalonePackages.has(name);
  }

  function warnUnsupportedFunction(names: string[]): void {
    console.warn(`Unsupported lodash function${names.length > 1 ? 's' : ''}: ${names.join(', ')}`);
  }

  function warnUnsupportedStandalonePackage(name: string): void {
    console.warn(`Unsupported lodash standalone package: ${name}`);
  }

  /**
   * Parses named import string into an object, e.g.:
   * ```
   * parseNamedImport('isEqual as lodashIsEqual')
   * ```
   * will return:
   * ```
   * { actual: 'isEqual', custom: 'lodashIsEqual' }
   * ```
   * and:
   * ```
   * parseNamedImport('isEqual')
   * ```
   * will return:
   * ```
   * { actual: 'isEqual', custom: 'isEqual' }
   * ```
   */
  function parseNamedImport(namedImportName: string): NamedImport {
    const asIndex = namedImportName.indexOf(' as ');

    if (asIndex === -1) {
      return {
        actual: namedImportName,
        custom: namedImportName,
      };
    }

    return {
      actual: namedImportName.substring(0, asIndex),
      custom: namedImportName.substring(asIndex + 4), // 4 = length of " as "
    };
  }

  function renderNamedImport({ actual, custom }: NamedImport): string {
    return actual === custom ? actual : `${actual} as ${custom}`;
  }

  function renderNamedImports(namedImports: NamedImport[]) {
    return namedImports.map(renderNamedImport).join(', ');
  }

  function getActualFunctionName(standalonePackageName: string): string | undefined {
    return actualFunctionNameMap.get(standalonePackageName);
  }

  return {
    name: 'vite:es-toolkit',
    transform(src) {
      if (!src.includes('lodash')) {
        return;
      }

      const cacheKey = src;

      if (transformCache.has(cacheKey)) {
        return transformCache.get(cacheKey);
      }

      let srcWithReplacedImports = src;

      /**
       * Replaces e.g.:
       * ```
       * import lodash from 'lodash';
       * ```
       * with:
       * ```
       * import * as lodash from 'es-toolkit/compat';
       * ```
       * provided that no unsupported functions are used.
       */
      srcWithReplacedImports = srcWithReplacedImports.replace(
        defaultImportRegex,
        (match, defaultImportName: string) => {
          const usageRegExp = new RegExp(`\\b${defaultImportName}\\.\\w+`, 'g');
          const globalImportUsages = srcWithReplacedImports.match(usageRegExp);

          if (!globalImportUsages) {
            // No lodash functions are used, will be treeshaken anyway
            return match;
          }

          const unsupportedFunctions = new Set<string>();

          for (const usage of globalImportUsages) {
            const functionName = usage.split('.')[1] || '';

            if (isUnsupportedFunction(functionName)) {
              unsupportedFunctions.add(functionName);
            }
          }

          if (unsupportedFunctions.size > 0) {
            warnUnsupportedFunction(Array.from(unsupportedFunctions));

            return match;
          }

          return `import * as ${defaultImportName} from 'es-toolkit/compat'`;
        },
      );

      /**
       * Replaces e.g.:
       * ```
       * import * as lodash from 'lodash';
       * ```
       * with:
       * ```
       * import * as lodash from 'es-toolkit/compat';
       * ```
       * provided that no unsupported functions are used.
       */
      srcWithReplacedImports = srcWithReplacedImports.replace(
        starImportRegex,
        (match, starImportName: string) => {
          const usageRegExp = new RegExp(`\\b${starImportName}\\.\\w+`, 'g');
          const globalImportUsages = srcWithReplacedImports.match(usageRegExp);

          if (!globalImportUsages) {
            // No lodash functions are used, will be treeshaken anyway
            return match;
          }

          const unsupportedFunctions = new Set<string>();

          for (const usage of globalImportUsages) {
            const functionName = usage.split('.')[1] || '';

            if (isUnsupportedFunction(functionName)) {
              unsupportedFunctions.add(functionName);
            }
          }

          if (unsupportedFunctions.size > 0) {
            warnUnsupportedFunction(Array.from(unsupportedFunctions));

            return match;
          }

          return `import * as ${starImportName} from 'es-toolkit/compat'`;
        },
      );

      /**
       * Replaces e.g.:
       * ```
       * import { every, isEqual } from 'lodash';
       * ```
       * with:
       * ```
       * import { every } from 'lodash';
       * import { isEqual } from 'es-toolkit/compat';
       * ```
       * (every is not supported at the moment of writing)
       */
      srcWithReplacedImports = srcWithReplacedImports.replace(
        namedImportsRegex,
        (match, rawNamedImportNames: string, moduleName: string) => {
          // Split by comma, trim whitespace, remove empty strings
          const namedImportNames = rawNamedImportNames
            .split(',')
            .map((param) => param.trim())
            .filter(Boolean);

          const currentSupportedFunctions: NamedImport[] = [];
          const unsupportedFunctions: NamedImport[] = [];

          for (const name of namedImportNames) {
            const parsedImport = parseNamedImport(name);

            if (isSupportedFunction(parsedImport.actual)) {
              currentSupportedFunctions.push(parsedImport);
            } else {
              unsupportedFunctions.push(parsedImport);
            }
          }

          if (!currentSupportedFunctions.length) {
            return match;
          }

          let result = `import { ${renderNamedImports(currentSupportedFunctions)} } from 'es-toolkit/compat'`;

          if (unsupportedFunctions.length > 0) {
            warnUnsupportedFunction(unsupportedFunctions.map(({ actual }) => actual));

            result += `;import { ${renderNamedImports(unsupportedFunctions)} } from '${moduleName}'`;
          }

          return result;
        },
      );

      /**
       * Replaces e.g.:
       * ```
       * import isEqual from 'lodash/isEqual';
       * ```
       * with:
       * ```
       * import { isEqual } from 'es-toolkit/compat';
       * ```
       * and:
       * ```
       * import lodashIsEqual from 'lodash/isEqual';
       * ```
       * with:
       * ```
       * import { isEqual as lodashIsEqual } from 'es-toolkit/compat';
       */
      srcWithReplacedImports = srcWithReplacedImports.replace(
        defaultSingleImportRegex,
        (match, custom: string, _moduleName: string, actual: string) => {
          if (isUnsupportedFunction(actual)) {
            warnUnsupportedFunction([actual]);

            return match;
          }

          return `import { ${renderNamedImport({ actual, custom })} } from 'es-toolkit/compat'`;
        },
      );

      /**
       * Replaces e.g.:
       * ```
       * import get from 'lodash.get';
       * ```
       * with:
       * ```
       * import { get } from 'es-toolkit/compat';
       * ```
       * and:
       * ```
       * import lodashGet from 'lodash.get';
       * ```
       * with:
       * ```
       * import { get as lodashGet } from 'es-toolkit/compat';
       * ```
       */
      srcWithReplacedImports = srcWithReplacedImports.replace(
        standalonePackageImportRegex,
        (match, custom: string, standalonePackageName: string) => {
          if (isUnsupportedStandalonePackage(standalonePackageName)) {
            warnUnsupportedStandalonePackage(standalonePackageName);

            return match;
          }

          const actual = getActualFunctionName(standalonePackageName);

          if (!actual) {
            throw new Error(`Unable to find actual function name for ${standalonePackageName}`);
          }

          return `import { ${renderNamedImport({ actual, custom })} } from 'es-toolkit/compat'`;
        },
      );

      const result = {
        code: srcWithReplacedImports,
        map: null,
      };

      transformCache.set(cacheKey, result);

      return result;
    },
  } satisfies PluginOption;
}
