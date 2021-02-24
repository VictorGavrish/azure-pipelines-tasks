const fs = require('fs');
const path = require('path');
const run = require('../ci/ci-util').run;

const currentSprint = parseInt(process.env['SPRINT']);

function getChangedFilesList() {
    return run('git --no-pager diff --name-only Localization..master').split('\n');
}

function getTaskOrPackagePaths(paths, rootFolder, exclusions) {
    let pathSet = new Set();
    paths.filter(p => p.startsWith(rootFolder))
        .map(p => p.slice(0, p.indexOf('/', rootFolder.length)))
        .filter(p => fs.existsSync(path.resolve(p)) && fs.statSync(path.resolve(p)).isDirectory())
        .forEach(p => pathSet.add(p));

    for (let excludedTask of exclusions) {
        pathSet.delete(`${rootFolder}${excludedTask}`);
    }
    return Array.from(pathSet);
}

function getTasksPaths(paths) {
    const taskFolder = 'Tasks/';
    const exclusions = ['Common'];

    return getTaskOrPackagePaths(paths, taskFolder, exclusions);
}

function bumpTaskVersion(taskPath) {
    const taskJsonPath = path.join(__dirname, '..', taskPath, 'task.json');
    const taskLocJsonPath = path.join(__dirname, '..', taskPath, 'task.loc.json');

    if (!fs.existsSync(taskJsonPath) || !fs.existsSync(taskLocJsonPath)) {
        console.log(`Bumping version of ${taskPath} failed: task.json or task.loc.json doesn't exists.`);
        return;
    }

    let taskJson = JSON.parse(fs.readFileSync(taskJsonPath));
    let taskLocJson = JSON.parse(fs.readFileSync(taskLocJsonPath));

    if (typeof taskJson.version.Patch != 'number') {
        throw new Error(`Error processing '${taskJsonPath}'. version.Patch should be a number.`);
    }
    if (taskJson.version.Minor === currentSprint) {
        taskJson.version.Patch = taskJson.version.Patch + 1;
        taskLocJson.version.Patch = taskLocJson.version.Patch + 1;
    } else {
        taskJson.version.Patch = 0;
        taskLocJson.version.Patch = 0;
        taskJson.version.Minor = Number(currentSprint);
        taskLocJson.version.Minor = Number(currentSprint);
    }

    fs.writeFileSync(taskJsonPath, JSON.stringify(taskJson, null, 4));
    fs.writeFileSync(taskLocJsonPath, JSON.stringify(taskLocJson, null, 2));
}

function main() {
    const fileList = getChangedFilesList(); // string[]
    const tasksPaths = getTasksPaths(fileList) // string[]

    tasksPaths.forEach(taskPath => {
        bumpTaskVersion(taskPath);
    });
    /* TODO
    const commonPackages = getCommonPacks(fileList) // string[]

    commonPackages.forEach(packagePath => {
        bumpPackageVersion(packagePath);
    });
    */
}

main();