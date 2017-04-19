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
      css = '\n[jtaro' + id + '] ' + styleText[1].replace(/\bthis\b/, '').trim()
        .replace(/}\s+(?!$)/g, '}\n[jtaro' + id + '] ')
        .replace(/:[^;}]+(;|\})/g, function (match) {
          return match.replace(/,/g, '<mark>')
        })
        .split(/,\s+/).join(',\n[jtaro' + id + '] ')
        .replace(/<mark>/g, ',')
        .replace(/\s+this/g, '') + '\n'

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
