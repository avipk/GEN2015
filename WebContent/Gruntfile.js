module.exports = function (grunt) {
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        compass: {
          dist: {
            options: {
              sassDir: 'sass',
              cssDir: 'css',
              imagesDir: 'images',
              javascriptsDir: 'js',
              outputStyle: 'compressed',
              relativeAssets: true,
              noLineComments: true,
              sourcemap: true,
              assetCacheBuster: false,              
              raw: 'Sass::Script::Number.precision = 10\n'
            },
          }
        },

        autoprefixer: {
          dist: {
            options: {
              browsers: ["last 3 versions", "ie > 8", "bb >= 10", "android >= 3", "ios >= 5", "ff >= 24"],
              map: true,
            },
            files: [{
              expand: true,
              flatten: true,
              cwd: 'css',
              src: '*.css',
              dest: 'css'
            }]
          }
        },

        'uglify': {
        	minified :{
        		files: {
        			'js/mini/sript.js' : [  'js/src/*.js' ]
        		}
        	}
        },

        'concat' : {
        	debug :{
        		files: {
        			'js/debug/sript.js' : [  'js/src/*.js' ]
        		}
        	}
        },

        'watch': {
            compass: {
                files: ['sass/**/*.{scss,sass}'],
                tasks: ['compass', 'autoprefixer']
            },
            uglify: {
                files: ['js/src/*.js' ],
                tasks: ['uglify', 'concat']
            }
        }
    });

    // Load plugins
    grunt.loadNpmTasks('grunt-contrib-compass');
    grunt.loadNpmTasks('grunt-autoprefixer');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-uglify');    
    grunt.loadNpmTasks('grunt-contrib-concat');

    // tasks
    grunt.registerTask('default', ['watch']);
    
    // compile tasks to use on local
    grunt.registerTask('comp', ['compass', 'autoprefixer', 'uglify', 'concat' ]);
    
   
};