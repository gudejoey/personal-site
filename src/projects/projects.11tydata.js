// Every file in this folder is a project: it uses the project layout and is published
// as <file name>.html, e.g. helmet.md -> helmet.html
export default {
  layout: "project.njk",
  permalink: data => `${data.page.fileSlug}.html`
};
