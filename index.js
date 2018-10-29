var utils = require('rollup-pluginutils')
var path = require('path')
var sourceMap = require('source-map')
const fs = require('fs')
const compiler = require('vue-template-compiler')
const { compileTemplate } = require('@vue/component-compiler-utils')

module.exports = function (options) {
  options = options || {}
  var filter = utils.createFilter(options.include || ['**/*.html', '**/*.css', '**/*.js'], options.exclude)

  function path2id (p) {
    var root = path.resolve(process.cwd(), options.root || '')
    return p.replace(root, '').replace(/\/|\\/g, '_').replace(/\.[a-zA-Z]+$/, '')
  }

  function parseHtml (data, p) {
    var reg = /<style>([\s\S]+)?<\/style>/
    var styleText = reg.exec(data)
    var css = ''
    var id = path2id(p)

    // 提取模板的<style>
    if (styleText) {
      // 去掉前后空格
      css = styleText[1]
      if (css) {
        css = css.trim()
          // 去掉注释
          .replace(/\/\*[\s\S]+?\*\//g, '')
          // 删除空行
          .replace(/^\s*$/mg, '')
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
      }

      // 过滤已截取的style
      data = data.replace(styleText[0], '')
        // 去掉注释
        .replace(/<!--[\s\S]+?-->/g, '')
        // 去除行首空格
        .replace(/^\s+/, '')
        // 删除空行
        .replace(/^\s*$/mg, '')
    }
    // 标识第一个dom
    data = data.replace(/^<\w+(?= |>)/, function (match) {
      return match + ' jtaro' + id + ' '
    })

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
        if (options.html2Render && fs.existsSync(id.replace(/\.html$/, '.js'))) {
          // html转成render函数
          const compiled = compileTemplate({
            source: result.html,
            filename: '',
            compiler,
            transformAssetUrls: '',
            isFunctional: false,
            isProduction: true,
            optimizeSSR: false
          })
          code = style + '\n' + compiled.code + '\nexport default {render, staticRenderFns};'
        } else {
          code = style + '\nexport default ' + JSON.stringify(result.html)
        }

      // css
      } else if (ext === '.css') {
        code = '_____(' + JSON.stringify('<<<<<\n' + code.trim() + '\n>>>>>') + ');'

      // js
      } else if (ext === '.js' && options.html2Render && fs.existsSync(id.replace(/\.js$/, '.html'))) {
        code = code.replace(/template *: *html/, 'render: html.render,\nstaticRenderFns: html.staticRenderFns')

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
      generator.setSourceContent('j', source)

      var style = []
      // bundle后将预先标记的style代码前置到开头执行，确保样式优先
      var code = source.replace(/ +_____\("<<<<<([\s\S]+?)>>>>>"\);?[\n\r]+?/g, function (match, css) {
        style.push(css)
        return ''
      })

      // 查找转换后的行列
      var line = code.substr(0, code.indexOf('###jtaro_module_style_text###')).split('\n').length

      // 最终转换的代码
      code = code.replace('###jtaro_module_style_text###', style.join(''))
      generator.addMapping({
        source: 'j',
        name: '###jtaro_module_style_text###',
        original: { line: line, column: 0 },
        generated: { line: line, column: 0 }
      })

      // 添加没变更的代码的mapping
      // 比较两文件的每一行，如果相同，添加每行每列的mapping
      var codeArr = code.split('\n')
      var sourceArr = source.split('\n')
      var step = 0
      for (var i = 0, l = codeArr.length; i < l; i++) {
        if (codeArr[i] === sourceArr[i + step]) {
          codeArr[i].split('').forEach((value, index) => {
            generator.addMapping({
              source: 'j',
              original: { line: i + 1 + step, column: index },
              generated: { line: i + 1, column: index }
            })
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
