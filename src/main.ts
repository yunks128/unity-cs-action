import * as core from "@actions/core";
import {MetaObject} from "./meta";
import {runWF} from "./return-dispatch/main"
import {runWait} from "./await-remote-run/main";
import {ActionOutputs} from "./return-dispatch/action";
async function spinUpEKS(meta: MetaObject, token: string) {
    if (meta.hasOwnProperty("extensions")) {
        if (meta["extensions"].hasOwnProperty("kubernetes")) {
            console.log("call eks workflow")
            let id : ActionOutputs.runId = await runWF("unity-sds", "refs/heads/main", "unity-cs-infra", token, "deploy_eks.yml", 3600)
            console.log("checking run")
            await runWait("unity-sds", 5000, "unity-cs-infra", parseInt(id), 3600,token)
            console.log("wf id: "+id)
        }
    } else {
        console.log("call eks workflow 2")
    }

}

function spinUpProjects(meta: MetaObject, token: string) {
    if(meta["services"]){
        meta["services"].forEach(function (item, index) {
            console.log("Service found")
            console.log(item, index);
        });
    }
}
async function run(): Promise<void> {
    let meta = core.getInput('ucsmetadata');
    let token = core.getInput('token')
    if(meta === undefined || meta.length < 2){
        meta = core.getInput('eksmetadata')
        if(meta === undefined || meta.length < 2){
            core.setFailed('No metadata found')
        }
    }
    console.log(`Found meta ${meta}!`);
    // const [owner, repo] = "unity-sds/unity-cs-action".split("/");
    // let octokit = github.getOctokit(token)
    // const { data } = await  octokit.request("POST /repos/{owner}/{repo}/issues", {
    //     owner,
    //     repo,
    //     title: "My test issue",
    // });
    const metaobj = JSON.parse(meta)
    spinUpEKS(metaobj, token)
    spinUpProjects(metaobj, token)
    // console.log("Issue created: %s", data.html_url);
    const time = (new Date()).toTimeString();
    core.setOutput("time", time);
    // Get the JSON webhook payload for the event that triggered the workflow
    // const payload = JSON.stringify(github.context.payload, undefined, 2)
    // console.log(`The event payload: ${payload}`);
}

(() => run())();