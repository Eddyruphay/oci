export interface Env {
	HUNTER_KV: KVNamespace;
}

class LinkCollector {
  public linkCount = 0;
  constructor(private readonly env: Env) {}

  async element(element: Element) {
    const href = element.getAttribute('href');
    if (href && href.startsWith('/video')) {
      this.linkCount++;
      const fullUrl = `https://www.xvideos.com${href}`;
      console.log(`Found link: ${fullUrl}`);
      // Save the link to KV with a 7-day expiration
      await this.env.HUNTER_KV.put(fullUrl, new Date().toISOString(), { expirationTtl: 60 * 60 * 24 * 7 });
    }
  }
}

export default {
	async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
		console.log("Hunter Worker: Starting scheduled run...");
		try {
			const response = await fetch("https://www.xvideos.com", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
			console.log(`Hunter Worker: Fetched xvideos.com with status: ${response.status}`);

			if (!response.ok) {
				console.error(`Hunter Worker: Failed to fetch xvideos.com. Status: ${response.status}`);
				return;
			}

			const linkCollector = new LinkCollector(env);
			const htmlRewriter = new HTMLRewriter().on('div.thumb-block p > a', linkCollector);

			await htmlRewriter.transform(response).text();

      if (linkCollector.linkCount === 0) {
        console.log("Hunter Worker: No links found with the current selector.");
      } else {
        console.log(`Hunter Worker: Successfully processed ${linkCollector.linkCount} links.`);
      }

		} catch (error) {
			console.error("Hunter Worker: An error occurred during the scheduled run.", error);
		}
		console.log("Hunter Worker: Finished scheduled run.");
	},

	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		console.log("Hunter Worker: Manual trigger received.");
		ctx.waitUntil(this.scheduled(null as any, env, ctx));
		return new Response("Hunter Worker manual run triggered successfully. Check logs for details.");
	},
};
