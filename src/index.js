const LazyResult = require("postcss/lib/lazy-result");
const postcss = require("postcss");

const normalizeRuleSettings = require("stylelint/lib/normalizeRuleSettings");
const createStylelintResult = require("stylelint/lib/createStylelintResult");
const jsonFormatter = require("stylelint/lib/formatters/jsonFormatter");

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

  await lintPostcssResult({ _options: {} }, result, normalizedConfig);

  const formattedResult = await formatResult(result, config);
  return formattedResult;
}

async function formatResult(result, config) {
  const stylelintStub = {
    getConfigForFile: () => Promise.resolve({ config }),
  };
  const res = await createStylelintResult(stylelintStub, result);
  const formatted = jsonFormatter([res]);
  return formatted;
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
