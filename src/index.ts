import * as esToolkitCompat from 'es-toolkit/compat';

import type { PluginOption } from 'vite';

export default function viteEsToolkitPlugin(): {
  name: string;
  transform(src: string, id: string): { code: string; map: null } | undefined;
} {
  const supportedFunctions = Object.keys(esToolkitCompat);

  function isSupportedFunction(name: string): boolean {
    return supportedFunctions.includes(name);
  }

  function isUnsupportedFunction(name: string): boolean {
    return !isSupportedFunction(name);
  }

  function warnUnsupportedFunction(names: string[]): void {
    console.warn(`Unsupported lodash function${names.length > 1 ? 's' : ''}: ${names.join(', ')}`);
  }

  return {
    name: 'vite:es-toolkit',
    transform(src) {
      if (src.includes('lodash')) {
        let srcWithReplacedImports = src;

        // Replaces e.g. "import lodash from 'lodash';" with "import { * as lodash } from 'es-toolkit/compat';"
        srcWithReplacedImports = srcWithReplacedImports.replace(
          /import\s+(\w+)\s+from\s+['"]lodash['"]/g,
          (_match, p1: string) => {
            // If p1 = "_", then find all occurences of "_.*" in the source code
            const globalImportUsages = srcWithReplacedImports.match(
              new RegExp(`\\b${p1}\\.\\w+`, 'g'),
            );

            if (!globalImportUsages) {
              // No lodash functions are used, will be treeshaken anyway
              return _match;
            }

            const usedFunctions = globalImportUsages.map((usage) => usage.split('.')[1] || '');

            const unsupportedFunctions = usedFunctions.filter(isUnsupportedFunction);

            if (unsupportedFunctions.length) {
              warnUnsupportedFunction(unsupportedFunctions);

              return _match;
            }

            return `import { * as ${p1} } from 'es-toolkit/compat'`;
          },
        );

        // Replaces e.g. "import { isEqual } from 'lodash';" with "import { isEqual } from 'es-toolkit/compat';"
        srcWithReplacedImports = srcWithReplacedImports.replace(
          /import\s+\{\s*(\w+)\s*\}\s+from\s+['"]lodash['"]/g,
          (_match, p1: string) => {
            if (isUnsupportedFunction(p1)) {
              warnUnsupportedFunction([p1]);

              return _match;
            }

            return `import { ${p1} } from 'es-toolkit/compat'`;
          },
        );

        // Replaces e.g. "import { every, isEqual } from 'lodash';" with "import { every } from 'lodash';import { isEqual } from 'es-toolkit/compat';" (every is not supported at the moment of writing)
        srcWithReplacedImports = srcWithReplacedImports.replace(
          /import\s+\{\s*(\w+(?:,\s*\w+)*)\s*\}\s+from\s+['"]lodash['"]/g,
          (_match, p1: string) => {
            const params = p1.split(',').map((param) => param.trim());

            const currentSupportedFunctions = params.filter(isSupportedFunction);
            const unsupportedFunctions = params.filter(isUnsupportedFunction);

            if (unsupportedFunctions.length) {
              warnUnsupportedFunction(unsupportedFunctions);

              if (!currentSupportedFunctions.length) {
                return _match;
              }

              return `import { ${currentSupportedFunctions.join(', ')} } from 'es-toolkit/compat';import { ${unsupportedFunctions.join(', ')} } from 'lodash'`;
            }

            return `import { ${currentSupportedFunctions.join(', ')} } from 'es-toolkit/compat'`;
          },
        );

        // Replaces e.g. "import isEqual from 'lodash/isEqual';" with "import { isEqual } from 'es-toolkit/compat';"
        // Replaces e.g. "import lodashIsEqual from 'lodash/isEqual';" with "import { isEqual as lodashIsEqual } from 'es-toolkit/compat';"
        srcWithReplacedImports = srcWithReplacedImports.replace(
          /import\s+(\w+)\s+from\s+['"]lodash\/(\w+)['"]/g,
          (_match, p1: string, p2: string) => {
            if (isUnsupportedFunction(p2)) {
              warnUnsupportedFunction([p2]);

              return _match;
            }

            if (p1 === p2) {
              return `import { ${p2} } from 'es-toolkit/compat'`;
            }

            return `import { ${p2} as ${p1} } from 'es-toolkit/compat'`;
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
