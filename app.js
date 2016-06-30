var dotenv = require('dotenv');
dotenv.load();
var port = 3000;

var colors = require('colors');
var compression = require('compression');
var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var request = require('request');
var unfluff = require('unfluff');
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

function randNumericKey() {
  var n = new Date().getUTCMilliseconds()*Math.random()*Math.random()*Math.random();
  return n;
}

app.get('/', function (req, res) {
  res.setHeader('Content-Type', 'text/html');
  db.once("value", function (snapshot) {
      var curDBJSON = snapshot.val();
      request('https://www.reddit.com/r/indianews/.json', function (e, r, b) {
        if (!e && r.statusCode == 200) {
          var articles = []
          var d = JSON.parse(b);
          for (var i = 0; i < d.data.children.length; i++) {
            if ((d.data.children[i].data.url).indexOf("reddit") == -1) {
              var uid = randNumericKey().toString().replace(".", "");
              for (var articleKey in curDBJSON) {
                if (d.data.children[i].data.url == curDBJSON[articleKey]) {
                  uid = articleKey
                }
              }

              request.post({url:'http://localhost:3000/registerArticle', form: {"url":d.data.children[i].data.url, "uid": uid}});
              var j = {};
              var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
              var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
              var date = new Date(parseInt(d.data.children[i].data.created, 10)*1000);
              j["url"] ="/article/"+uid;
              j["origin"] = d.data.children[i].data.url;
              j["title"] = d.data.children[i].data.title;
              j["created"] = days[date.getDay()] + ", " + months[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
              j["domain"] = d.data.children[i].data.domain;
              articles.push(j);
            }
          }

          // retrieve the template
          fs.readFile(__dirname+"/client/index.html", 'utf-8', function (err, fileData) {
            if (err) {
              console.log("There was an error serving the article template file.".red);
              res.send("An error occurred.");
            } else {
              // populate template with data
              var htmlData = [];
              for (var i = 0; i < articles.length; i++) {
                htmlData.push('<div class="story"><a href="'+articles[i].url+'">'+articles[i].title+'</a><span class="date">'+articles[i].created+' ('+ articles[i].domain +')</span><span class="description"></span></div>')
              }


              fileData = fileData.replace(/{CLASS-STORY-SECTION}/g, htmlData.join(""));
              res.send(fileData);
            }
          });

        } else {
          res.send({"Error": "Failed to retrieve articles."});
        }
      });
    }); // end db query
});

// Read articles from other publishers "hosted" on the news site
app.get('/article/:uid', function (req, res) {
  res.setHeader('Content-Type', 'text/html');
  fs.readFile(__dirname+"/client/article.html", 'utf-8', function (err, fileData) {
		if (err) {
      console.log("There was an error serving the article template file.".red);
			res.send("An error occurred.");
		} else {
      // grab the article data using some API
      // The first time someone accesses an article, the content gets scraped and saved to the firebase.
      // This allows future requests to the same article to be much faster.
      db.child(req.params.uid).once('value', function(s) {
        var url = s.val();
        if (typeof url == "string") {
            request({ uri: url , headers: { "User-Agent": "Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410."}}, function (error, response, body) {
              if (!error && response.statusCode == 200) {
                articleData = unfluff.lazy(body, 'en');

                var title = articleData.title();
                // var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                // var d = new Date(articleData.published);
                var date = articleData.date() + " published by " + articleData.publisher(); //months[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
                var content = '<img src="'+articleData.image()+'" /><br /><br />'+articleData.text()+'<br /><br /><a href="'+url+'" style="margin-left:0px;">Read Original Article</a><br />';

                db.child(req.params.uid).set({"title": title, "date": date, "body": content}); // cache it for later

                fileData = fileData.replace(/{ARTICLE-TITLE}/g, title);
                fileData = fileData.replace(/{ARTICLE-DATE}/g, date);
                fileData = fileData.replace(/{ARTICLE-CONTENT}/g, content);
                res.send(fileData);
              }
            });
        } else { // nasty looking code
          var title = url !== null ? url.title : "Unavailable content"; // placeholder since the Firebase sometimes scrapes missing info
          var date = url !== null ? url.date : "Today";
          var content = url !== null ? url.body : "Content is unavailable.";
          fileData = fileData.replace(/{ARTICLE-TITLE}/g, title);
          fileData = fileData.replace(/{ARTICLE-DATE}/g, date);
          fileData = fileData.replace(/{ARTICLE-CONTENT}/g, content);
          res.send(fileData);
        }
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

app.get('/api/getArticles', function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  request('https://www.reddit.com/r/indianews/.json', function (e, r, b) {
    if (!e && r.statusCode == 200) {
      var articles = []
      var d = JSON.parse(b);
      for (var i = 0; i < d.data.children.length; i++) {
        if ((d.data.children[i].data.url).indexOf("reddit") == -1) {
          var uid = randNumericKey().toString().replace(".", "");
          request.post({url:'http://localhost:3000/registerArticle', form: {"url":d.data.children[i].data.url, "uid": uid}});
          var j = {};
          j["/article/"+uid] = d.data.children[i].data.url;
          articles.push(j);
        }
      }

      res.send(articles);

    } else {
      res.send({"Error": "Failed to retrieve articles."});
    }
  });
});

app.listen(port, function () {
  console.log('News server successfully running on localhost:3000'.blue);
});
