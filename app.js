var dotenv = require('dotenv');
dotenv.load();
var port = 3001;

var colors = require('colors');
var compression = require('compression');
var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var marked = require('marked');
var request = require('request');
var app = express();

app.use(compression());
app.use("/client", express.static(__dirname+"/client"))
app.use("/css", express.static(__dirname+'/client/css'));
app.use("/img", express.static(__dirname+'/client/img'));
app.use("/js", express.static(__dirname+'/client/js'));
app.use("/doc", express.static(__dirname+'/client/doc'));
app.use("/article/css", express.static(__dirname+'/client/css'));
app.use("/article/img", express.static(__dirname+'/client/img'));
app.use("/article/js", express.static(__dirname+'/client/js'));
app.use("/article/doc", express.static(__dirname+'/client/doc'));
app.use(bodyParser.json({extended:true}));
app.use(bodyParser.urlencoded({extended:true}));

marked.setOptions({
  gfm: true,
  highlight: function (code, lang, callback) {
    require('pygmentize-bundled')({ lang: lang, format: 'html' }, code, function (err, result) {
      callback(err, result.toString());
    });
  }
});

function randNumericKey() {
  var n = new Date().getUTCMilliseconds()*Math.random()*Math.random()*Math.random();
  return n;
}

app.get('/', function (req, res) {
  res.setHeader('Content-Type', 'text/html');
  fs.readFile(__dirname + "/blog.json", 'utf-8', function (e, f) {
    var b = JSON.parse(f);
    // retrieve the template
    fs.readFile(__dirname+"/client/index.html", 'utf-8', function (err, fileData) {
      if (err) {
        console.log("There was an error serving the article template file.".red);
        res.send("An error occurred.");
      } else {
        // populate template with data
        var htmlData = [];
        var blogJSON = b.posts;
        for (var i = 0; i < blogJSON.length; i++) {
          htmlData.unshift('<div class="story"><a href="/'+blogJSON[i].slug+'">'+blogJSON[i].title+'</a><span class="date">'+blogJSON[i].date+'</span><span class="description"></span></div>')
        }

        fileData = fileData.replace(/{CLASS-STORY-SECTION}/g, htmlData.join(""));
        res.send(fileData);
      }
    });
  });


});

// Read articles from other publishers "hosted" on the news site
app.get('/:uid', function (req, res) {
  res.setHeader('Content-Type', 'text/html');
  fs.readFile(__dirname+"/client/article.html", 'utf-8', function (err, fileData) {
		if (err) {
      console.log("There was an error serving the article template file.".red);
			res.send("An error occurred.");
		} else {
      fs.readFile(__dirname+"/blog.json", 'utf-8', function (e, f) {
        var ix = 0;
        var md = "";
        for (var i = 0; i < JSON.parse(f).posts.length; i++) {
            if (JSON.parse(f).posts[i].slug == req.params.uid) {
              ix = i;
              md = JSON.parse(f).posts[i]["file"];
              break;
            }
        }

        fs.readFile(__dirname + "/" + md, 'utf-8', function (error, markdown) {
          var title = JSON.parse(f).posts[ix]["title"];//JSON.parse(f)["title"];
          var date = JSON.parse(f).posts[ix]["date"];//JSON.parse(f)["date"]; //articleData.date() + " published by " + articleData.publisher(); //months[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
          var content = marked(markdown);
          console.log(content);
          fileData = fileData.replace(/{ARTICLE-TITLE}/g, title);
          fileData = fileData.replace(/{ARTICLE-DATE}/g, date);
          fileData = fileData.replace(/{ARTICLE-CONTENT}/g, content);
          res.send(fileData);
        });

      });
    }
  });
});


app.post('/registerArticle', function (req, res) {
  var uid = req.body.uid;
  db.child(uid).set(req.body.url);
  res.send(uid);
});

app.post('/makeArticle', function (req, res) {
  var uid = req.body.uid;
  request(req.body.url, function(er, re, bd) {
      var articleData = unfluff.lazy(bd, "en");
      var j = {
        "url": "/article/"+uid,
        "image": articleData.image(),
        "date": articleData.date(),
        "title": articleData.title(),
        "description": typeof articleData.description() !== "undefined" ? articleData.description() : articleData.text().substring(0, 139),
        "body": articleData.text()
      };
      db.child(uid).set(j);
      res.send(uid);
  });
});

app.listen(port, function () {
  console.log('News server successfully running on localhost:3000'.blue);
});
