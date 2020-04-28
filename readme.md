basic stylelint runner

(not working yet)

- npm install
- node test.js

### browser bundle

- npm run bundle:browser
- cd dist
- npx serve
- http://localhost:5000
- open dev console
- paste `const result = stylelint("a {color: #fff}", { rules: { 'color-hex-length': 'long' }})`
