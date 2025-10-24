[![npm](https://img.shields.io/npm/v/vite-plugin-es-toolkit.svg)](https://www.npmjs.com/package/vite-plugin-es-toolkit) ![downloads](https://img.shields.io/npm/dt/vite-plugin-es-toolkit.svg) [![CI](https://github.com/wojtekmaj/vite-plugin-es-toolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/wojtekmaj/vite-plugin-es-toolkit/actions)

# vite-plugin-es-toolkit

Vite plugin for replacing Lodash with [es-toolkit](https://es-toolkit.slash.page/), a smaller, faster, and more tree-shakable alternative.

## tl;dr

- Install es-toolkit, if you haven't already, by executing `npm install es-toolkit` or `yarn add es-toolkit`.
- Install by executing `npm install vite-plugin-es-toolkit` or `yarn add vite-plugin-es-toolkit`.
- Import by adding `import esToolkitPlugin from 'vite-plugin-es-toolkit'`.
- Use it by adding `esToolkitPlugin()` to `plugins` section of your Vite config.

## Getting started

To use this plugin, you need to have [es-toolkit](https://es-toolkit.slash.page/) installed in your project. The minimum required version is `1.11.0`, but `1.39.3` or later is recommended to ensure 100% compatibility with Lodash.

## Usage

Here's an example of basic configuration:

```ts
import { defineConfig } from 'vite';
import esToolkitPlugin from 'vite-plugin-es-toolkit';

export default defineConfig({
  plugins: [
    esToolkitPlugin(),
  ],
});
```

> [!TIP]
> Measure actual impact of `vite-plugin-es-toolkit` on _your_ codebase with [Vite Compare Bundle Size](https://github.com/marketplace/actions/vite-compare-bundle-size) GitHub Action.

## License

The MIT License.

## Author

<table>
  <tr>
    <td >
      <img src="https://avatars.githubusercontent.com/u/5426427?v=4&s=128" width="64" height="64" alt="Wojciech Maj">
    </td>
    <td>
      <a href="https://github.com/wojtekmaj">Wojciech Maj</a>
    </td>
  </tr>
</table>
