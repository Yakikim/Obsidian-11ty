---
tags: [11ty, images,obsidian] 
date: 2022-04-24
title: Obsidian-11ty Images 
description: How to manage and include images to your site
---

## How to config your obsidian vault 
Under `Files & Links` define the `Default location for new attachments` attribute to be any value **exept** the `Same folder as current file` .  My definition and recomendation:  
![|90%?my definition](Pasted%20image%2020220424171759.png)
It's a perfect combination of manage privacy as well as lighting site and publish easily.
## mapping the attachments in .eleventy.js file
change the value of the variable `publishAttachementsDir` to contain the output directory. for exemple:
```js
const publishAttachementsDir = 'attch';
```
for every attachments directory you have to map it to the `_site/<publishAttachementsDir>` directory. 
So below this line you can add as many mapping as needded for your attachments folders you may like to share from your vault to your site.
It can be done through: 
```js
eleventyConfig.addPassthroughCopy({<fromDir>:<toDir>});
```
for example:
```js
eleventyConfig.addPassthroughCopy({"src/MyObsidian/public/attachments":`${publishAttachementsDir}`});
```
## Publish image to the site
In your note, you can include your image with the format `![alt|width?title](src)` for example:
![My Alt text|200px?This is the image](https://imgs.developpaper.com/guest/2019/01/logo.png)
```
![My Alt text|200px?This is the image](https://imgs.developpaper.com/guest/2019/01/logo.png)
```
Example from the local files (stayed at `src/MyObsidian/public/attachments`):
![My Hill sprints |100%?hill sprints graph ](msedge_0sbOL3eK3s.png)
```
![My Hill sprints |100%?hill sprints graph](msedge_0sbOL3eK3s.png)
```