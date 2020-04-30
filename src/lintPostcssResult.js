const assignDisabledRanges = require("stylelint/lib/assignDisabledRanges");
const getOsEol = require("stylelint/lib/utils/getOsEol");
const reportUnknownRuleNames = require("stylelint/lib/reportUnknownRuleNames");
const rulesOrder = require("stylelint/lib/rules");

const requireRule = require("./requireRule");

const _ = require("lodash");

/** Functions below here are copy and pasted from stylelint without further modification */

/**
 * @param {StylelintInternalApi} stylelint
 * @param {PostcssResult} postcssResult
 * @param {import('stylelint').StylelintConfig} config
 * @returns {Promise<any>}
 */
module.exports = function lintPostcssResult(stylelint, postcssResult, config) {
  postcssResult.stylelint.ruleSeverities = {};
  postcssResult.stylelint.customMessages = {};
  postcssResult.stylelint.stylelintError = false;
  postcssResult.stylelint.quiet = config.quiet || false;

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

    assignDisabledRanges(postcssDoc, postcssResult);
  }

  if (
    stylelint._options.reportNeedlessDisables ||
    stylelint._options.ignoreDisables
  ) {
    postcssResult.stylelint.ignoreDisables = true;
  }

  const isFileFixCompatible = isFixCompatible(postcssResult);

  if (!isFileFixCompatible) {
    postcssResult.stylelint.disableWritingFix = true;
  }

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
        (a, b) => rulesOrder.indexOf(a) - rulesOrder.indexOf(b)
      )
    : [];

  rules.forEach((ruleName) => {
    const ruleFunction =
      requireRule(ruleName) || _.get(config, ["pluginFunctions", ruleName]);

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

    const ruleSettings = _.get(config, ["rules", ruleName]);

    if (ruleSettings === null || ruleSettings[0] === null) {
      return;
    }

    const primaryOption = ruleSettings[0];
    const secondaryOptions = ruleSettings[1];

    // Log the rule's severity in the PostCSS result
    const defaultSeverity = config.defaultSeverity || "error";

    postcssResult.stylelint.ruleSeverities[ruleName] = _.get(
      secondaryOptions,
      "severity",
      defaultSeverity
    );
    postcssResult.stylelint.customMessages[ruleName] = _.get(
      secondaryOptions,
      "message"
    );

    performRules.push(
      Promise.all(
        postcssRoots.map((postcssRoot) =>
          ruleFunction(primaryOption, secondaryOptions, {
            fix:
              stylelint._options.fix &&
              // Next two conditionals are temporary measures until #2643 is resolved
              isFileFixCompatible &&
              !postcssResult.stylelint.disabledRanges[ruleName],
            newline,
          })(postcssRoot, postcssResult)
        )
      )
    );
  });

  return Promise.all(performRules);
};

/**
 * There are currently some bugs in the autofixer of Stylelint.
 * The autofixer does not yet adhere to stylelint-disable comments, so if there are disabled
 * ranges we can not autofix this document. More info in issue #2643.
 *
 * @param {PostcssResult} postcssResult
 * @returns {boolean}
 */
function isFixCompatible({ stylelint }) {
  // Check for issue #2643
  if (stylelint.disabledRanges.all.length) return false;

  return true;
}
