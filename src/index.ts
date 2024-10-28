import puppeteer from '@cloudflare/puppeteer';

interface Env {
	MYBROWSER: Fetcher;
	SCREENSHOT_KV: KVNamespace;
}

export default {
	async fetch(request, env): Promise<Response> {
		const { searchParams } = new URL(request.url);
		let url = searchParams.get('url');
		let img: Buffer;
		if (url) {
			url = new URL(url).toString(); // normalize
			img = (await env.SCREENSHOT_KV.get(url, { type: 'arrayBuffer' })) as Buffer;
			
			if (img === null) {
				const browser = await puppeteer.launch(env.MYBROWSER);
				const page = await browser.newPage();

				page.setViewport({ width: 400, height: 800 });
				await page.goto(url);
				page.addStyleTag({
					content: `
						html, body {
							overflow: hidden;
						}
					`,
				});
				await new Promise((resolve) => setTimeout(resolve, 5000));
				img = (await page.screenshot()) as Buffer;
				await env.SCREENSHOT_KV.put(url, img, {
					expirationTtl: 60 * 60 * 24,
				});
				await browser.close();
			}

			return new Response(img, {
				headers: {
					'content-type': 'image/jpeg',
				},
			});
		} else {
			return new Response('Please add an ?url=https://example.com/ parameter');
		}
	},
} satisfies ExportedHandler<Env>;
