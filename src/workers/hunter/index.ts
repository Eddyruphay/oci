export interface Env {
	HUNTER_KV: KVNamespace;
}

class LinkCollector {
  public linkCount = 0;
  constructor(private readonly env: Env, private readonly ctx: ExecutionContext) {}

  async element(element: Element) {
    const href = element.getAttribute('href');
    if (href && href.startsWith('/video')) {
      this.linkCount++;
      const fullUrl = `https://www.xvideos.com${href}`;
      console.log(`Hunter Worker: Found link: ${fullUrl}`);
      // Save the link to KV with a 7-day expiration, non-blocking
      this.ctx.waitUntil(this.env.HUNTER_KV.put(fullUrl, new Date().toISOString(), { expirationTtl: 60 * 60 * 24 * 7 }));
    }
  }
}

export default {
	async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
		console.log("Hunter Worker: Starting scheduled run at " + new Date().toISOString());
		try {
      // 1. Test basic connectivity
      console.log("Hunter Worker: Testing outbound fetch to example.com...");
      const testResponse = await fetch("https://example.com");
      console.log(`Hunter Worker: example.com fetch status: ${testResponse.status}`);

			// 2. Attempt to fetch the target site
      console.log("Hunter Worker: Fetching xvideos.com...");
			const response = await fetch("https://www.xvideos.com", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
			console.log(`Hunter Worker: Fetched xvideos.com with status: ${response.status}`);

			if (!response.ok) {
				console.error(`Hunter Worker: Failed to fetch xvideos.com. Status: ${response.status}. Body: ${await response.text()}`);
				return;
			}

      // 3. Process the response
      console.log("Hunter Worker: Processing response with HTMLRewriter...");
			const linkCollector = new LinkCollector(env, ctx);
			const htmlRewriter = new HTMLRewriter().on('div.thumb-block p > a', linkCollector);

			await htmlRewriter.transform(response).text();

      if (linkCollector.linkCount === 0) {
        console.log("Hunter Worker: No links found with the current selector 'div.thumb-block p > a'.");
      } else {
        console.log(`Hunter Worker: Successfully processed ${linkCollector.linkCount} links.`);
      }

		} catch (error) {
			const err = error as Error;
			console.error(`Hunter Worker: An error occurred during the scheduled run. Name: ${err.name}, Message: ${err.message}, Stack: ${err.stack}`);
		}
		console.log("Hunter Worker: Finished scheduled run at " + new Date().toISOString());
	},

	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		console.log("Hunter Worker: Manual trigger received.");
		ctx.waitUntil(this.scheduled(null as any, env, ctx));
		return new Response("Hunter Worker manual run triggered successfully. Check logs for details.");
	},
};
