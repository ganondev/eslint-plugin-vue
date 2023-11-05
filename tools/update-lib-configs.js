/**
 * @author Toru Nagashima
 * @copyright 2017 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
'use strict'

/*
This script updates `lib/configs/*.js` files from rule's meta data.
*/

const fs = require('fs')
const path = require('path')
const { FlatESLint } = require('eslint/use-at-your-own-risk')
const categories = require('./lib/categories')

const errorCategories = new Set(['base', 'essential', 'vue3-essential'])

const extendsCategories = {
  base: null,
  essential: 'base',
  'vue3-essential': 'base',
  'strongly-recommended': 'essential',
  'vue3-strongly-recommended': 'vue3-essential',
  recommended: 'strongly-recommended',
  'vue3-recommended': 'vue3-strongly-recommended',
  'use-with-caution': 'recommended',
  'vue3-use-with-caution': 'vue3-recommended'
}

function formatRules(rules, categoryId) {
  const obj = Object.fromEntries(
    rules.map((rule) => {
      let options = errorCategories.has(categoryId) ? 'error' : 'warn'
      const defaultOptions =
        rule.meta && rule.meta.docs && rule.meta.docs.defaultOptions
      if (defaultOptions) {
        const v = categoryId.startsWith('vue3') ? 3 : 2
        const defaultOption = defaultOptions[`vue${v}`]
        if (defaultOption) {
          options = [options, ...defaultOption]
        }
      }
      return [rule.ruleId, options]
    })
  )
  return JSON.stringify(obj, null, 2)
}

function formatCategory(category, flat = false) {
  const extendsCategoryId = extendsCategories[category.categoryId]
  if (extendsCategoryId == null) {
    return flat
      ? `/*
 * IMPORTANT!
 * This file has been automatically generated,
 * in order to update its content execute "npm run update"
 */
const globals = require('globals')
const vueEslintParser = require('vue-eslint-parser')
module.exports = {
  languageOptions: {
    parser: vueEslintParser,
    globals: {
      ...globals.browser,
      ...globals.es2015
    },
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    }
  },
  rules: ${formatRules(category.rules, category.categoryId)}
}
`
      : `/*
* IMPORTANT!
* This file has been automatically generated,
* in order to update its content execute "npm run update"
*/
module.exports = {
 parser: require.resolve('vue-eslint-parser'),
 parserOptions: {
   ecmaVersion: 2020,
   sourceType: 'module'
 },
 env: {
   browser: true,
   es6: true
 },
 plugins: [
   'vue'
 ],
 rules: ${formatRules(category.rules, category.categoryId)}
}
`
  }
  return flat
    ? `/*
* IMPORTANT!
* This file has been automatically generated,
* in order to update its content execute "npm run update"
*/
const extendedConfig = require('./${extendsCategoryId}')
module.exports = {
  extendedConfig,
  rules: ${formatRules(category.rules, category.categoryId)}
}
`
    : `/*
 * IMPORTANT!
 * This file has been automatically generated,
 * in order to update its content execute "npm run update"
 */
module.exports = {
  extends: require.resolve('./${extendsCategoryId}'),
  rules: ${formatRules(category.rules, category.categoryId)}
}
`
}

// Update files.
const ROOT = path.resolve(__dirname, '../lib/configs/')
for (const category of categories) {
  const filePath = path.join(ROOT, `${category.categoryId}.js`)
  const content = formatCategory(category)

  fs.writeFileSync(filePath, content)

  const flatFilePath = path.join(ROOT, 'flat', `${category.categoryId}.js`)
  const flatContent = formatCategory(category, true)

  fs.writeFileSync(flatFilePath, flatContent)
}

// Format files.
async function format() {
  const linter = new FlatESLint({ fix: true })
  const report = await linter.lintFiles([ROOT])
  FlatESLint.outputFixes(report)
}

format()
