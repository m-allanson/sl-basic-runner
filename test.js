const linter = require("./src/index.js");

const config = require("./testConfig.js");
const text = "a {color: #FFF; }";

linter(text, config).then((result) => {
  console.log(result);
});
