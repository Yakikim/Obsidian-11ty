const { DateTime } = require("luxon");
const slugify = require("@sindresorhus/slugify");
const fs = require("fs");
const pluginRss = require("@11ty/eleventy-plugin-rss");
const readingTime = require('eleventy-plugin-reading-time');
const pluginSyntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const pluginNavigation = require("@11ty/eleventy-navigation");
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const implicitFigures = require('markdown-it-image-figures');

const matter = require('gray-matter');

module.exports = function(eleventyConfig) {
	


    let markdownLib = markdownIt({
            breaks: true,
            html: true,
			linkify: true
        })
		
		.use(implicitFigures)
		.use(markdownItAnchor, {
    permalink: markdownItAnchor.permalink.ariaHidden({
      placement: "after",
      class: "external-link",
      symbol: "#",
      level: [1,2,3],
    }),
    slugify: eleventyConfig.getFilter("slug")
  })
        .use(require("markdown-it-footnote"))
		.use(function(markdownLib) {
        // Recognize Mediawiki links ([[text]])
        markdownLib.linkify.add("[[", {
            validate: /^\s?([^\[\]\|\n\r]+)(\|[^\[\]\|\n\r]+)?\s?\]\]/,
            normalize: match => {
                const parts = match.raw.slice(2,-2).split("|");
                parts[0] = parts[0].replace(/.(md|markdown)\s?$/i, "");
                match.text = (parts[1] || parts[0]).trim();
                match.url = `/notes/${parts[0].trim()}/`;
            }
        })
    })
        .use(function(md) {
            //https://github.com/DCsunset/markdown-it-mermaid-plugin
            const origFenceRule = md.renderer.rules.fence || function(tokens, idx, options, env, self) {
                return self.renderToken(tokens, idx, options, env, self);
            };
            md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
                const token = tokens[idx];
                if (token.info === 'mermaid') {
                    const code = token.content.trim();
                    return `<pre class="mermaid">${code}</pre>`;
                }
                if (token.info === 'transclusion') {
                    const code = token.content.trim();
                    return `<div class="transclusion">${md.render(code)}</div>`;
                }
                if (token.info.startsWith("ad-")) {
                    const code = token.content.trim();
                    return `<pre class="language-${token.info}">${md.render(code)}</pre>`;
                }
				if (token.info ==='dataview') {
                    const code = token.content.trim();
                    return `<pre class="language-${token.info}" style="visibility: hidden;">${md.render(code)}</pre>`;
                }

                // Other languages
                return origFenceRule(tokens, idx, options, env, slf);
            };



            const defaultImageRule = md.renderer.rules.image || function(tokens, idx, options, env, self) {
                return self.renderToken(tokens, idx, options, env, self);
            };
            md.renderer.rules.image = (tokens, idx, options, env, self) => {
                const imageName = tokens[idx].content;
                const [fileName, width] = imageName.split("|");
                if (width) {
                    const widthIndex = tokens[idx].attrIndex('width');
                    const widthAttr = `${width}px`;
                    if (widthIndex < 0) {
                        tokens[idx].attrPush(['width', widthAttr]);
                    } else {
                        tokens[idx].attrs[widthIndex][1] = widthAttr;
                    }
                }

                return defaultImageRule(tokens, idx, options, env, self);
            };


            const defaultLinkRule = md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
                return self.renderToken(tokens, idx, options, env, self);
            };
            md.renderer.rules.link_open = function(tokens, idx, options, env, self) {
                const aIndex = tokens[idx].attrIndex('target');
                const classIndex = tokens[idx].attrIndex('class');

                if (aIndex < 0) {
                    tokens[idx].attrPush(['target', '_self']); //can be  '_blanc']);
                } else {
                    tokens[idx].attrs[aIndex][1] = '_self';
                }

                if (classIndex < 0) {
                    tokens[idx].attrPush(['class', 'external-link']);
                } else {
                    tokens[idx].attrs[classIndex][1] = 'external-link';
                }

                return defaultLinkRule(tokens, idx, options, env, self);
            };
        });
    eleventyConfig.setLibrary("md", markdownLib);

    eleventyConfig.addTransform('link', function(str) {
        return str && str.replace(/\[\[(.*?)\]\]/g, function(match, p1) {
            const [fileName, linkTitle] = p1.split("|");

            let permalink = `/notes/${slugify(fileName)}`;
            const title = linkTitle ? linkTitle : fileName;

            try {
			const file = fs.readFileSync(`/notes/${fileName}.md`, 'utf8');
                const frontMatter = matter(file);
                if (frontMatter.data.permalink) {
                    permalink = frontMatter.data.permalink;
                }
            } catch {
                //Ignore if file doesn't exist
            }

            return `<a class="internal-link" href="${permalink}">${title}</a>`;
        });
    })


	//replace double brackets for notes:
const markdownItB = require('markdown-it');
    const markdownItOptionsB = {
        html: true,
        linkify: true
    };
    
    const mdB = markdownItB(markdownItOptionsB)
    .use(require('markdown-it-footnote'))
    .use(require('markdown-it-attrs'))
    .use(function(mdB) {
        // Recognize Mediawiki links ([[text]])
        mdB.linkify.add("[[", {
            validate: /^\s?([^\[\]\|\n\r]+)(\|[^\[\]\|\n\r]+)?\s?\]\]/,
            normalize: match => {
                const parts = match.raw.slice(2,-2).split("|");
                parts[0] = parts[0].replace(/.(md|markdown)\s?$/i, "");
                match.text = (parts[1] || parts[0]).trim();
                match.url = `/notes/${parts[0].trim()}/`;
            }
        })
    })
	
    eleventyConfig.setLibrary('mdB', mdB);
	
       
    eleventyConfig.addFilter("markdownify", string => {
        return mdB.render(string)
    })

	


    eleventyConfig.addTransform('highlight', function(str) {
        //replace ==random text== with <mark>random text</mark>
        return str && str.replace(/\=\=(.*?)\=\=/g, function(match, p1) {
            return `<mark>${p1}</mark>`;
        });
    });

  // Alias so just put `layout: post` and no need to write the full path `layout: layouts/post.njk` 
 eleventyConfig.addLayoutAlias("post", "layouts/post.njk"); 
 //eleventyConfig.addLayoutAlias("notes", "layouts/notes.njk");
// Aliases for the personal notes 
 eleventyConfig.addLayoutAlias("dafyomi", "personal/dafyomi.njk");
 eleventyConfig.addLayoutAlias("general_hebrew", "personal/hebrew.njk");
 eleventyConfig.addLayoutAlias("note", "personal/note.njk");
 eleventyConfig.addLayoutAlias("mynote", "personal/note.njk");
 eleventyConfig.addFilter('excerpt', (post) => {
    const content = post.replace(/(<([^>]+)>)/gi, '');
    return content.substr(0, content.lastIndexOf(' ', 200)) + '...';
  });
  
  eleventyConfig.addPlugin(readingTime);
//-------------------------------------------

  // Copy the `img` and `css` folders to the output
  eleventyConfig.addPassthroughCopy("css");
  // Copy the relative img dir to img
  // eleventyConfig.addPassthroughCopy({"src/posts/img": "img"});
  
  // Add plugins
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(pluginSyntaxHighlight);
  eleventyConfig.addPlugin(pluginNavigation);



  eleventyConfig.addFilter("readableDate", dateObj => {
    return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toFormat("dd LLL yyyy");
  });

  // https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
  eleventyConfig.addFilter('htmlDateString', (dateObj) => {
    return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toFormat('yyyy-LL-dd');
  });

  // Get the first `n` elements of a collection.
  eleventyConfig.addFilter("head", (array, n) => {
    if(!Array.isArray(array) || array.length === 0) {
      return [];
    }
    if( n < 0 ) {
      return array.slice(n);
    }

    return array.slice(0, n);
  });

  // Return the smallest number argument
  eleventyConfig.addFilter("min", (...numbers) => {
    return Math.min.apply(null, numbers);
  });



  
  function filterTagList(tags) {
    return (tags || []).filter(tag => ["all", "nav", "post","posts","notes"].indexOf(tag) === -1);
  }

  eleventyConfig.addFilter("filterTagList", filterTagList)

  // Create an array of all tags
  eleventyConfig.addCollection("tagList", function(collection) {
    let tagSet = new Set();
    collection.getAll().forEach(item => {
      (item.data.tags || []).forEach(tag => tagSet.add(tag));
    });

    return filterTagList([...tagSet]);
  });

/*
  function filterNotesTagList(ntags) {
    return (ntags || []).filter(tag => ["all", "nav","john", "John", "post", "APEX"].indexOf(tag) === -1);
  }

//for notes tags
  eleventyConfig.addFilter("filterNotesTagList", filterNotesTagList)

  // Create an array of all tags
  eleventyConfig.addCollection("NotestagList", function(collection) {
    let tagSet = new Set();
    collection.getAll().forEach(item => {
      (item.data.tags || []).forEach(tag => tagSet.add(tag));
    });

    return filterNotesTagList([...tagSet]);
  });
  */


  // Override Browsersync defaults (used only with --serve)
  eleventyConfig.setBrowserSyncConfig({
    callbacks: {
      ready: function(err, browserSync) {
        const content_404 = fs.readFileSync('_site/404.html');

        browserSync.addMiddleware("*", (req, res) => {
          // Provides the 404 content without redirect.
          res.writeHead(404, {"Content-Type": "text/html; charset=UTF-8"});
          res.write(content_404);
          res.end();
        });
      },
    },
    ui: false,
    ghostMode: false
  });

  return {
    // Control which files Eleventy will process
    // e.g.: *.md, *.njk, *.html, *.liquid
    templateFormats: [
      "md",
      "njk",
      "html",
      "liquid", 
	  "11ty.js",
	  "jpeg",
	  "jpg",
	  "png"
    ],

    // Pre-process *.md files with: (default: `liquid`)
    markdownTemplateEngine: "njk",

    // Pre-process *.html files with: (default: `liquid`)
    htmlTemplateEngine: "njk",

    // -----------------------------------------------------------------
    // If your site deploys to a subdirectory, change `pathPrefix`.
    // Don’t worry about leading and trailing slashes, we normalize these.

    // If you don’t have a subdirectory, use "" or "/" (they do the same thing)
    // This is only used for link URLs (it does not affect your file structure)
    // Best paired with the `url` filter: https://www.11ty.dev/docs/filters/url/

    // You can also pass this in on the command line using `--pathprefix`

    // Optional (default is shown)
    pathPrefix: "/",
    // -----------------------------------------------------------------

    passthroughFileCopy: true,
    // These are all optional (defaults are shown):
    dir: {	  
	  input: 'src',
      includes: '_includes',
      data: '_data',
      output: '_site',
    }
  };
};