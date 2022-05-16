---
tags: [ords, source, options, rest] 
date: 2018-01-24
title: ORDS - Source type options
description: The source types options based on oracle documentations
---
## The options of source types

Defines the source implementation for the selected HTTP method.

Options include:

-   **Collection Query** - Executes a SQL query and transforms the result set into an ORDS Standard JSON representation. Available when the HTTP method is GET. Result Format: JSON
-   **Collection Query Item** - Executes a SQL query returning one row of data into a ORDS Standard JSON representation. Available when the HTTP method is GET. Result Format: JSON
-   **PL/SQL** - Executes an anonymous PL/SQL block and transforms any OUT or IN/OUT parameters into a JSON representation. The htp.p function may also be used to emit custom JSON. Result Format: JSON
-   **Media Resource** - Executes a SQL Query conforming to a specific format and turns the resultset into a binary representation with an accompanying HTTP Content-Type header identifying the internet media type of the representation. The format of the SQL query should be:
```sql
    SELECT 'content_type', column FROM . . .
```
> where _'content\_type'_  is a string passed to the browser to be used to identify the incoming data, for example _'image/jpeg'_, and _column_ is the name of the column containing the source of the data being sent back. The Media Resource Source type is typically used for media objects, such as images, where the data will be directly handled by the recipient making the call.
    

  

**NOTE:** The following are considered deprecated as they represent options specific to APEX Based REST Services.

-   **Query** - Executes a SQL query and transforms the result set into either an ORDS legacy JavaScript Object Notation (JSON) or CSV representation, depending on the format selected. Available when the HTTP method is GET. Result Format: JSON or CSV
-   **Query One Row** - Executes a SQL query returning one row of data into an ORDS legacy JSON representation. Available when the HTTP method is GET. Result Format: JSON
-   **Feed** - Executes a SQL query and transforms the results into a JSON Feed representation. Each item in the feed contains a summary of a resource and a hyperlink to a full representation of the resource. The first column in each row in the result set must be a unique identifier for the row and is used to form a hyperlink of the form: _path/to/feed/{id}_, with the value of the first column being used as the value for _{id}_. The other columns in the row are assumed to summarize the resource and are included in the feed. A separate resource template for the full representation of the resource should also be defined. Result Format: JSON