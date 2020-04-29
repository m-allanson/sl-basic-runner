const LazyResult = require("postcss/lib/lazy-result");
const postcss = require("postcss");
const get = require("lodash/get");

const getOsEol = require("stylelint/lib/utils/getOsEol");
const normalizeRuleSettings = require("stylelint/lib/normalizeRuleSettings");
const reportUnknownRuleNames = require("stylelint/lib/reportUnknownRuleNames");
const rulesOrder = require("stylelint/lib/rules");

const allRules = require("./rules.js");

const postcssProcessor = postcss();

function lint(text, config) {
async function lint(text, config) {
  const postcssOptions = {
    syntax: {
      parse: postcss.parse,
      stringify: postcss.stringify,
    },
    from: undefined,
  };

  // TODO: why create a LazyResult here? Why not use postcss.process()?
  const lazyResult = await new LazyResult(
    postcssProcessor,
    text,
    postcssOptions
  );

  const normalizedConfig = normalizeAllRuleSettings(config);

  return lintPostcssResult(lazyResult, normalizedConfig);
}

// Run normalizeRuleSettings on all rules in the config
function normalizeAllRuleSettings(config) {
  let normalizedRules = {};
  Object.entries(config.rules).forEach(([ruleName, ruleSettings]) => {
    normalizedRules[ruleName] = normalizeRuleSettings(ruleSettings, ruleName);
  });
  return { ...config, rules: normalizedRules };
}

/**
 * @param {PostcssResult} postcssResult
 * @param {import('stylelint').StylelintConfig} config
 * @returns {Promise<any>}
 */
function lintPostcssResult(postcssResult, config) {
  postcssResult.stylelint = {};
  postcssResult.stylelint.ruleSeverities = {};
  postcssResult.stylelint.customMessages = {};
  postcssResult.stylelint.stylelintError = false;
  postcssResult.stylelint.quiet = config.quiet;

  /** @type {string} */
  let newline;
  const postcssDoc = postcssResult.root;

  if (postcssDoc) {
    if (!("type" in postcssDoc)) {
      throw new Error("Unexpected Postcss root object!");
    }

    // @ts-ignore TODO TYPES property css does not exists
    const newlineMatch =
      postcssDoc.source && postcssDoc.source.input.css.match(/\r?\n/);

    newline = newlineMatch ? newlineMatch[0] : getOsEol();

    // assignDisabledRanges(postcssDoc, postcssResult);
  }

  postcssResult.stylelint.ignoreDisables = false;
  postcssResult.stylelint.disableWritingFix = true;

  const postcssRoots = /** @type {import('postcss').Root[]} */ (postcssDoc &&
  postcssDoc.constructor.name === "Document"
    ? postcssDoc.nodes
    : [postcssDoc]);

  // Promises for the rules. Although the rule code runs synchronously now,
  // the use of Promises makes it compatible with the possibility of async
  // rules down the line.
  /** @type {Array<Promise<any>>} */
  const performRules = [];

  const rules = config.rules
    ? Object.keys(config.rules).sort(
        (a, b) =>
          Object.keys(rulesOrder).indexOf(a) -
          Object.keys(rulesOrder).indexOf(b)
      )
    : [];

  rules.forEach((ruleName) => {
    const ruleFunction =
      allRules[ruleName] || get(config, ["pluginFunction", ruleName]);

    if (ruleFunction === undefined) {
      performRules.push(
        Promise.all(
          postcssRoots.map((postcssRoot) =>
            reportUnknownRuleNames(ruleName, postcssRoot, postcssResult)
          )
        )
      );

      return;
    }

    const ruleSettings = get(config, ["rules", ruleName]);

    if (ruleSettings === null || ruleSettings[0] === null) {
      return;
    }

    const primaryOption = ruleSettings[0];
    const secondaryOptions = ruleSettings[1];

    // Log the rule's severity in the PostCSS result
    const defaultSeverity = config.defaultSeverity || "error";

    postcssResult.stylelint.ruleSeverities[ruleName] = get(secondaryOptions, [
      "severity",
      defaultSeverity,
    ]);
    postcssResult.stylelint.customMessages[ruleName] = get(secondaryOptions, [
      "message",
    ]);

    performRules.push(
      Promise.all(
        postcssRoots.map((postcssRoot) =>
          ruleFunction(primaryOption, secondaryOptions, {
            fix: false, // TODO: fix fix not fixing
            newline,
          })(postcssRoot, postcssResult)
        )
      )
    );
  });

  return Promise.all(performRules).then(() => postcssResult);
}

module.exports = lint;
