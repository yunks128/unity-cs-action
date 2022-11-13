import * as core from "@actions/core";
import {MetaObject} from "./meta";
import {runWF} from "./return-dispatch/main"
import {runWait} from "./await-remote-run/main";
import {ActionWorkflowInputs} from "./return-dispatch/action";

async function spinUpEKS(meta: MetaObject, token: string, awskey: string, awssecret: string, awstoken: string) {
    if (meta.hasOwnProperty("extensions")) {
        console.log("AWS Key: "+awskey)
        if (meta["extensions"].hasOwnProperty("kubernetes") && awskey == "") {
            console.log("call eks workflow with key")
            const input: ActionWorkflowInputs = {
            "metadata":JSON.stringify(meta.extensions.kubernetes),
                "KEY": awskey,
                "SECRET": awssecret,
                "TOKEN": awstoken,
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
        } else if(meta["extensions"].hasOwnProperty("kubernetes")){
            console.log("call eks oidc workflow")
            const input: ActionWorkflowInputs = {
                "metadata":JSON.stringify(meta.extensions.kubernetes),
            }
            let id: number = await runWF("unity-sds",
                "refs/heads/main",
                "unity-cs-infra",
                token,
                "deploy_eks_callable_oidc.yml",
                1800,
                input
            )
            console.log("checking run")
            await runWait("unity-sds", 5000, "unity-cs-infra", id, 3600, token)
            console.log("wf id: " + id)
        }


    } else
{


}
}

async function spinUpProjects(meta: MetaObject, token: string) {
    if (meta["services"]) {
        for (const item of meta["services"]) {
            const index = meta["services"].indexOf(item);
            console.log("Service found")
            console.log(item, index);
            console.log("call service workflow")
            const input: ActionWorkflowInputs = {
                "deploymentTarget": "mcp",
                "sourceRepository": item.source,
                "sourceBranch": item.branch
            }
            let id: number = await runWF("unity-sds",
                "refs/heads/main",
                "unity-cs-infra",
                token,
                "deployment.yml",
                1800,
                input
            )
            console.log("checking run")
            await runWait("unity-sds", 5000, "unity-cs-infra", id, 3600, token)
            console.log("wf id: " + id)
        }
    }
}

async function run(): Promise<void> {
    let meta = core.getInput('ucsmetadata');
    let token = core.getInput('token')
    //let awskey = core.getInput('awskey')
    //let awstoken = core.getInput('awstoken')
    //let awssecret = core.getInput('awssecret')
    let awskey = ""
    let awstoken = ""
    let awssecret = ""
    if (meta === undefined || meta.length < 2) {
        meta = core.getInput('eksmetadata')
        if (meta === undefined || meta.length < 2) {
            core.setFailed('No metadata found')
        }
    }
    console.log(`Found meta ${meta}!`);
    const metaobj = JSON.parse(meta)
    spinUpEKS(metaobj, token, awskey, awssecret, awstoken)
    spinUpProjects(metaobj, token)
    // console.log("Issue created: %s", data.html_url);
    const time = (new Date()).toTimeString();
    core.setOutput("time", time);
}

(() => run())();