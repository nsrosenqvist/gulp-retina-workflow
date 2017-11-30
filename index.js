"use strict";

const PLUGIN_NAME = 'gulp-retina-workflow';
const PLUGIN_DEBUG = false;

// Globals
var gm = require('gm').subClass({ imageMagick: true });
var through = require('through2');
var sizeOf = require('image-size');
var vinylSource = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var path = require('path');
var fs = require('fs');
var defaults = require('defaults');
var PluginError = require('gulp-util').PluginError;

// Main
module.exports = function (args) {
  debug(PLUGIN_NAME);

  // Process options (set defaults)
  const options = defaults(args || {}, {
    flags: [
      {suffix: '@1x', scale: 1, suffixOut: ''},
      {suffix: '@2x', scale: 2, suffixOut: '@2x'},
      {suffix: '@3x', scale: 3, suffixOut: '@3x'},
      {suffix: '@4x', scale: 4, suffixOut: '@4x'},
    ],
    extensions: ['jpg', 'jpeg', 'png'],
    roundUp: true,
    quality: 1
  });

  // Handle file in stream
  return through.obj(function (file, encode, callback) {
    // Make sure everything is as it should
    if (file.isNull()) {
      return callback(null, file);
    }
    if (file.isStream()) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported'));
      return callback();
    }

    // Abort if the file is not of the correct file type
    let extension = path.extname(file.path).substr(1);

    if (! options.extensions.includes(extension.toLowerCase())) {
      debug('File extension filtered out: '+extension+' ('+path.basename(file.path)+')');
      return callback(null, file);
    }

    // Pull apart path and make the info easily accessible
    let info = getFileInfo(file);

    // Abort if it doesn't have a configured suffix
    if (! info.flag) {
      debug('No matching flags in file name: '+info.basename);
      return callback(null, file);
    }

    // Add original file to stream (resizing of copies happens after 'end' event)
    file.path = info.partial+info.flag.suffixOut+'.'+info.extension;

    // Create new images
    let streams = [];

    for (let set of getWorkList(info)) {
      streams.push(resizeImage(set, info));
    }

    // Add images to stream
    if (streams.length) {
      // Use the counter to verify when we're done with the last file
      let counter = streams.length;
      let mainStream = this;

      streams.forEach(function(stream) {
        // Buffer the stream so that it's in the default gulp format
        stream.pipe(buffer()).pipe(through.obj(function(resized, enc, cb) {
          // Add resized file to stream
          mainStream.push(resized);

          // Add original file if we're on the final iteration
          if (! --counter) {
            mainStream.push(file);
            callback();
          }
        }));
      });
    }
    else {
      this.push(file);
      callback();
    }
	});

  // Build the list of files we should create
  function getWorkList(source) {
    let workList = [];

    // Get flags in descending order of scale
    let flagsDesc = [...options.flags].sort(function(a, b) {
      return a.scale + b.scale;
    });

    for (let flag of flagsDesc) {
      if (flag.scale < source.flag.scale) {
        // Only add file to workList if there doesn't already exist source files
        // of lower resolution (that may be optimized for the size)
        if (! fileExists(source.partial+flag.suffix+'.'+source.extension)) {
          workList.push({
            scale: flag.scale,
            target: source.partial+flag.suffixOut+'.'+source.extension,
          });
        }
        else {
          // Stop here if smaller copies exist
          break;
        }
      }
    }

    return workList;
  }

  // Resize image
  function resizeImage(set, source) {
    // Calculate new image settings
    let quality = clamp(Math.floor(options.quality * 100), 0, 100);
    let scale = set.scale / source.flag.scale;
    let size = [];

    // Calculate new size
    if (options.roundUp) {
      size = [Math.ceil(source.size.width * scale), Math.ceil(source.size.height * scale)];
    }
    else {
      size = [Math.floor(source.size.width * scale), Math.floor(source.size.height * scale)];
    }

    // Create image and return the stream
    return gm(source.path)
      .resize(size[0], size[1])
      .quality(quality)
      .stream()
      .pipe(vinylSource())
      .pipe(parseStream(set.target, source.base));
  }

  // Deconstruct a file path to make information more accessible
  function getFileInfo(file) {
    // Pul apart path
    let extension = path.extname(file.path).substr(1);
    let basename = path.basename(file.path);
    let name = path.basename(file.path, '.'+extension);
    let directory = path.dirname(file.path);
    let flag = false;
    let size = sizeOf(file.path);

    // Map flag to file
    for (let currentFlag of options.flags) {
      if (name.slice(-currentFlag.suffix.length) === currentFlag.suffix) {
        name = name.slice(0, -currentFlag.suffix.length);
        flag = currentFlag;
        break;
      }
    }

    // This is used to easily create paths for other sizes
    let partial = path.join(directory, name);

    // Return mega verbose file object
    return { extension, basename, name, directory, partial, flag, size, base: file.base, path: file.path };
  }

  // Clamp a value between a max and min
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  // Function for synchronously testing if a file exists or not
  function fileExists(path) {
    try {
      fs.accessSync(path, fs.F_OK);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Print to console if we're debugging
  function debug(msg) {
    if (PLUGIN_DEBUG) {
      console.log(msg);
    }
  }

  // Create a stream
  function parseStream(path, base) {
    return through.obj(function(file, encode, callback){
      file.base = base;
      file.path = path;
      return callback(null, file);
    });
  }
};
