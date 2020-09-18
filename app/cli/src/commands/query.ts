import * as path from 'path'
import * as fs from 'fs-extra'
import * as yaml from 'js-yaml'
import shell from 'shelljs'

import { Command, flags } from '@oclif/command'
import { BenchmarkRunner } from '../../../queries/src/main'
import { isHttpUrl, promisifiedRequest } from '../../../queries/src/utils'
import type {
  GlobalConfig,
  GitConfig,
} from '../../../queries/src/executors/base/types'

export default class Query extends Command {
  static description = 'benchmark queries or mutations'

  static examples = [
    `$ graphql-bench query --config ./config.query.yaml --outfile results.json`,
  ]

  static flags = {
    help: flags.help({ char: 'h' }),
    config: flags.string({
      char: 'c',
      required: true,
      multiple: false,
      description:
        'Filepath to YAML config file for query benchmarks or URL of the YAML config file',
      parse: (filepath) => {
        if (isHttpUrl(filepath)) {
          // async is not supported here, processing url in the `run` method
          return filepath
        }
        const pathToFile = path.join(process.cwd(), filepath)
        const configFile = fs.readFileSync(pathToFile, 'utf-8')
        return yaml.load(configFile)
      },
    }),
    outfile: flags.string({
      char: 'o',
      required: false,
      multiple: false,
      description: 'Filepath to output JSON file containing benchmark stats',
    }),
  }

  async run() {
    const { flags } = this.parse(Query)
    if (typeof flags.config === 'string' && isHttpUrl(flags.config)) {
      let response = await promisifiedRequest(flags.config)
      flags.config = yaml.load(response)
    }
    const config = (flags.config as unknown) as GlobalConfig
    let pathToOutfile

    // Oclif, can't figure out how to generically type flags =/
    const executor = new BenchmarkRunner(
      (flags.config as unknown) as GlobalConfig
    )
    const results = await executor.runBenchmarks()

    if (flags.outfile) {
      pathToOutfile = path.join(process.cwd(), flags.outfile)
      fs.outputJSONSync(pathToOutfile, results, {
        spaces: 2,
      })
    }

    if (!shell.which('git')) {
      shell.echo('Sorry, this script requires git')
      shell.exit(1)
    }
    let git: GitConfig = config.git || {}
    const {
      name = process.env.GIT_NAME,
      email = process.env.GIT_EMAIL,
      token = process.env.GIT_TOKEN,
      repo_name = process.env.GIT_REPO_NAME,
      remote = process.env.GIT_REMOTE,
      reports_dir = process.env.GIT_REPORTS_DIR || 'reports',
    } = git
    // console.log(JSON.stringify({ name, email, token, repo_name }))
    const testId = new Date().toISOString() + '_' + reports_dir

    shell.exec('echo "Repository Clone: Started" ')
    shell.exec('git clone ' + remote)
    if (pathToOutfile)
      shell.exec(
        `cp ${pathToOutfile} ./${repo_name}/${reports_dir}/${testId}_HasuraBenchmark.json`
      )
    if (shell.exec(
      `echo "Repository clone: Completed" \
      && cp -R ./queries/reports ${repo_name}/${reports_dir} \
      && cp -R ./web-app/* ./${repo_name} \
      && node ./cli/src/commands/indexData ${repo_name} \
      && echo "Publishing reports" \
      && cd ${repo_name} \
      && git config user.name ${name} \
      && git config user.email ${email} \
      && git config user.password ${token} \
      && git remote set-url origin ${remote} \
      && git status \
      && git add . \
      && git commit -am "Reports_"${testId} \
      && git status \
      && git push  \
      && git status \
      && echo "Reports published successfully" `
    ).code !== 0) {
      shell.echo("Something went wrong, unable to publish the report")
      shell.echo("Fallback : Printing reports on console")
      return shell.echo(JSON.stringify(results, null, 2))
    }
  }
}
