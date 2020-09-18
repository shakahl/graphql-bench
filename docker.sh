cd app && docker-compose up --build --force-recreate && docker run \
-e GIT_TOKEN=<CHANGEMEtoken> \
-e GIT_EMAIL=soorajshankar@gmail.com \
-e GIT_REMOTE=https://soorajshankar:<tokenCHANGEME>@github.com/soorajshankar/auto-test.git \
-e GIT_REPO_NAME=auto-test \
-e GIT_REPORTS_DIR=stage12 \
-e GIT_NAME=soorajshankar \
-it app_graphql-bench query \
--config https://gist.githubusercontent.com/<CHANGE MEyour gitst url>/config.yaml #test configuration file url \
-o reports.json