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

- `root` Your site root directory

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

## License

MIT