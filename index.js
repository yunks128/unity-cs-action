const core = require('@actions/core');
const github = require('@actions/github');

try {
    let meta = core.getInput('ucsmetadata');
    let token = core.getInput('token')
    if(meta === undefined || meta.length < 2){
        meta = core.getInput('eksmetadata')
        if(meta === undefined || meta.length < 2){
            core.setFailed('No metadata found')
        }
    }
    console.log(`Found meta ${meta}!`);
    const [owner, repo] = "unity-sds/unity-cs-action".split("/");
    octokit = github.getOctokit(token)
    const { data } = octokit.request("POST /repos/{owner}/{repo}/issues", {
        owner,
        repo,
        title: "My test issue",
    });
    const time = (new Date()).toTimeString();
    core.setOutput("time", time);
    // Get the JSON webhook payload for the event that triggered the workflow
    const payload = JSON.stringify(github.context.payload, undefined, 2)
    console.log(`The event payload: ${payload}`);
} catch (error) {
    core.setFailed(error.message);
}