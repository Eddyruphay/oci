export interface Env {
	HUNTER_KV: KVNamespace;
}

// A simple class to collect all the links
class LinkCollector {
  constructor(private readonly env: Env) {}
  
  async element(element: Element) {
    const href = element.getAttribute('href');
    if (href && href.startsWith('/video')) {
      const fullUrl = `https://www.xvideos.com${href}`;
      console.log(`Found link: ${fullUrl}`);
      // Save the link to KV with a 7-day expiration
      await this.env.HUNTER_KV.put(fullUrl, new Date().toISOString(), { expirationTtl: 60 * 60 * 24 * 7 });
    }
  }
}

export default {
	// The scheduled handler is triggered by a cron schedule
	async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
		console.log("Hunter Worker starting scheduled run...");
		
		const response = await fetch("https://www.xvideos.com");
		
		const htmlRewriter = new HTMLRewriter().on('div.thumb-block p > a', new LinkCollector(env));
		
		await htmlRewriter.transform(response).text();
		
		console.log("Hunter Worker finished scheduled run.");
	},

	// The fetch handler is useful for manual triggering and testing
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		console.log("Hunter Worker manually triggered.");
		ctx.waitUntil(this.scheduled(null as any, env, ctx));
		return new Response("Hunter Worker manual run triggered successfully.");
	},
};
