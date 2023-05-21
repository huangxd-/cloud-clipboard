import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';
import Koa from 'koa';
import koaCompress from 'koa-compress';
import koaStatic from 'koa-static';
import koaWebsocket from 'koa-websocket';

import config from './app/config.js';
import httpRouter from './app/http-router.js';
import wsRouter from './app/ws-router.js';

try {
    fs.rmSync(path.join(os.tmpdir(), '.cloud-clipboard-storage'), { recursive: true });
} catch {}
fs.mkdirSync(path.join(os.tmpdir(), '.cloud-clipboard-storage'));

process.env.VERSION = `node-${JSON.parse(fs.readFileSync(path.join(path.dirname(url.fileURLToPath(import.meta.url)), 'package.json'))).version}`;

const app = koaWebsocket(
    new Koa,
    undefined,
    (config.server.key && config.server.cert) ? {
        key: fs.readFileSync(config.server.key),
        cert: fs.readFileSync(config.server.cert),
    } : undefined,
);
app.use(koaCompress());
app.use(koaStatic(path.join(path.dirname(url.fileURLToPath(import.meta.url)), 'static')));
app.use(httpRouter.routes());
app.use(httpRouter.allowedMethods());
app.ws.use(wsRouter.routes());
app.ws.use(wsRouter.allowedMethods());

if (Array.isArray(config.server.host) && config.server.host.length) {
    config.server.host.forEach(e => app.listen(config.server.port, e));
} else {
    app.listen(config.server.port);
}

console.log([
    '',
    `Cloud Clipboard ${process.env.VERSION}`,
    'https://github.com/TransparentLC/cloud-clipboard',
    '',
    'Authorization code' + (config.server.auth ? `: ${config.server.auth}` : ' is disabled.'),
    `Server listening on port ${config.server.port} ...`,
    'Available at:',
    ...(Array.isArray(config.server.host) && config.server.host.length
        ? (
            config.server.host.map(e => {
                // How to check if a string is a valid IPv6 address in JavaScript? | MELVIN GEORGE
                // https://melvingeorge.me/blog/check-if-string-is-valid-ipv6-address-javascript
                const isIPv6 = e.match(/(([\da-f]{1,4}:){7,7}[\da-f]{1,4}|([\da-f]{1,4}:){1,7}:|([\da-f]{1,4}:){1,6}:[\da-f]{1,4}|([\da-f]{1,4}:){1,5}(:[\da-f]{1,4}){1,2}|([\da-f]{1,4}:){1,4}(:[\da-f]{1,4}){1,3}|([\da-f]{1,4}:){1,3}(:[\da-f]{1,4}){1,4}|([\da-f]{1,4}:){1,2}(:[\da-f]{1,4}){1,5}|[\da-f]{1,4}:((:[\da-f]{1,4}){1,6})|:((:[\da-f]{1,4}){1,7}|:)|fe80:(:[\da-f]{0,4}){0,4}%[\da-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[\d]){0,1}[\d])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[\d]){0,1}[\d])|([\da-f]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[\d]){0,1}[\d])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[\d]){0,1}[\d]))/gi);
                return `    http${config.server.key && config.server.cert ? 's' : ''}://${isIPv6 ? `[${e}]` : e}:${config.server.port}`;
            })
        )
        : (
            Object.entries(os.networkInterfaces()).reduce((acc, [k, v]) => {
                acc.push(`    ${k}:`);
                v.forEach(e => {
                    const a = e.family === 'IPv6' ? `[${e.address}]` : e.address;
                    acc.push(`        http${config.server.key && config.server.cert ? 's' : ''}://${a}:${config.server.port}`);
                });
                return acc;
            }, [])
        )
    ),
].join('\n'));