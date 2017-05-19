var utils = require('rollup-pluginutils')
var path = require('path')
var sourceMap = require('source-map')

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
      return 'var __jtaro_style__ = "###jtaro_module_style_text###";\n' +
        '(function(c){\n' +
        '  var s = document.getElementById("jtaro_style_bundle")\n' +
        '  if (s) {\n' +
        '   s.innerHTML += c\n' +
        '  } else {\n' +
        '    s = document.createElement("style");\n' +
        '    s.id = "jtaro_style_bundle";\n' +
        '    s.innerHTML = c;\n' +
        '    document.head.appendChild(s)\n' +
        '  }\n' +
        '})(__jtaro_style__)\n' +
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
          style = '_____(' + JSON.stringify('<<<<<' + result.style + '>>>>>') + ');'
        }
        code = style + '\nexport default ' + JSON.stringify(result.html)

      // css
      } else if (ext === '.css') {
        code = '_____(' + JSON.stringify('<<<<<\n' + code.trim() + '\n>>>>>') + ');'

      // other
      } else {
        return
      }

      return {
        code: code,
        map: { mappings: '' }
      }
    },
    transformBundle: function (source) {
      var generator = new sourceMap.SourceMapGenerator({
        file: 'j'
      })
      generator.setSourceContent("j", source)
      
      var line = 0
      var column = 0
      var original = [] // 代码改变前的行列
      var style = []
      // bundle后将预先标记的style代码前置到开头执行，确保样式优先
      var code = source.replace(/_____\(\"<<<<<([\s\S]+?)>>>>>\"\);?[\n\r]+?|(\n)/g, function (match, css, enter, pos) {
        line++
        if (css) {
          // 标记转换前的位置
          original.push({
            line: line,
            content: css
          })
          style.push(css)
          return ''
        } else {
          return match
        }
      })
      // 查找转换后的行列
      column = code.indexOf('###jtaro_module_style_text###')
      var tempA = code.substr(0, column)
      var tempB = tempA.split('\n')
      column = column - (tempB.length ? tempB[tempB.length - 1].length : 0)

      // 最终转换的代码
      code = code.replace('###jtaro_module_style_text###', style.join(''))

      // 添加变更过的mapping
      original.forEach(function (ori) {
        generator.addMapping({
          source: 'j',
          original: { line: ori.line, column: 1 },
          generated: { line: tempB.length, column: code.indexOf(ori.content) - column + 1 }
        })
      })

      // 添加没变更的代码的mapping
      // 比较两文件的每一行，如果code的n行不等于source的n行且code的n行在source里，比较code的n行与sourcen+step行即可
      var codeArr = code.split('\n')
      var sourceArr = source.split('\n')
      var step = 0
      for (var i = 0, l = codeArr.length; i < l; i++) {
        if (codeArr[i] === sourceArr[i + step]) {
          generator.addMapping({
            source: 'j',
            original: { line: i + 1 + step, column: 1 },
            generated: { line: i + 1, column: 1 }
          })
        } else if (source.indexOf(codeArr[i]) > -1) {
          i--
          step++
        }
      }

      return {
        code: code,
        map: JSON.parse(generator.toString())
      }
    }
  }
}
