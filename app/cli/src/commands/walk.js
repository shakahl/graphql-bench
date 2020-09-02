var fs = require('fs-extra')
var path = require('path')
var walk = function (dir, done) {
  var results = []
  fs.readdir(dir, function (err, list) {
    if (err) return done(err)
    var i = 0
    ;(function next() {
      var file = list[i++]
      if (!file) return done(null, results)
      file = path.resolve(dir, file)
      fs.stat(file, function (err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function (err, res) {
            results = results.concat(res)
            next()
          })
        } else {
          if (/_HasuraBenchmark.json$/.test(file)) {
            try {
              var args = process.argv.slice(2)
              const result = file.split(`/${args[0]}/`)[1]
              if (result) results.push({ url: `./${result}`, type: 'agg' })
            } catch (e) {
              console.error('Indexing failed')
            }
          }
          next()
        }
      })
    })()
  })
}

walk('./', function (err, results) {
  if (err) throw err
  console.log(results)
  var args = process.argv.slice(2)
  fs.outputJSONSync(`./${args[0]}/index.json`, results, {
    spaces: 2,
    flag: 'w',
  })
})
