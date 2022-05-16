---
title: About HTTP-Post.
description: This is a post on My Blog about HTTP-Post.
date: 2022-03-01
tags:
  - HTTP
  - request
---
![http|100px](HTTP_logo.svg)
## Post
In computing, POST is a request method supported by HTTP used by the World Wide Web. By design, the POST request method requests that a web server accept the data enclosed in the body of the request message, most likely for storing it. It is often used when uploading a file or when submitting a completed web form.

In contrast, the HTTP GET request method retrieves information from the server. As part of a GET request, some data can be passed within the URL's query string, specifying (for example) search terms, date ranges, or other information that defines the query.

As part of a POST request, an arbitrary amount of data of any type can be sent to the server in the body of the request message. A header field in the POST request usually indicates the message body's Internet media type.  
## Posting data
The world wide Web and HTTP are based on a number of request methods or 'verbs', including POST and GET as well as PUT, DELETE, and several others. Web browsers normally use only GET and POST, but RESTful online apps make use of many of the others. POST's place in the range of HTTP methods is to send a representation of a new data entity to the server so that it will be stored as a new subordinate of the resource identified by the URI. For example, for the URI http://example.com/customers, POST requests might be expected to represent new customers, each including their name, address, contact details and so on. Early website designers strayed away from this original concept in two important ways. First, there is no technical reason for a URI to textually describe the web resource subordinate to which POST data will be stored. In fact, unless some effort is made, the last part of a URI will more likely describe the web application's processing page and its technology, such as http://example.com/applicationform.php. Secondly, given most web browsers' natural limitation to use only GET or POST, designers felt the need to re-purpose POST to do many other data submission and data management tasks, including the alteration of existing records and their deletion.

Efforts by some influential writers to remedy the first point began as early as 1998. Web application frameworks such as Ruby on Rails and others make it easier for designers to provide their users with semantic URLs. With regard to the second point, it is possible to use client-side scripting, or to write standalone apps, to make use of the other HTTP methods where they are relevant, but outside of this most web forms that submit or alter server data continue to use POST for the purpose.

That is not to say that every web form should specify method="post" in its opening tag. Many forms are used to specify more precisely the retrieval of information from the server, without any intention of altering the main database. Search forms, for example, are ideally suited to having method="get" specified.

There are times when HTTP GET is less suitable even for data retrieval. An example of this is when a great deal of data would need to be specified in the URL. Browsers and web servers can have limits on the length of the URL that they will handle without truncation or error. Percent-encoding of reserved characters in URLs and query strings can significantly increase their length, and while Apache HTTP Server can handle up to 4,000 characters in a URL, Microsoft Internet Explorer is limited to 2,048 characters in any URL. Equally, HTTP GET should not be used where sensitive information, such as usernames and passwords, have to be submitted along with other data for the request to complete. Even if HTTPS is used, preventing the data from being intercepted in transit, the browser history and the web server's logs will likely contain the full URL in plaintext, which may be exposed if either system is hacked. In these cases, HTTP POST should be used