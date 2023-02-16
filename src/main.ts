import * as core from "@actions/core";
import { MetaObject } from "./meta";
import { runWF } from "./return-dispatch/main"
import { runWait } from "./await-remote-run/main";
import { ActionWorkflowInputs } from "./return-dispatch/action";
import { exec } from "child_process";
import { spawn } from "child_process";

async function spinUpEKS(meta: MetaObject, token: string, awskey: string, awssecret: string, awstoken: string) {
    // Check for extension block
    if (meta.hasOwnProperty("extensions")) {
        var workflowname = "deploy_eks.yml"
        let input: ActionWorkflowInputs = <ActionWorkflowInputs>{};

        // If we have a kubernetesd block but the exec target is not github
        if (meta["extensions"].hasOwnProperty("kubernetes") && meta.exectarget != "github") {
            input = {
                "META": JSON.stringify(meta.extensions.kubernetes)
            }
        }
        // If we have a kubernetes block and there are AWS keys set (we're assuming in a github action not act)
        else if (meta["extensions"].hasOwnProperty("kubernetes") && awskey != "") {
            input = {
                "META": JSON.stringify(meta.extensions.kubernetes),
                "KEY": awskey,
                "SECRET": awssecret,
                "TOKEN": awstoken,
            }
        }
        // If there is a kubernetes block, to run in github and no AWS keys are set
        else if (meta["extensions"].hasOwnProperty("kubernetes")) {
            input = {
                "META": JSON.stringify(meta.extensions.kubernetes),
            }

        }
        console.log("call eks workflow with key")
        // Check for nodegroup block, if not set, we assume we're reusing an existing EKS cluster
        if (meta["extensions"].hasOwnProperty("kubernetes") && meta.extensions.kubernetes.hasOwnProperty("nodegroups")) {
            // If the exec target is github we want to run using Github CI
            if (meta.exectarget == "github") {
                await spinUpEKSGithub(token, workflowname, input)
            }
            // If the exec target is not set we assume we want to run in a non github environment and run via act
            else {

                console.log("launching act")
                console.log("writing parameters")
                const ls = spawn('act', ['-W', process.env.WORKFLOWPATH + "/" + workflowname, '--env', 'EKSClusterVersion=1.24', '--env', 'EKSClusterAMI=ami-0886544fa915698f0', '--env', 'EKSSecurityGroup=sg-09bd8de0af1c3c99a',
                    '--env', 'EKSSharedNodeSecurityGroup=sg-09bd8de0af1c3c99a',
                    '--env', 'EKSSubnetConfigA=us-west-2a: { id: subnet-087b54673c7549e2d }',
                    '--env', 'EKSSubnetConfigB=us-west-2b: { id: subnet-009c32904a8bf3b92 }',
                    '--env', 'EKSInstanceRoleArn=arn:aws:iam::237868187491:role/Unity-UCS-Development-EKSNodeRole',
                    '--env', 'EKSServiceArn=arn:aws:iam::237868187491:role/Unity-UCS-Development-EKSClusterS3-Role',
                    '--input', 'AWSCONNECTION=iam',
                    '--input', 'META=' + JSON.stringify(meta.extensions.kubernetes)]);
                ls.stdout.on('data', function(data) {
                    console.log('stdout: ' + data.toString());
                });

                ls.stderr.on('data', function(data) {
                    console.log('stderr: ' + data.toString());
                });
                await new Promise((resolve) => {
                    ls.on('exit', function(code) {
                        console.log('child process exited with code ' + code!.toString());
                        return resolve("done")
                    });
                })
            }
        }

    } else {
        // No extension probably do nothing. 

    }
}

// Spin up EKS via github action. Using the run await code to check for EKS to finish before continuing.
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
    await runWait("unity-sds", 60000, "unity-cs-infra", id, 3600, token)
    console.log("wf id: " + id)
}

// Spin up projects
async function spinUpProjects(meta: MetaObject, token: string) {
    if (meta["services"]) {
        for (const item of meta["services"]) {
            // Run via github action if github is the exectarget
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
                let id: number = await runWF("unity-sds",
                    "refs/heads/main",
                    "unity-cs-infra",
                    token,
                    "software_deployment.yml",
                    3600,
                    input
                )
                console.log("checking run")
                await runWait("unity-sds", 60000, "unity-cs-infra", id, 3600, token)
                console.log("wf id: " + id)
                console.log("launching service")
            }
            // Run via act if there is no exectarget set
            else {
                console.log("launching act")
                console.log("writing parameters")

                return new Promise((resolve) => {
                    let workflowname = "software_deployment.yml"
                    const ls = spawn('act', ['-W', process.env.WORKFLOWPATH + "/" + workflowname, 'workflow_dispatch',
                        '--input', 'deploymentOwner=' + meta.extensions.kubernetes.clustername,
                        '--input', 'sourceRepository=' + item.source,
                        '--input', 'sourceBranch=' + item.branch,
                        '--input', 'eksClusterName=' + meta.extensions.kubernetes.clustername,
                        '--input', 'awsConnection=iam',
                        '--input', 'deploymentSource=act',
                        '-s', 'GITHUB_TOKEN=' + meta.ghtoken]);
                    //const ls = spawn('ls', ['-al','/tmp'])
                    ls.stdout.on('data', function(data) {
                        console.log('stdout: ' + data.toString());
                    });

                    ls.stderr.on('data', function(data) {
                        console.log('stderr: ' + data.toString());
                    });
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
    /*let awskey = core.getInput('awskey')
    let awstoken = core.getInput('awstoken')
    let awssecret = core.getInput('awssecret')*/
    let awskey = ""
    let awstoken = ""
    let awssecret = ""
    console.log("Secret length: " + token.length)
    if (meta === undefined || meta.length < 2) {
        meta = core.getInput('eksmetadata')
        if (meta === undefined || meta.length < 2) {
            core.setFailed('No metadata found')
        }
    } else {
        console.log(`Found meta ${meta}!`);
        const metaobj = JSON.parse(meta)
        spinUpEKS(metaobj, token, awskey, awssecret, awstoken).then(() => {
            console.log("SPINNING UP PROJECTS")
            spinUpProjects(metaobj, token)
        })
    }
    // console.log("Issue created: %s", data.html_url);
    const time = (new Date()).toTimeString();
    core.setOutput("time", time);
}


(() => run())();
