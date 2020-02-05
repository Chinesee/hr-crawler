module.exports = {
  extends: 'eslint-config-egg',
  parser: 'babel-eslint',
  rules: {
    'generator-star-spacing': 'off',
    'babel/generator-star-spacing': 'off',
    semi: [
      "error",
      "never"
    ],
    'array-bracket-spacing': ['error', 'never'],
    'space-before-function-paren': ['error', {
      'anonymous': 'always',
      'named': 'never',
      'asyncArrow': 'always'
    }]
  }
}