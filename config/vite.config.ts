import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
const configDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    root: path.resolve(configDir, '..'),
    base: './',
    plugins: [viteSingleFile()],
    build: {
        target: 'esnext',
        minify: false,
        cssMinify: true,
        modulePreload: {
            polyfill: false,
        },
        assetsInlineLimit: (filePath: string) => {
            if (filePath.endsWith('.wasm')) return false;
            return undefined;
        },
    },
    optimizeDeps: {
        // sql.js 是 UMD/CJS（module.exports.default=initSqlJs）。dev 期必须让 esbuild
        // 预打包它，才能合成出 ESM 的 default 导出；否则 bridgeDb.ts 的 `import initSqlJs`
        // 会报 "does not provide an export named 'default'"。wasm 仍按 locateFile 运行期加载。
        // （optimizeDeps 仅作用于 dev，不影响生产 rollup 构建。）
        include: ['sql.js'],
    },
    server: {
        // 仅开发期：把天地图瓦片经本地代理转发，并伪装成白名单域名的 Referer/Origin，
        // 绕过天地图 tk 的浏览器端域名白名单（线上 usst.lyricin.com 直连，不走此代理）。
        proxy: {
            '/tdt': {
                target: 'https://t0.tianditu.gov.cn',
                changeOrigin: true,
                rewrite: (p: string) => p.replace(/^\/tdt/, ''),
                configure: (proxy: any) => {
                    // 天地图浏览器端 tk 校验 Referer/Origin 域名白名单，并要求带浏览器 UA。
                    proxy.on('proxyReq', (proxyReq: any) => {
                        if (proxyReq.headersSent) return;
                        proxyReq.setHeader('Referer', 'https://usst.lyricin.com/');
                        proxyReq.setHeader('Origin', 'https://usst.lyricin.com');
                        proxyReq.setHeader(
                            'User-Agent',
                            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
                                'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
                        );
                    });
                    // 兜底：天地图偶发 TLS 重置时只让该瓦片返回 502，不让整个 dev 进程崩溃。
                    proxy.on('error', (_err: any, _req: any, res: any) => {
                        if (res && !res.headersSent && typeof res.writeHead === 'function') {
                            res.writeHead(502);
                        }
                        if (res && typeof res.end === 'function') res.end();
                    });
                },
            },
        },
    },
});
