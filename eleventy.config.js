export default function (eleventyConfig) {
  // static assets are copied to the output as they are
  for (const dir of ["img", "svg", "css", "js"]) eleventyConfig.addPassthroughCopy(dir);

  // links to other sites written in Markdown (e.g. the About text) open in a new tab
  let markdown;
  eleventyConfig.amendLibrary("md", md => {
    markdown = md;
    const render = md.renderer.rules.link_open || ((t, i, o, e, self) => self.renderToken(t, i, o));
    md.renderer.rules.link_open = (tokens, i, opts, env, self) => {
      if (/^https?:\/\//.test(tokens[i].attrGet("href") || "")) {
        tokens[i].attrSet("target", "_blank");
        tokens[i].attrSet("rel", "noopener");
      }
      return render(tokens, i, opts, env, self);
    };
  });

  // Markdown fields inside front matter (e.g. a project section's text)
  eleventyConfig.addFilter("md", s => (s ? markdown.render(String(s)) : ""));

  // media lists can hold images or videos; decide by file extension
  eleventyConfig.addFilter("isVideo", f => /\.(mp4|webm|mov|m4v)$/i.test(f || ""));
  // drops media entries that have no file yet (e.g. a half-filled CMS row)
  eleventyConfig.addFilter("withFile", items => (items || []).filter(m => m && m.file));

  // "3 / 2" -> 1.5, used to size project columns so every cover image shares one height
  eleventyConfig.addFilter("ratio", r => {
    const [w, h] = String(r).split("/").map(Number);
    return +(w / h).toFixed(4);
  });

  eleventyConfig.addCollection("projects", api =>
    api.getFilteredByGlob("src/projects/*.md").sort((a, b) => (a.data.order ?? 99) - (b.data.order ?? 99)));

  return {
    dir: { input: "src", output: "_site" },
    markdownTemplateEngine: false, // project and About text is plain Markdown/HTML, not templates
    htmlTemplateEngine: "njk"
  };
}
