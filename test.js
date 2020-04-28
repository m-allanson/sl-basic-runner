const linter = require("./index.js");

const config = require("./defaultConfig.js");
const text = "a {color: #FFF; }";

linter(text, config).then((result) => {
  console.log(result);
});
