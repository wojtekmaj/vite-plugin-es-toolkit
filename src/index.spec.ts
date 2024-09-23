import { describe, expect, it } from 'vitest';

import esToolkitPlugin from './index.js';

function runPlugin(src: string): string | undefined {
  const plugin = esToolkitPlugin();

  return plugin.transform(src, 'file.ts')?.code;
}

describe('esToolkitPlugin()', () => {
  it('should replace named import from lodash with named import from es-toolkit/compat', () => {
    const src = `import { isEqual } from 'lodash';`;

    const result = runPlugin(src);

    expect(result).toMatchInlineSnapshot(`"import { isEqual } from 'es-toolkit/compat';"`);
  });

  it('should keep unsupported named imports from lodash', () => {
    const src = `import { every } from 'lodash';`;

    const result = runPlugin(src);

    expect(result).toMatchInlineSnapshot(`"import { every } from 'lodash';"`);
  });

  it('should replace multiple named imports from lodash with named imports from es-toolkit/compat', () => {
    const src = `import { isEqual, isFunction } from 'lodash';`;

    const result = runPlugin(src);

    expect(result).toMatchInlineSnapshot(
      `"import { isEqual, isFunction } from 'es-toolkit/compat';"`,
    );
  });

  it('should replace named import from lodash with named import from es-toolkit/compat and keep unsupported named imports from lodash', () => {
    const src = `import { every, isEqual } from 'lodash';`;

    const result = runPlugin(src);

    expect(result).toMatchInlineSnapshot(
      `"import { isEqual } from 'es-toolkit/compat';import { every } from 'lodash';"`,
    );
  });

  it('should replace default import from lodash/* with named import from es-toolkit/compat', () => {
    const src = `import isEqual from 'lodash/isEqual';`;

    const result = runPlugin(src);

    expect(result).toMatchInlineSnapshot(`"import { isEqual } from 'es-toolkit/compat';"`);
  });

  it('should replace renamed default import from lodash/* with renamed named import from es-toolkit/compat', () => {
    const src = `import lodashIsEqual from 'lodash/isEqual';`;

    const result = runPlugin(src);

    expect(result).toMatchInlineSnapshot(
      `"import { isEqual as lodashIsEqual } from 'es-toolkit/compat';"`,
    );
  });

  it('should keep unsupported default imports from lodash/*', () => {
    const src = `import every from 'lodash/every';`;

    const result = runPlugin(src);

    expect(result).toMatchInlineSnapshot(`"import every from 'lodash/every';"`);
  });
});
