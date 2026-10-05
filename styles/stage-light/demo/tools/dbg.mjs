// debug helper: node styles/stage-light/demo/tools/dbg.mjs <t> "<js expression run after render(t)>"
import { openDemo, closeServer } from '../../../../core/render/page.mjs';
const [t, expr] = [parseFloat(process.argv[2]), process.argv[3]];
const { browser, page } = await openDemo('styles/stage-light/demo');
const r = await page.evaluate(([t, expr]) => { window.render(t); return eval(expr); }, [t, expr]);
console.log(JSON.stringify(r)); await browser.close(); closeServer();
