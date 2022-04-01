---
layout: mynote
cssclasses: ltr
draft: true
permalink: /notes/apex/
---
# APEX
[[home]]/[[Open University]]

- [[2021-07-12N2 - Remote APEX Administration Page |Main infrastructure configuration]]
````ad-menu
title: Infrastructure
```dataview
table  file.mtime as "Last Update" 
from  #infrastructures or #Infrastractures or #infrastructure or #infrastracture or #op/apex/infrastractures or #op/apex/infrastructures 
SORT file.mtime desc
```
````

---


````ad-menu
title: Management

```dataview
table  file.mtime as "Last Update"
from #apex and (#management or #op/apex/management )
SORT file.mtime desc
```
````
---

````ad-menu
title: Other

```dataview
table  file.mtime as "Last Update"
from #apex and !(( #management or #op/apex/management ) or (#infrastructures or #Infrastractures or #infrastructure or #infrastracture or #op/apex/infrastractures or #op/apex/infrastructures ))
SORT file.mtime desc
```
````
---




