const {titleCase} = require("title-case");
const {convert} = require('html-to-text');

// This regex finds all wikilinks in a string
const wikilinkRegExp = /\[\[\s?([^\[\]\|\n\r]+)(\|[^\[\]\|\n\r]+)?\s?\]\]/g

function caselessCompare(a, b) {
    return a.toLowerCase() === b.toLowerCase();
}

	

module.exports = {
    layout: "personal/note.njk",
    type: "note",
    eleventyComputed: {
		 permalink(data) {
      // If the page is in `draft:true` mode, don't write it to disk...
      if (data.draft) {
        return false;
      }
      // Return the original value (which could be `false`, or a custom value,
      // or default empty string).
      return data.permalink;
    },
    eleventyExcludeFromCollections(data) {
      // If the page is in `draft:true` mode, or has `permalink:false` exclude
      // it from any collections since it shouldn't be visible anywhere.
      if (data.draft || data.permalink === false) {
        return true;
	  } 
      return data.eleventyExcludeFromCollections;
    },
        title: data => titleCase(data.title || data.page.fileSlug),
        backlinks: (data) => {
            const notes = data.collections.notes;
            const currentFileSlug = data.page.filePathStem.replace('/notes/', '');

            let backlinks = [];
			let preview ='';
            // Search the other notes for backlinks
            for(const otherNote of notes) {
                const noteContent = otherNote.template.frontMatter.content;
                   
                // Get all links from otherNote
                const outboundLinks = (noteContent.match(wikilinkRegExp) || [])
                    .map(link => (
                        // Extract link location
                        link.slice(2,-2)
                            .split("|")[0]
                            .replace(/.(md|markdown)\s?$/i, "")
                            .trim()
                    ));

                // If the other note links here, return related info
                if(outboundLinks.some(link => caselessCompare(link, currentFileSlug))) {

                    // Construct preview for hovercards
					preview = convert(otherNote.data.description || noteContent);
					preview = preview.substr(0, preview.lastIndexOf(' ', 130)) + '...';//.slice(0, 240);
                    backlinks.push({
                        url: otherNote.url,
                        title: otherNote.data.title,
                        preview
                    })
                }
            }

            return backlinks;
        }
    }
}