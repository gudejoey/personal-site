import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";

export default function (eleventyConfig) {
  // static assets are copied to the output as they are (src/img holds uploads, including videos)
  for (const dir of ["svg", "css", "js"]) eleventyConfig.addPassthroughCopy(dir);
  eleventyConfig.addPassthroughCopy({ "src/img": "img" });

  // Every <img> in the built pages is resized into small WebP copies (400/800/1600px wide, never
  // upscaled) and given a srcset, so browsers download only the size they need. Templates write
  // image paths as "/img/…", which the plugin reads from src/img. Add eleventy:ignore to skip one.
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    formats: ["webp"],
    widths: [400, 800, 1600],
    urlPath: "/img/sized/",
    outputDir: "_site/img/sized/",
    htmlOptions: {
      imgAttributes: { loading: "lazy", decoding: "async", sizes: "(max-width: 600px) 100vw, 800px" }
    }
  });

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

  // content stores paths like "img/photo.jpg"; pages need "/img/photo.jpg" so the image plugin finds them
  eleventyConfig.addFilter("asset", s => (!s || /^(\/|https?:)/.test(s) ? s : "/" + s));

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
