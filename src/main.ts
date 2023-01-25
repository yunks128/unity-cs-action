import * as core from "@actions/core";
import { MetaObject } from "./meta";
import { runWF } from "./return-dispatch/main"
import { runWait } from "./await-remote-run/main";
import { ActionWorkflowInputs } from "./return-dispatch/action";
import { exec } from "child_process";
import { spawn } from "child_process";

async function spinUpEKS(meta: MetaObject, token: string, awskey: string, awssecret: string, awstoken: string) {
    if (meta.hasOwnProperty("extensions")) {
        console.log("AWS Key: " + awskey)
        var workflowname = "unknown"
        let input: ActionWorkflowInputs = <ActionWorkflowInputs>{};
        if (meta["extensions"].hasOwnProperty("kubernetes") && meta.exectarget != "github") {
            workflowname = "deploy_eks_callable.yml";
            input = {
                "META": JSON.stringify(meta.extensions.kubernetes)
            }
        }
        else if (meta["extensions"].hasOwnProperty("kubernetes") && awskey != "") {
            workflowname = "deploy_eks_callable.yml";
            input = {
                "META": JSON.stringify(meta.extensions.kubernetes),
                "KEY": awskey,
                "SECRET": awssecret,
                "TOKEN": awstoken,
            }
        } else if (meta["extensions"].hasOwnProperty("kubernetes")) {
            workflowname = "deploy_eks_callable_oidc.yml";
            input = {
                "META": JSON.stringify(meta.extensions.kubernetes),
            }

        }
        console.log("call eks workflow with key")
        if (meta.exectarget == "github") {
            spinUpEKSGithub(token, workflowname, input)
        } else {
            console.log("launching act")
            console.log("writing parameters")
            const ls = spawn('act', ['-W', process.env.WORKFLOWPATH + "/" + workflowname, '--input', 'META=\'' + JSON.stringify(meta.extensions.kubernetes) + '\'', '-s', 'EKSINSTANCEROLEARN', '-s', 'EKSSERVICEARN']);
            ls.stdout.on('data', function(data) {
                console.log('stdout: ' + data.toString());
            });

            ls.stderr.on('data', function(data) {
                console.log('stderr: ' + data.toString());
            });
            await new Promise((resolve) => {
                ls.on('exit', function(code) {
                    console.log('child process exited with code ' + code!.toString());
                });
            })
            console.log("moving on")
        }



    } else {


    }
}

async function spinUpEKSGithub(token: string, workflowname: string, input: ActionWorkflowInputs) {
    let id: number = await runWF("unity-sds",
        "refs/heads/main",
        "unity-cs-infra",
        token,
        workflowname,
        1800,
        input
    )
    console.log("checking run")
    await runWait("unity", 60000, "unity-cs-infra", id, 3600, token)
    console.log("wf id: " + id)
}

async function spinUpProjects(meta: MetaObject, token: string) {
    if (meta["services"]) {
        for (const item of meta["services"]) {
            if (meta.exectarget == "github") {
                const index = meta["services"].indexOf(item);
                console.log("Service found")
                console.log(item, index);
                console.log("call service workflow")
                const input: ActionWorkflowInputs = {
                    "deploymentProject": "UNITY",
                    "deploymentStage": "DEV",
                    "deploymentOwner": "tom",
                    "eksClusterName": meta.extensions.kubernetes.clustername,
                    "deploymentTarget": "mcp",
                    "sourceRepository": item.source,
                    "sourceBranch": item.branch
                }
                /*let id: number = await runWF("unity-sds",
                    "refs/heads/main",
                    "unity-cs-infra",
                    token,
                    "deployment_oidc.yml",
                    1800,
                    input
                )
                console.log("checking run")
                await runWait("unity-sds", 60000, "unity-cs-infra", id, 3600, token)
                console.log("wf id: " + id)*/
                console.log("launching service")
            } else {
                console.log("launching act")
                console.log("writing parameters")
                let workflowname = "software_deployment.yml"
                const ls = spawn('act', ['-W', process.env.WORKFLOWPATH + "/" + workflowname, 'workflow_dispatch',
                                         '--input', 'deploymentOwner=' + meta.extensions.kubernetes.clustername,
                                         '--input', 'sourceRepository=' + item.source,
                                         '--input', 'sourceBranch=' + item.branch,
                                         '--input', 'eksClusterName=' + meta.extensions.kubernetes.clustername,
                                         '--input', 'awsConnection=iam',
                                         '-s', 'EKSINSTANCEROLEARN', '-s', 'EKSSERVICEARN', '-s', 'AWS_REGION',
                                         '-s', 'GITHUB_TOKEN']);
                ls.stdout.on('data', function(data) {
                    console.log('stdout: ' + data.toString());
                });

                ls.stderr.on('data', function(data) {
                    console.log('stderr: ' + data.toString());
                });
                return new Promise((resolve) => {
                    ls.on('exit', function(code) {
                        console.log('child process exited with code ' + code!.toString());
                        return resolve("done")
                    });
                })
            }
        }
    }
}

async function run(): Promise<void> {
    let meta = core.getInput('ucsmetadata');
    let token = core.getInput('token')
    let awskey = core.getInput('awskey')
    let awstoken = core.getInput('awstoken')
    let awssecret = core.getInput('awssecret')
    //let awskey = ""
    //let awstoken = ""
    //let awssecret = ""
    if (meta === undefined || meta.length < 2) {
        meta = core.getInput('eksmetadata')
        if (meta === undefined || meta.length < 2) {
            core.setFailed('No metadata found')
        }
    } else {
        console.log(`Found meta ${meta}!`);
        const metaobj = JSON.parse(meta)
        spinUpEKS(metaobj, token, awskey, awssecret, awstoken).then(r =>{
            console.log("SPINNING UP PROJECTS")
            spinUpProjects(metaobj, token)
        })
    }
    // console.log("Issue created: %s", data.html_url);
    const time = (new Date()).toTimeString();
    core.setOutput("time", time);
}

(() => run())();
