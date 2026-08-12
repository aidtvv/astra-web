// Cloudflare Worker - Astra API Proxy
// 将请求从 Astra 前端代理到 todo.i99yun.com
//
// 部署步骤：
// 1. 注册 Cloudflare 账号（免费）
// 2. 在 Cloudflare Dashboard 创建 Worker
// 3. 将此脚本粘贴到 Worker 编辑器中
// 4. 保存并部署
// 5. 将 Worker URL（如 https://astra-api.workers.dev）配置到前端 VITE_API_BASE

const UPSTREAM = 'https://todo.i99yun.com';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Token, Platform',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const upstreamUrl = `${UPSTREAM}${url.pathname}${url.search}`;

    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // 构建转发请求
    const headers = new Headers(request.headers);
    // 移除可能引起问题的头部
    headers.delete('host');
    headers.delete('cf-connecting-ip');

    try {
      const upstreamResponse = await fetch(upstreamUrl, {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'follow',
      });

      // 构建响应，添加 CORS 头部
      const responseHeaders = new Headers(upstreamResponse.headers);
      for (const [key, value] of Object.entries(CORS_HEADERS)) {
        responseHeaders.set(key, value);
      }

      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Proxy request failed', message: error.message }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS,
          },
        }
      );
    }
  },
};
