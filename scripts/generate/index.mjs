import actions from './actions/index.mjs';
import generators from './generators/index.mjs';

/**
 * @param {import('plop').NodePlopAPI} plop
 * @returns {void}
 */
export default function (plop) {
  actions(plop);
  generators(plop);
}
