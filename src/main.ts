import * as core from "@actions/core";
import {MetaObject} from "./meta";
import {runWF} from "./return-dispatch/main"
import {runWait} from "./await-remote-run/main";
import {ActionWorkflowInputs} from "./return-dispatch/action";

async function spinUpEKS(meta: MetaObject, token: string) {
    if (meta.hasOwnProperty("extensions")) {
        if (meta["extensions"].hasOwnProperty("kubernetes")) {
            console.log("call eks workflow")
            const input: ActionWorkflowInputs = {
            "metadata":JSON.stringify(meta.extensions.kubernetes)
            }
            let id: number = await runWF("unity-sds",
                "refs/heads/main",
                "unity-cs-infra",
                token,
                "deploy_eks_callable.yml",
                1800,
                input
                )
            console.log("checking run")
            await runWait("unity-sds", 5000, "unity-cs-infra", id, 3600, token)
            console.log("wf id: " + id)
        }
    } else {
        console.log("call eks workflow 2")
    }

}

function spinUpProjects(meta: MetaObject, token: string) {
    if (meta["services"]) {
        meta["services"].forEach(function (item, index) {
            console.log("Service found")
            console.log(item, index);
        });
    }
}

async function run(): Promise<void> {
    let meta = core.getInput('ucsmetadata');
    let token = core.getInput('token')
    if (meta === undefined || meta.length < 2) {
        meta = core.getInput('eksmetadata')
        if (meta === undefined || meta.length < 2) {
            core.setFailed('No metadata found')
        }
    }
    console.log(`Found meta ${meta}!`);
    const metaobj = JSON.parse(meta)
    spinUpEKS(metaobj, token)
    spinUpProjects(metaobj, token)
    // console.log("Issue created: %s", data.html_url);
    const time = (new Date()).toTimeString();
    core.setOutput("time", time);
}

(() => run())();