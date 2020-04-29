const LazyResult = require("postcss/lib/lazy-result");
const postcss = require("postcss");

const normalizeRuleSettings = require("stylelint/lib/normalizeRuleSettings");
const lintPostcssResult = require("./lintPostcssResult");

const postcssProcessor = postcss();

// TODO:
// enable fix?
// enable plugins?
// enable disable ranges?
// use types from stylelint
// refactor stylelint internals to enable pulling more stylelint code in, and writing less custom code here?
// how closely to align with the existing API? e.g. make use of JSON formatter

/**
 *
 *
 * Layers of stylelint
 *
 * host environment (cli, node module, fs etc) ? how does the postcss plugin work
 * stylelint layer
 * postcss layer
 *
 */

async function lint(text, config) {
  const postcssOptions = {
    syntax: {
      parse: postcss.parse,
      stringify: postcss.stringify,
    },
    from: undefined,
  };

  // TODO: why create a LazyResult here? Why not use postcss.process()?
  const result = await new LazyResult(postcssProcessor, text, postcssOptions);

  result.stylelint = {};

  const normalizedConfig = normalizeAllRuleSettings(config);

  return lintPostcssResult({ _options: {} }, result, normalizedConfig).then(
    () => result
  );
}

// // Run normalizeRuleSettings on all rules in the config
function normalizeAllRuleSettings(config) {
  let normalizedRules = {};
  Object.entries(config.rules).forEach(([ruleName, ruleSettings]) => {
    normalizedRules[ruleName] = normalizeRuleSettings(ruleSettings, ruleName);
  });
  return { ...config, rules: normalizedRules };
}

module.exports = lint;
