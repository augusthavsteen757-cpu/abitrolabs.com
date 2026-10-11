/**
 * Webpack loader: backports a React 19.3 hydration fix into the React copy that Next.js 15.5 ships
 * (19.2.0-canary) while the browser bundle is built. Nothing in node_modules is changed.
 *
 * The bug: when a long page streams in and part of it arrives while React is hydrating, React pauses
 * and later "replays" an element without resetting its position in the server HTML. It then thinks the
 * element's first child is left over, logs error #418 and throws away the whole page to render it again
 * in the browser (a flash, and anything the user just typed is lost). Measured on /dashboard,
 * /dashboard/sammenlign and /dashboard/konto in roughly 1 of 50–400 page loads under load.
 * React 19.3 resets the position in replaySuspendedUnitOfWork; this adds exactly those lines.
 *
 * If Next updates its React and the code no longer matches, the build stops so this is reviewed.
 * Delete this loader (and its rule in next.config.mjs) once Next ships React >= 19.3.
 */
const MARK = "/* klardal: react 19.3 hydration replay fix */";

module.exports = function reactHydrationFix(source) {
  if (source.includes(MARK)) return source;
  const start = source.indexOf("function replaySuspendedUnitOfWork(");
  // Production and development builds name the fiber variable differently and indent differently.
  const m = start < 0 ? null : /\n( +)case 5:\n\1  resetHooksOnUnwind\((\w+)\);\n\1default:/.exec(source.slice(start, start + 2500));
  if (!m || !source.includes("function popToNextHostParent(")) {
    throw new Error(`react-hydration-fix-loader: ${this.resourcePath} has changed – review the patch (see the comment at the top).`);
  }
  const [old, ind, v] = m;
  const fix =
    `\n${ind}case 5:\n${ind}  resetHooksOnUnwind(${v}); ${MARK}\n` +
    `${ind}  ${v} === hydrationParentFiber &&\n` +
    `${ind}    (isHydrating\n` +
    `${ind}      ? (popToNextHostParent(${v}),\n` +
    `${ind}        5 === ${v}.tag && null != ${v}.stateNode && (nextHydratableInstance = ${v}.stateNode))\n` +
    `${ind}      : (popToNextHostParent(${v}), (isHydrating = !0)));\n` +
    `${ind}default:`;
  const at = start + m.index;
  return source.slice(0, at) + fix + source.slice(at + old.length);
};
