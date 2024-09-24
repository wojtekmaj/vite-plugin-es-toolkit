import { describe, expect, it } from 'vitest';

import esToolkitPlugin from './index.js';

function runPlugin(src: string): string | undefined {
  const plugin = esToolkitPlugin();

  return plugin.transform(src, 'file.ts')?.code;
}

describe('esToolkitPlugin()', () => {
  it('should replace default import from lodash with named import from es-toolkit/compat', () => {
    const src = `import _ from 'lodash';
_.isEqual({}, {});
_.isFunction(() => {});`;

    const result = runPlugin(src);

    expect(result).toMatchInlineSnapshot(
      `"import { * as _ } from 'es-toolkit/compat';
_.isEqual({}, {});
_.isFunction(() => {});"`,
    );
  });

  it('should keep default import from lodash if an unsupported function is imported', () => {
    const src = `import _ from 'lodash';
_.every([], () => true);
_.isEqual({}, {});`;

    const result = runPlugin(src);

    expect(result).toMatchInlineSnapshot(`"import _ from 'lodash';
_.every([], () => true);
_.isEqual({}, {});"`);
  });

  it('should not raise false positives for unsupported functions', () => {
    const src = `import lodash from 'lodash';
totallynotlodash.every([], () => true);
lodash.isEqual({}, {});`;

    const result = runPlugin(src);

    expect(result).toMatchInlineSnapshot(`"import { * as lodash } from 'es-toolkit/compat';
totallynotlodash.every([], () => true);
lodash.isEqual({}, {});"`);
  });

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

  it.todo(
    'should replace renamed named import from lodash with named import from es-toolkit/compat',
    () => {
      const src = `import { isEqual as lodashIsEqual } from 'lodash';`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(
        `"import { isEqual as lodashIsEqual } from 'es-toolkit/compat';"`,
      );
    },
  );

  it('should replace multiple named imports (multiline) from lodash with named imports from es-toolkit/compat', () => {
    const src = `import {
  isEqual,
  isFunction,
} from 'lodash';`;

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
