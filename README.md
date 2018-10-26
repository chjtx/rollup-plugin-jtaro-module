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
      root: 'website',
      html2Render: true
    })
  ]
}
```

## LOG

### v0.3.1 (2018-10-26)

- 修复`html2Render`选项，只有有与html同名的js文件才转成vue的render函数

### v0.3.0 (2018-10-26)

- 添加`html2Render`选项，可把html文件转换为vue的render函数，同时把同名的js文件的`template: html`转成`render: html.render,\nstaticRenderFns: html.staticRenderFns`

### v0.2.3 (2018-06-07)

- 去掉html文件的注释及空行，减少输出的文件体积

### v0.2.2 (2018-05-15)

- 使不管html文件是否有style标签，都把路径放首个div里

### v0.2.1 (2017-05-20)

- 修复sourceMap不能断点的问题

### v0.2.0 (2017-05-19)

- 添加sourceMap支持

### v0.1.0 (2017-05-16)

- 使打包后的style样式在最前面创建，保证样式优先

### v0.0.7 (2017-04-28)

- 修复`@keyframes`和`@media`被误处理的问题

### v0.0.6 (2017-04-19)

- 支持`this.myclass {}`选择器语法

### v0.0.5 (2017-02-24)

- 将所有页面style合并到一起

## License

MIT