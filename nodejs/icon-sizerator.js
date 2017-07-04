var http     = require('http');
var fs       = require('fs');
var rs       = require('randomstring');
var fm       = require('formidable');
var im       = require('imagemagick-native');
var util     = require('util');
var archiver = require('archiver');
var fsExtra  = require('fs-extra');
var async    = require('async');
var log      = require('custom-logger').config({
  level: 1,
  timestamp: "yyyy/mm/dd HH:MM:ss"
});

var installedPath = __dirname + "/";

http.createServer(function(req, res) {

  if (req.url == '/upload' && req.method.toLowerCase() == 'post') {

    var form = new fm.IncomingForm();

    form.parse(req, function(err, fields, files) {
    });

    var temp_path = '';
    var file_name = '';
    var new_location = '';
    var randomString = '';
    var sourceImage = '';

    async.waterfall([
      function(cb) {
        form.on('end', function(fields, files) {
          randomString = rs.generate(10);
          log.debug(randomString);

          if (this.openedFiles[0].type == "image/png") {
          } else if (this.openedFiles[0].type == "image/jpeg") {
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write("<html><head><title>Icon Sizerator</title></head><body>Please only submit PNG or JPEG images.</body></html>");
            res.end();

            log.error("Non-PNG or JPEG file caught. Advising user to only submit .png or .jpg files.");
            return;
          }

          temp_path = this.openedFiles[0].path;
          file_name = this.openedFiles[0].name;
          new_location = installedPath + 'uploads/' + randomString + '/';

          sourceImage = '';
          log.debug('Finished form open');
          cb();
        });
      },
      function(cb) {
        fsExtra.copy(temp_path, new_location + file_name, function(err) {
          if (err) {
            log.error(err);
          } else {
            log.info("File saved to " + new_location + file_name);
            sourceImage = new_location + file_name;
            log.debug(sourceImage);
            log.debug(randomString);
          }
          log.debug('Finished running fsExtra.copy');
          cb();
        });
      },
      function(cb) {

        var iconsNamesSizesDict = {
          "iphone-29.png" : 29,
          "iphone-40.png" : 40,
          "iphone-50.png" : 50,
          "iphone-57.png" : 57,
          "iphone-60.png" : 60,
          "iphone-72.png" : 72,
          "iphone-76.png" : 76,
          "iphone-29@2x.png" : 58,
          "iphone-40@2x.png" : 80,
          "iphone-50@2x.png" : 100,
          "iphone-57@2x.png" : 114,
          "iphone-60@2x.png" : 120,
          "iphone-72@2x.png" : 144,
          "iphone-76@2x.png" : 152,
          "iphone-29@3x.png" : 87,
          "iphone-40@3x.png" : 120,
          "iphone-50@3x.png" : 150,
          "iphone-57@3x.png" : 171,
          "iphone-60@3x.png" : 180,
          "iphone-72@3x.png" : 216,
          "iphone-76@3x.png" : 228,
          "android-ldpi.png" : 36,
          "android-mdpi.png" : 48,
          "android-hdpi.png" : 72,
          "android-xhdpi.png" : 96,
          "android-xxhdpi.png" : 144,
          "android-xxxhdpi.png" : 192
        };

        var outDir = installedPath + "uploads/" + randomString + "/";

        var header = {
          "Content-Type": "application/x-zip",
          "Pragma": "public",
          "Expires": "0",
          "Cache-Control": "private, must-revalidate, post-check=0, pre-check=0",
          "Content-disposition": 'attachment; filename="' + randomString + ".zip" + '"',
          "Transfer-Encoding": "chunked",
          "Content-Transfer-Encoding": "binary"
        };

        var zip = archiver('zip');

        res.writeHead(200, header);
        zip.store = true;  // don't compress the archive
        zip.pipe(res);

        for(var index in iconsNamesSizesDict) {
          fs.writeFileSync(outDir + index, im.convert({
            srcData: fs.readFileSync(sourceImage),
            width: iconsNamesSizesDict[index],
            height: iconsNamesSizesDict[index]
          }));
          log.debug(index + 'image resized.');

          zip.file(outDir + index, {
            name: index
          });
          log.debug('Added to zip');
        }

        log.info('Finished generating icons for ' + sourceImage);

        zip.finalize();
        log.info("Successfully delivered " + randomString + ".zip");

        cb();
      }
    ], function() {
      log.debug('All done!');
    });

    return;
  } else if (req.url == "/" || req.url == "/index.html") {
    res.writeHead(200, {
      'Content-Type': 'text/html'
    });
    res.end(fs.readFileSync(installedPath + 'public/icon-sizerator.html'));
    log.debug("Sent HTML.");
  } else if (req.url == "/icon-sizerator.css") {
    res.writeHead(200, {
      'Content-Type': 'text/css'
    });
    res.end(fs.readFileSync(installedPath + 'public/icon-sizerator.css'));
    log.debug("Sent CSS.");
  } else if (req.url == "/ei-image.svg") {
    res.writeHead(200, {
      'Content-Type': 'image/svg+xml'
    });
    res.end(fs.readFileSync(installedPath + 'public/ei-image.svg'));
    log.debug("Sent SVG.");
  } else if (req.url == "/ei-image.png") {
    res.writeHead(200, {
      'Content-Type': 'image/png'
    });
    res.end(fs.readFileSync(installedPath + 'public/ei-image.png'));
    log.debug("Sent PNG.");
  }

}).listen(3000, "127.0.0.1");
log.info('Started HTTP Server on localhost port 3000.');
