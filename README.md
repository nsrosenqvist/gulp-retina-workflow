# gulp-retina-workflow

A simple way to work with hires (retina) source images for your Gulp projects by automatically resizing them to smaller versions from a single source file. This means that you only need one hires image in your repo and don't need to create alternate versions of every single one.

## Prerequisites

* Works in Node 5.0.0+ with Gulp.js.
* Requires [ImageMagick](https://www.npmjs.com/package/gulp-retinize) for Node. Please go there for installation directions and relevant questions.

## Usage

```js
const gulp = require('gulp');
const retina = require('gulp-retina-workflow');

gulp.task('images', function() {
    return gulp.src('images/**/*')
      .pipe(retina())
      .pipe(gulp.dest('dist/'));
});    
```

## Features

The plugin automatically resizes hires images (@4x, @3x, @2x) to smaller versions so that you only need to create one source file with your highest supported scale, e.g. @4x. If you have multiple defined source images, for example @4x and @2x, then the @4x will be used to create the @3x and the @2x will be used to create the @1x, so that you can optimize your images for different dpi if you want to.

The plugin can work with any scale integers you wish since they are user defined. These are the default options:
```js
{
  flags: [
    {suffix: '@1x', scale: 1, suffixOut: ''},
    {suffix: '@2x', scale: 2, suffixOut: '@2x'},
    {suffix: '@3x', scale: 3, suffixOut: '@3x'},
    {suffix: '@4x', scale: 4, suffixOut: '@4x'},
  ],
  extensions: ['jpg', 'jpeg', 'png'],
  roundUp: true,
  quality: 1
}
```

## License

MIT
