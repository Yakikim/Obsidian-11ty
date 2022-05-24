
(function (window, document) {
  "use strict";

  const search = (e) => {
    const results = window.searchIndex.search(e.target.value, {
      bool: "OR",
      expand: true,
    });

    const resEl = document.getElementById("searchResults");
    const noResultsEl = document.getElementById("noResultsFound");

    resEl.innerHTML = "";
    if (results) {
      noResultsEl.style.display = "none";
      results.map((r) => {
        const { id, title, description } = r.doc;
        const el = document.createElement("li");
        resEl.appendChild(el);

        const h4 = document.createElement("h4");
        el.appendChild(h4);

        const a = document.createElement("a");
        a.setAttribute("href", id);
        a.textContent = title;
        h4.appendChild(a);

        const p = document.createElement("p");
        p.textContent = description;
        el.appendChild(p);
      });
    } else {
      noResultsEl.style.display = "block";
    }
  };

  fetch("/search-index.json").then((response) =>
    response.json().then((rawIndex) => {
      window.searchIndex = elasticlunr.Index.load(rawIndex);
      document.getElementById("searchField").addEventListener("input", search);
    })
  );
})(window, document);