var dotenv = require('dotenv');
dotenv.load();
var port = 3001;

var colors = require('colors');
var compression = require('compression');
var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var marked = require('marked');
var moment = require('moment');
var request = require('request');
var watch = require('node-watch');
var app = express();

app.use(compression());
app.use("/client", express.static(__dirname+"/client"))
app.use("/css", express.static(__dirname+'/client/css'));
app.use("/img", express.static(__dirname+'/client/img'));
app.use("/js", express.static(__dirname+'/client/js'));
app.use("/doc", express.static(__dirname+'/client/doc'));
app.use(bodyParser.json({extended:true}));
app.use(bodyParser.urlencoded({extended:true}));

marked.setOptions({
  gfm: true,
  tables: true,
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

var walk = function(dir, done) {
    var results = [];
    fs.readdir(dir, function(err, list) {
      if (err) return done(err);
      var i = 0;
        (function next() {
      var file = list[i++];
      if (!file) return done(null, results);
      file = dir + '/' + file;
      fs.stat(file, function(err, stat) {
          if (stat && stat.isDirectory()) {
              walk(file, function(err, res) {
                results = results.concat(res);
                next();
            });
          } else {
              results.push(file);
              next();
          }
          });
        })();
  });
};

function refJSON() {
    walk(__dirname+"/_posts", function (e, r) {
      var j = {};
      r.splice(r.length-1, 1); // remove 404.md (hope that know one will be still using this in the year 4000)
      for (var i = 0; i < r.length; i++) {
        var d = fs.readFileSync(r[i], "utf-8");
        var metaDataStart = d.indexOf("---START_METADATA---");
        var metaDataEnd = d.indexOf("---END_METADATA---");
        var jstart = d.substr(metaDataStart, metaDataEnd).indexOf("{");
        var metadataStr = d.substr(jstart, metaDataEnd-jstart);
        var metadata = JSON.parse(metadataStr); // object of metadata parsed out of markdown file
        j[r[i].split("/")[r[i].split("/").length-1].substr(11, r[i].length-14)] = {"title": metadata.title, "summary": metadata.summary};
      }

      fs.writeFile(__dirname + "/ref.json", JSON.stringify(j));
    });
}

watch(__dirname + "/_posts", function (filename) {
  fs.readFile(__dirname+"/ref.json", 'utf-8', function (e, d) {
    refJSON();
  });
});

app.get('/', function (req, res) {
  res.setHeader('Content-Type', 'text/html');
  walk(__dirname + "/_posts", function (e, r) {
    r.splice(r.length-1, 1); // remove 404.md
    console.log(r);
    // retrieve the template
    fs.readFile(__dirname+"/client/index.html", 'utf-8', function (err, fileData) {
      if (err) {
        console.log("There was an error serving the article template file.".red);
        res.send("An error occurred.");
      } else {
        fs.readFile(__dirname+"/ref.json", "utf-8", function (error, ref) {
          ref = JSON.parse(ref);

          // populate template with data
          var htmlData = [];
          for (var j = 0; j < r.length; j++) {
            r[j] = r[j].split("/")[r[j].split("/").length-1];
            var slug = r[j].substr(11, r[j].length-14);
            var time = moment(r[j].substr(0, 10), ["YYYY-MM-DD"]).format("LL");
            var k = slug + ".md";
            htmlData.unshift('<div class="story"><a href="/'+slug+'">'+ref[k].title+'</a><span class="date">'+time+'</span><span class="description">'+ref[k].summary+'</span></div>');
          }

          var name = "Blog Name";
          fileData = fileData.replace(/{AUTHOR-NAME}/g, name);
          fileData = fileData.replace(/{CLASS-STORY-SECTION}/g, htmlData.join(""));
          res.send(fileData);
        });
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
      // searches for all of the markdown posts and returns an array sorted by date
      walk(__dirname + "/_posts", function (e, results) {
        var ix = -1;
        for (var i = 0; i < results.length; i++) {
          results[i] = results[i].split("/")[results[i].split("/").length-1]
          if (req.params.uid == results[i].substr(11, results[i].length-14)) {
            ix = i;
            break;
          }
        }
        var md = ix !== -1 ? results[ix] : "404.md";
        var time = moment(md.substr(0, 10), ["YYYY-MM-DD"]).format("LL");

        fs.readFile(__dirname + "/_posts/" + md, 'utf-8', function (error, markdown) {
          var metaDataStart = markdown.indexOf("---START_METADATA---");
          var metaDataEnd = markdown.indexOf("---END_METADATA---");
          var jstart = markdown.substr(metaDataStart, metaDataEnd).indexOf("{");
          var metadataStr = markdown.substr(jstart, metaDataEnd-jstart);
          var metadata = JSON.parse(metadataStr); // object of metadata parsed out of markdown file
          markdown = markdown.substr(metaDataEnd+"---END_METADATA---".length, markdown.length); // everything after the metadata
          marked(markdown, function (err, content) {
            if (err) throw err;

            var wordCount = content.split(" ").length;
            var timeToRead = Math.ceil(wordCount / 200);
            var title = metadata.title;
            var date = 'By <a href="/">'+metadata.author + '</a> &#183; ' + time + ' &#183; ' + timeToRead + " min read";
            var name = "Blog Name";
            fileData = fileData.replace(/{AUTHOR-NAME}/g, name);
            fileData = fileData.replace(/{ARTICLE-TITLE}/g, title);
            fileData = fileData.replace(/{ARTICLE-DATE}/g, date);
            fileData = fileData.replace(/{ARTICLE-CONTENT}/g, content);
            res.send(fileData);
          });

        });

      });

    }
  });
});


app.listen(port, function () {
  refJSON();
  console.log(('Blog server running at localhost:'+port).blue);
});
