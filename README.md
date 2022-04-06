# Obsidian-11ty
This repository if platform for enabling your Obsidian's vaults (or just part of it) to the public using Github-Pages or inside your organization using Docker-container as server.


## How to publish the site using Github pages


## Running locally

### Install the modules

```
npm install
```

### Compile and run

```
npm run start
```

## How to publish the site using Docker
clone the repository
### Docker build 
from the main directory run:
```
docker build -t mysite .
```
### Docker run
From **PowerSell** cli run:
```
docker run -v ${pwd}:/app --name eleventizy -p 8080:8080 mysite
```


## Principals
### Notes VS Posts
#### Notes layouts
the notes layout is include objects as backlinks and support Obsidian's Wiki-links. the assumption is that the notes' names is uniqe and all of them will get the [parmalink]() as `'<yoursite's base path>/notes/<filename>/'`
##### Security 
The notes layout assume all your notes, as default should be **hide** unless you will check it in the frontmeter as "draft: false"
#### Posts layouts
The posts layouts links is `[Markdown-link]()`.  (and not [[Wiki-link]]) and the links is relative to the folder which the document located in.
##### Security 
The post layout assume all your notes, as default should be **seen** unless you will check it in the frontmeter as "draft: true"

## Where to locate the Obsidian's vault
### Notes vault
`/src/notes`
### Posts vault
`/src/posts`
## Menu
