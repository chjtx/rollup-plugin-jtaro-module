var utils = require('rollup-pluginutils')
var path = require('path')

module.exports = function (options) {
  options = options || {}
  var filter = utils.createFilter(options.include || ['**/*.html', '**/*.css'], options.exclude)

  function path2id (p) {
    var root = path.resolve(process.cwd(), options.root || '')
    return p.replace(root, '').replace(/\/|\\/g, '_').replace(/\.[a-zA-Z]+$/, '')
  }

  function parseHtml (data, p) {
    var reg = /<style>([\s\S]+)<\/style>/
    var styleText = reg.exec(data)
    var css = ''
    var id = path2id(p)

    // 提取模板的<style>
    if (styleText) {
      // 去掉前后空格
      css = styleText[1].trim()
        // 以.#[*和字母开头的选择器前面加上jtaro标识
        .replace(/(^|{|})\s*([.#a-zA-Z\[*][^{}]+)?{/g, function (match, m1, m2) {
          var selector = (m2 || '').trim()
          // from和to是@keyframes的关键词，不能替换
          if (selector === 'from' || selector === 'to') {
            return match
          }
          return (m1 || '') + '\n[jtaro' + id + '] ' + selector + ' {'
        })
        // 将属性的逗号用<mark>保存，避免下一步误操作，例：background: rgba(0, 0, 0, .3);
        .replace(/:[^;}]+(;|\})/g, function (match) {
          return match.replace(/,/g, '<mark>')
        })
        // 拆分用逗号分隔的选择符并加上jtaro标识，例：h1, h2, h3 {}
        .split(/,\s+(?=[.#a-zA-Z\[*])/).join(',\n[jtaro' + id + '] ')
        // 还原<mark>
        .replace(/<mark>/g, ',')
        // 去掉this
        .replace(/\s+this(?=\s+)?/g, '') + '\n'

      // 过滤已截取的style
      data = data.replace(styleText[0], '')

      // 去除行首空格
      data = data.replace(/^\s+/, '')

      // 标识第一个dom
      data = data.replace(/^<\w+(?= |>)/, function (match) {
        return match + ' jtaro' + id + ' '
      })
    }

    return {
      id: id,
      style: css,
      html: data
    }
  }

  return {
    name: 'jtaro-module',
    intro: function () {
      return 'var __jtaro_style__ = [];'
    },
    outro: function () {
      return '(function(c){\n' +
        '  var s=document.createElement("style");\n' +
        '  s.id="jtaro_style_bundle";\n' +
        '  s.innerHTML=c;\n' +
        '  document.head.appendChild(s)\n' +
        '})(__jtaro_style__.join("\\n\\n"))\n' +
        '__jtaro_style__ = null'
    },
    transform: function (code, id) {
      if (!filter(id)) return

      var ext = /\.[a-zA-Z]+$/.exec(id)[0]
      var result
      var style = ''

      // html
      if (ext === '.html') {
        result = parseHtml(code, id)
        if (result.style) {
          style = '__jtaro_style__.push(' + JSON.stringify(result.style) + ')\n'
        }
        code = style + 'export default ' + JSON.stringify(result.html)

      // css
      } else if (ext === '.css') {
        code = '__jtaro_style__.push(' + JSON.stringify('\n' + code.trim() + '\n') + ')'

      // other
      } else {
        return
      }

      return {
        code: code,
        map: { mappings: '' }
      }
    }
  }
}
