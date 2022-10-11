import * as core from "@actions/core";
import { v4 as uuid } from "uuid";
import * as github from "@actions/github";
import {MetaObject} from "./meta";

async function spinUpEKS(meta: MetaObject, token: string) {
    let octokit = github.getOctokit(token)
    if (meta.hasOwnProperty("extensions")) {
        if (meta["extensions"].hasOwnProperty("kubernetes")) {
            console.log("call eks workflow")
            let wf = await octokit.rest.actions.createWorkflowDispatch({
                owner: "unity-sds",
                repo: "unity-cs-infra",
                workflow_id: "deploy_eks.yml",
                ref: "main",
                inputs:{
                    "KEY":core.getInput('KEY'),
                    "SECRET":core.getInput('SECRET'),
                    "TOKEN":core.getInput('TOKEN'),
                    "OWNER":"",
                    "PROJECTNAME":"",

                }
            });
            console.log(wf)
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