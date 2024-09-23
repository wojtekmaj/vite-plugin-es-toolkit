import * as esToolkitCompat from 'es-toolkit/compat';

import type { PluginOption } from 'vite';

export default function viteEsToolkitPlugin(): {
  name: string;
  transform(src: string, id: string): { code: string; map: null } | undefined;
} {
  const supportedFunctions = Object.keys(esToolkitCompat);

  return {
    name: 'vite:es-toolkit',
    transform(src) {
      if (src.includes('lodash')) {
        let srcWithReplacedImports = src;
        // Replaces e.g. "import { isEqual } from 'lodash';" with "import { isEqual } from 'es-toolkit/compat';"
        srcWithReplacedImports = srcWithReplacedImports.replace(
          /import\s+\{\s*(\w+)\s*\}\s+from\s+['"]lodash['"]/g,
          (_match, p1: string) => {
            if (!supportedFunctions.includes(p1)) {
              console.warn(`Unsupported lodash function: ${p1}`);
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

            const currentSupportedFunctions = params.filter((param) =>
              supportedFunctions.includes(param),
            );
            const unsupportedFunctions = params.filter(
              (param) => !supportedFunctions.includes(param),
            );

            if (unsupportedFunctions.length) {
              console.warn(`Unsupported lodash functions: ${unsupportedFunctions.join(', ')}`);

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
            if (!supportedFunctions.includes(p2)) {
              console.warn(`Unsupported lodash function: ${p2}`);
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
