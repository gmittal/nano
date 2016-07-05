```
________   ________  ________   ________     
|\   ___  \|\   __  \|\   ___  \|\   __  \    
\ \  \\ \  \ \  \|\  \ \  \\ \  \ \  \|\  \   
 \ \  \\ \  \ \   __  \ \  \\ \  \ \  \\\  \  
  \ \  \\ \  \ \  \ \  \ \  \\ \  \ \  \\\  \
   \ \__\\ \__\ \__\ \__\ \__\\ \__\ \_______\
    \|__| \|__|\|__|\|__|\|__| \|__|\|_______|
```                                           

Super simple blogging setup.

### Features
- Quick set up
- Markdown support
- Syntax highlighting
- Easy to customize and hack

### BYOB (Build Your Own Blog)
Clone the repository.
```shell
$ git clone https://github.com/gmittal/nanoblog
```

Populate ```config.json``` with your information.
```javascript
{
    "name": "Awesome Blog",
    "description": "Not your average (Jekyll) blog. Written using the real dev language.",
    "dateFormat": "YYYY-MM-DD",
    "listTemplate": "<div class=\"story\"><a href=\"/{POST-SLUG}\">{POST-TITLE}</a><span class=\"date\">{POST-TIME}. {POST-DESCRIPTION}</span></div>",
    "disqusCommentLink": "yourown.disqus.com"
}
```

Write some markdown with ```{config.dateFormat}-post-name.md``` file name format. Put it in the ```_posts``` directory. Add post metadata to the beginning of each post like so:
```
---START_METADATA---
{
  "title": "POST TITLE",
  "author": "YOUR NAME",
  "summary": "Not your average blog post.",
  "tags":[
    "me",
    "awesome"
  ]
}
---END_METADATA---
WRITE YOUR MARKDOWN POST CONTENT HERE
```

Serve the blog.
```
$ node app.js
```

_Customize!_ Hack the frontend the way you want it in ```client``` directory, or change ```app.js``` to match your needs.

### License
The MIT License ([MIT](https://tldrlegal.com/license/mit-license))

Copyright (c) 2016 [Gautam Mittal](http://git.io/gautam)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
