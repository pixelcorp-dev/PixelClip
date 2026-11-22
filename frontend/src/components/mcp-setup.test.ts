import { expect, it } from "vitest";

import { mcpSnippets } from "./mcp-setup";

it("keeps the key out of the URL in every snippet", () => {
  const url = "http://localhost:9100/mcp";
  const snippets = mcpSnippets(url, "sk_test");
  expect(snippets.claudeCode).toBe(
    'claude mcp add --transport http pixelclip http://localhost:9100/mcp --header "Authorization: Bearer sk_test"',
  );
  expect(JSON.parse(snippets.json).mcpServers.pixelclip).toEqual({
    url,
    headers: { Authorization: "Bearer sk_test" },
  });
  const desktop = JSON.parse(snippets.claudeDesktop).mcpServers.pixelclip;
  expect(desktop.args).toContain(url);
  expect(desktop.env.PIXELCLIP_AUTH).toBe("Bearer sk_test");
  expect(snippets.stdio).toContain("PIXELCLIP_API_KEY=sk_test");
});
