# rollup-plugin-jtaro-module

A Rollup plugin for JTaro Module.

## Installation

```
npm install --save-dev rollup-plugin-jtaro-module
```

## Usage

```js
// rollup.config.js
import jtaroModule from 'rollup-plugin-jtaro-module'

export default {
  entry: 'entry.js',
  dest: 'bundle.js',
  plugins: [
    jtaroModule()
  ]
}
```

```js
// entry.js
import './reset.css'
import './layout.css'

import template from './template.html'
```

## Options

- `root` Your site root directory, relative to your project directory.

```js
// rollup.config.js
import jtaroModule from 'rollup-plugin-jtaro-module'

export default {
  entry: 'entry.js',
  dest: 'bundle.js',
  plugins: [
    jtaroModule({
      root: 'website'
    })
  ]
}
```

## v0.0.7 (2017-04-28)

- 修复`@keyframes`和`@media`被误处理的问题

## v0.0.6 (2017-04-19)

- 支持`this.myclass {}`选择器语法

## v0.0.5 (2017-02-24)

- 将所有页面style合并到一起

## License

MIT