require('dotenv').config();
const { Octokit } = require("@octokit/core");
const githubToken = process.env.GH_TOKEN;
const octokit = new Octokit({ auth: githubToken });
const markdownIt = require("markdown-it");
const md = markdownIt({
    html: true,
}).use(function(md) {
   //https://github.com/DCsunset/markdown-it-mermaid-plugin
    const origRule = md.renderer.rules.fence.bind(md.renderer.rules);
    md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
        const token = tokens[idx];
        if (token.info === 'mermaid') {
            const code = token.content.trim();
            return `<pre class="mermaid">${code}</pre>`;
        }

        // Other languages
        return origRule(tokens, idx, options, env, slf);
    };
});

module.exports = async function() {
    if (!process.env.ENABLE_VERSION_HISTORY) {
        return [];
    }
    //list all files
    const postsfolder = 'posts';
    const notesFolder = 'notes';
    const fs = require('fs');

    const filesnotes = fs.readdirSync(notesFolder).filter(file => file.endsWith(".md")).map(file => notesFolder + '/' + file);    
	const filesposts = fs.readdirSync(postsfolder).filter(file => file.endsWith(".md")).map(file => postsfolder + '/' + file);
	const unified = filesnotes + filesposts;
    const notes = [];
    for (const filePath of files) {
        const fileCommits = await octokit.request(`GET /repos/{owner}/{repo}/commits?path=${encodeURI(filePath)}`, {
            owner: process.env.GH_USERNAME,
            repo: process.env.GH_REPO_NAME
        })
        if (filePath.indexOf("digital garden") > -1) {
            console.log(fileCommits);
        }
        for (const commit of fileCommits.data) {

            const sha = commit.sha
            const fileData = await octokit.request(`GET /repos/{owner}/{repo}/contents/${encodeURI(filePath)}?ref=${sha}`, {
                owner: process.env.GH_USERNAME,
                repo: process.env.GH_REPO_NAME
            });
            const content = Buffer.from(fileData.data.content, 'base64').toString('utf8');
            const segments = filePath.split("/");
            const name = segments[segments.length - 1].replace(".md", "");
            const date = commit.commit.author.date;
            let markdown = ''
            try {
                markdown = md.render(content);
            } catch (e) {
                console.log(e);
            }
            const note = { content: markdown, title: name, fullTitle: name + " - " + sha, sha: sha, date: date };

            notes.push(note);
        }

    }

    return notes;
}