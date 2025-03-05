import { describe, expect, it } from 'vitest';

import esToolkitPlugin from './index.js';

function runPlugin(src: string): string | undefined {
  const plugin = esToolkitPlugin();

  return plugin.transform(src, 'file.ts')?.code;
}

describe('esToolkitPlugin()', () => {
  describe('default import', () => {
    it('should replace default import from lodash with named import from es-toolkit/compat', () => {
      const src = `import _ from 'lodash';
_.isEqual({}, {});
_.isFunction(() => {});`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(
        `"import * as _ from 'es-toolkit/compat';
_.isEqual({}, {});
_.isFunction(() => {});"`,
      );
    });

    it('should replace default import from lodash-es with named import from es-toolkit/compat', () => {
      const src = `import _ from 'lodash-es';
_.isEqual({}, {});
_.isFunction(() => {});`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(
        `"import * as _ from 'es-toolkit/compat';
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

    it('should keep default import from lodash-es if an unsupported function is imported', () => {
      const src = `import _ from 'lodash-es';
_.every([], () => true);
_.isEqual({}, {});`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(`"import _ from 'lodash-es';
_.every([], () => true);
_.isEqual({}, {});"`);
    });

    it('should not raise false positives for unsupported functions from lodash', () => {
      const src = `import lodash from 'lodash';
totallynotlodash.every([], () => true);
lodash.isEqual({}, {});`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(`"import * as lodash from 'es-toolkit/compat';
totallynotlodash.every([], () => true);
lodash.isEqual({}, {});"`);
    });

    it('should not raise false positives for unsupported functions from lodash-es', () => {
      const src = `import lodash from 'lodash-es';
totallynotlodash.every([], () => true);
lodash.isEqual({}, {});`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(`"import * as lodash from 'es-toolkit/compat';
totallynotlodash.every([], () => true);
lodash.isEqual({}, {});"`);
    });
  });

  describe('named import', () => {
    it('should replace named import from lodash with named import from es-toolkit/compat', () => {
      const src = `import { isEqual } from 'lodash';`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(`"import { isEqual } from 'es-toolkit/compat';"`);
    });

    it('should replace named import from lodash-es with named import from es-toolkit/compat', () => {
      const src = `import { isEqual } from 'lodash-es';`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(`"import { isEqual } from 'es-toolkit/compat';"`);
    });

    it('should keep unsupported named imports from lodash', () => {
      const src = `import { every } from 'lodash';`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(`"import { every } from 'lodash';"`);
    });

    it('should keep unsupported named imports from lodash', () => {
      const src = `import { every } from 'lodash-es';`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(`"import { every } from 'lodash-es';"`);
    });

    it('should replace multiple named imports from lodash with named imports from es-toolkit/compat', () => {
      const src = `import { isEqual, isFunction } from 'lodash';`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(
        `"import { isEqual, isFunction } from 'es-toolkit/compat';"`,
      );
    });

    it('should replace multiple named imports from lodash-es with named imports from es-toolkit/compat', () => {
      const src = `import { isEqual, isFunction } from 'lodash-es';`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(
        `"import { isEqual, isFunction } from 'es-toolkit/compat';"`,
      );
    });

    it('should replace renamed named import from lodash with named import from es-toolkit/compat', () => {
      const src = `import { isEqual as lodashIsEqual } from 'lodash';`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(
        `"import { isEqual as lodashIsEqual } from 'es-toolkit/compat';"`,
      );
    });

    it('should replace renamed named import from lodash-es with named import from es-toolkit/compat', () => {
      const src = `import { isEqual as lodashIsEqual } from 'lodash-es';`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(
        `"import { isEqual as lodashIsEqual } from 'es-toolkit/compat';"`,
      );
    });

    it('should replace multiple renamed named imports from lodash with named import from es-toolkit/compat', () => {
      const src = `import { isEqual as lodashIsEqual, isFunction as lodashIsFunction } from 'lodash';`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(
        `"import { isEqual as lodashIsEqual, isFunction as lodashIsFunction } from 'es-toolkit/compat';"`,
      );
    });

    it('should replace multiple renamed named imports from lodash-es with named import from es-toolkit/compat', () => {
      const src = `import { isEqual as lodashIsEqual, isFunction as lodashIsFunction } from 'lodash-es';`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(
        `"import { isEqual as lodashIsEqual, isFunction as lodashIsFunction } from 'es-toolkit/compat';"`,
      );
    });

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

    it('should replace multiple named imports (multiline) from lodash-es with named imports from es-toolkit/compat', () => {
      const src = `import {
  isEqual,
  isFunction,
} from 'lodash-es';`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(
        `"import { isEqual, isFunction } from 'es-toolkit/compat';"`,
      );
    });

    it('should replace multiple renamed named imports (multiline) from lodash with named imports from es-toolkit/compat', () => {
      const src = `import {
  isEqual as lodashIsEqual,
  isFunction as lodashIsFunction,
} from 'lodash';`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(
        `"import { isEqual as lodashIsEqual, isFunction as lodashIsFunction } from 'es-toolkit/compat';"`,
      );
    });

    it('should replace multiple renamed named imports (multiline) from lodash-es with named imports from es-toolkit/compat', () => {
      const src = `import {
  isEqual as lodashIsEqual,
  isFunction as lodashIsFunction,
} from 'lodash-es';`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(
        `"import { isEqual as lodashIsEqual, isFunction as lodashIsFunction } from 'es-toolkit/compat';"`,
      );
    });

    it('should replace named import from lodash with named import from es-toolkit/compat and keep unsupported named imports from lodash', () => {
      const src = `import { every, isEqual } from 'lodash';`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(
        `"import { isEqual } from 'es-toolkit/compat';import { every } from 'lodash';"`,
      );
    });

    it('should replace named import from lodash-es with named import from es-toolkit/compat and keep unsupported named imports from lodash', () => {
      const src = `import { every, isEqual } from 'lodash-es';`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(
        `"import { isEqual } from 'es-toolkit/compat';import { every } from 'lodash-es';"`,
      );
    });
  });

  describe('import from lodash/*', () => {
    it('should replace default import from lodash/* with named import from es-toolkit/compat', () => {
      const src = `import isEqual from 'lodash/isEqual';`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(`"import { isEqual } from 'es-toolkit/compat';"`);
    });

    it('should replace default import from lodash-es/* with named import from es-toolkit/compat', () => {
      const src = `import isEqual from 'lodash-es/isEqual';`;

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

    it('should replace renamed default import from lodash-es/* with renamed named import from es-toolkit/compat', () => {
      const src = `import lodashIsEqual from 'lodash-es/isEqual';`;

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

    it('should keep unsupported default imports from lodash-es/*', () => {
      const src = `import every from 'lodash-es/every';`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(`"import every from 'lodash-es/every';"`);
    });
  });

  describe('import from lodash/*.js', () => {
    it('should replace default import from lodash/*.js with named import from es-toolkit/compat', () => {
      const src = `import isEqual from 'lodash/isEqual.js';`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(`"import { isEqual } from 'es-toolkit/compat';"`);
    });

    it('should replace default import from lodash-es/*.js with named import from es-toolkit/compat', () => {
      const src = `import isEqual from 'lodash-es/isEqual.js';`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(`"import { isEqual } from 'es-toolkit/compat';"`);
    });

    it('should replace renamed default import from lodash/*.js with renamed named import from es-toolkit/compat', () => {
      const src = `import lodashIsEqual from 'lodash/isEqual.js';`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(
        `"import { isEqual as lodashIsEqual } from 'es-toolkit/compat';"`,
      );
    });

    it('should replace renamed default import from lodash-es/*.js with renamed named import from es-toolkit/compat', () => {
      const src = `import lodashIsEqual from 'lodash-es/isEqual.js';`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(
        `"import { isEqual as lodashIsEqual } from 'es-toolkit/compat';"`,
      );
    });

    it('should keep unsupported default imports from lodash/*.js', () => {
      const src = `import every from 'lodash/every.js';`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(`"import every from 'lodash/every.js';"`);
    });

    it('should keep unsupported default imports from lodash-es/*.js', () => {
      const src = `import every from 'lodash-es/every.js';`;

      const result = runPlugin(src);

      expect(result).toMatchInlineSnapshot(`"import every from 'lodash-es/every.js';"`);
    });
  });
});
