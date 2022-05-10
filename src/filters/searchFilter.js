const elasticlunr = require("elasticlunr");

module.exports = function (collection) {
  // what fields we'd like our index to consist of
  var index = elasticlunr(function () {
    this.addField("title");
    this.addField("description");
    this.addField("tags");
    this.addField("date");
    this.setRef("id");

  });

  // loop through each page and add it to the index
  collection.forEach((page) => {
    index.addDoc({
      tags: page.template.frontMatter.data.tags,
      title: page.template.frontMatter.data.title,
      description: page.template.frontMatter.data.description,
      date: page.template.frontMatter.data.date,
      id: page.url

    });
  });

  return index.toJSON();
};
