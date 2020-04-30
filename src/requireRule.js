const rules = require("./rules");

module.exports = function (ruleName) {
  return rules[ruleName];
};
