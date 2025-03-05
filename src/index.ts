import * as esToolkitCompat from 'es-toolkit/compat';

import type { PluginOption } from 'vite';

const defaultImportRegex = /import\s+(\w+)\s+from\s+['"]lodash['"]/gm;
const starImportRegex = /import\s+\*\s+as\s+(\w+)\s+from\s+['"](lodash(?:-es)?)['"]/gm;
const namedImportsRegex =
  /import\s+\{\s*([\w( as \w)\s,]+)\s*\}\s+from\s+['"](lodash(?:-es)?)['"]/gm;
const defaultSingleImportRegex = /import\s+(\w+)\s+from\s+['"](lodash(?:-es)?)\/(\w+)(\.js)?['"]/gm;
const standalonePackageImportRegex = /import\s+(\w+)\s+from\s+['"]lodash\.(\w+)['"]/gm;

type NamedImport = {
  actualName: string;
  customName: string;
};

export default function viteEsToolkitPlugin(): {
  name: string;
  transform(src: string, id: string): { code: string; map: null } | undefined;
} {
  const supportedFunctions = Object.keys(esToolkitCompat);

  const supportedStandalonePackages = supportedFunctions.map((name) => name.toLowerCase());

  function isSupportedFunction(name: string): boolean {
    return supportedFunctions.includes(name);
  }

  function isUnsupportedFunction(name: string): boolean {
    return !isSupportedFunction(name);
  }

  function isSupportedStandalonePackage(name: string): boolean {
    return supportedStandalonePackages.includes(name);
  }

  function isUnsupportedStandalonePackage(name: string): boolean {
    return !isSupportedStandalonePackage(name);
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
   * { actualName: 'isEqual', customName: 'lodashIsEqual' }
   * ```
   * and:
   * ```
   * parseNamedImport('isEqual')
   * ```
   * will return:
   * ```
   * { actualName: 'isEqual', customName: 'isEqual' }
   * ```
   */
  function parseNamedImport(namedImportName: string): NamedImport {
    const [actualName, customName] = namedImportName.split(' as ');

    if (!actualName) {
      throw new Error('Invalid named import');
    }

    return {
      actualName,
      customName: customName || actualName,
    };
  }

  function renderNamedImport({ actualName, customName }: NamedImport): string {
    if (actualName === customName) {
      return actualName;
    }

    return `${actualName} as ${customName}`;
  }

  function renderNamedImports(namedImports: NamedImport[]) {
    return `${namedImports.map(renderNamedImport).join(', ')}`;
  }

  return {
    name: 'vite:es-toolkit',
    transform(src) {
      if (src.includes('lodash')) {
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
            // If p1 = "_", then find all occurences of "_.*" in the source code
            const globalImportUsages = srcWithReplacedImports.match(
              new RegExp(`\\b${defaultImportName}\\.\\w+`, 'g'),
            );

            if (!globalImportUsages) {
              // No lodash functions are used, will be treeshaken anyway
              return match;
            }

            const usedFunctions = globalImportUsages.map((usage) => usage.split('.')[1] || '');

            const unsupportedFunctions = usedFunctions.filter(isUnsupportedFunction);

            if (unsupportedFunctions.length) {
              warnUnsupportedFunction(unsupportedFunctions);

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
            // If p1 = "_", then find all occurences of "_.*" in the source code
            const globalImportUsages = srcWithReplacedImports.match(
              new RegExp(`\\b${starImportName}\\.\\w+`, 'g'),
            );

            if (!globalImportUsages) {
              // No lodash functions are used, will be treeshaken anyway
              return match;
            }

            const usedFunctions = globalImportUsages.map((usage) => usage.split('.')[1] || '');

            const unsupportedFunctions = usedFunctions.filter(isUnsupportedFunction);

            if (unsupportedFunctions.length) {
              warnUnsupportedFunction(unsupportedFunctions);

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

            const parsedNamedImportNames = namedImportNames.map(parseNamedImport);

            const currentSupportedFunctions = parsedNamedImportNames.filter(({ actualName }) =>
              isSupportedFunction(actualName),
            );
            const unsupportedFunctions = parsedNamedImportNames.filter(({ actualName }) =>
              isUnsupportedFunction(actualName),
            );

            if (unsupportedFunctions.length) {
              warnUnsupportedFunction(unsupportedFunctions.map(({ actualName }) => actualName));

              if (!currentSupportedFunctions.length) {
                return match;
              }

              return `import { ${renderNamedImports(currentSupportedFunctions)} } from 'es-toolkit/compat';import { ${renderNamedImports(unsupportedFunctions)} } from '${moduleName}'`;
            }

            return `import { ${renderNamedImports(currentSupportedFunctions)} } from 'es-toolkit/compat'`;
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
          (
            match,
            customNamedImportName: string,
            _moduleName: string,
            actualNamedImportName: string,
          ) => {
            if (isUnsupportedFunction(actualNamedImportName)) {
              warnUnsupportedFunction([actualNamedImportName]);

              return match;
            }

            if (actualNamedImportName === customNamedImportName) {
              return `import { ${actualNamedImportName} } from 'es-toolkit/compat'`;
            }

            return `import { ${actualNamedImportName} as ${customNamedImportName} } from 'es-toolkit/compat'`;
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
          (match, defaultImportName: string, standalonePackageName: string) => {
            if (isUnsupportedStandalonePackage(standalonePackageName)) {
              warnUnsupportedStandalonePackage(standalonePackageName);

              return match;
            }

            // Replaces e.g. isequal with isEqual
            const actualFunctionName = supportedFunctions.find(
              (name) => name.toLowerCase() === standalonePackageName,
            );

            if (!actualFunctionName) {
              throw new Error(`Unable to find actual function name for ${standalonePackageName}`);
            }

            if (defaultImportName === actualFunctionName) {
              return `import { ${actualFunctionName} } from 'es-toolkit/compat'`;
            }

            return `import { ${actualFunctionName} as ${defaultImportName} } from 'es-toolkit/compat'`;
          },
        );

        return {
          code: srcWithReplacedImports,
          map: null,
        };
      }
    },
  } satisfies PluginOption;
}
