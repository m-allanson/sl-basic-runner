# Stylelint browser bundle (again)

Live demo: https://upbeat-yonath-79931e.netlify.app/

Related to:

- this issue in stylelint: https://github.com/stylelint/stylelint/issues/3935
- my previous attempt at doing this: https://github.com/m-allanson/stylelint-browser-demo

### Getting started

- npm install
- npm run bundle
- cd dist
- npx serve
- http://localhost:5000

### How it works

This pulls together a few parts of stylelint's internals and [wraps them in a function that accepts a string of css and a stylelint config](./src/index.js).

It returns results using stylelint's JSON result formatter.

It avoids the parts of stylelint that rely on filesystem access. Which means the code can be bundled for a browser without having to stub out all the browser-incompatible modules used by stylelint.

See [./dist/index.html](./dist/index.html) for example usage.

It should be possible to remove most of the code in this repo by refactoring stylelint a little.
