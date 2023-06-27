import { ActionMeta } from "../proto/unity-management-console/protobuf/extensions";
import { ActionWorkflowInputs } from "../return-dispatch/action";
import { spawn } from "child_process";
import { runWF } from "../return-dispatch/main";
import { runWait } from "../await-remote-run/main";

export async function spinUpEKS(
  meta: ActionMeta,
  token: string,
  awskey: string,
  awssecret: string,
  awstoken: string
) {
  const workflowname = "deploy_eks.yml";
  let input: ActionWorkflowInputs;

  // If we have a kubernetesd block but the exec target is not github
  if (meta.exectarget !== "github") {
    input = {
      META: JSON.stringify(meta.extensions?.eks),
    };
  }
  // If we have a kubernetes block and there are AWS keys set (we're assuming in a github action not act)
  else if (awskey !== "") {
    input = {
      META: JSON.stringify(meta.extensions?.eks),
      KEY: awskey,
      SECRET: awssecret,
      TOKEN: awstoken,
    };
  }
  // If there is a kubernetes block, to run in github and no AWS keys are set
  else {
    input = {
      META: JSON.stringify(meta.extensions?.eks),
    };
  }
  console.log("call eks workflow with key");
  // Check for nodegroup block, if not set, we assume we're reusing an existing EKS cluster
  if (
    Object.prototype.hasOwnProperty.call(meta.extensions?.eks, "nodegroups")
  ) {
    // If the exec target is github we want to run using Github CI
    if (meta.exectarget === "github") {
      await spinUpEKSGithub(token, workflowname, input);
    }
    // If the exec target is not set we assume we want to run in a non github environment and run via act
    else {
      console.log("launching act");
      console.log("writing parameters");
      const ls = spawn("act", [
        "-W",
        process.env.WORKFLOWPATH + "/" + workflowname,
        "--input",
        "AWSCONNECTION=iam",
        "--input",
        "DEPLOYMENTSOURCE=act",
        "--input",
        "META=" + JSON.stringify(meta.extensions?.eks),
      ]);
      ls.stdout.on("data", function (data) {
        console.log("stdout: " + data.toString());
      });

      ls.stderr.on("data", function (data) {
        console.log("stderr: " + data.toString());
      });
      await new Promise((resolve) => {
        ls.on("exit", function (code) {
          console.log("child process exited with code " + code?.toString());
          return resolve("done");
        });
      });
    }
  }
}

export async function tearDownEKS(
  meta: ActionMeta,
  token: string,
  awskey: string,
  awssecret: string,
  awstoken: string
) {
  // Check for extension block
  if (Object.prototype.hasOwnProperty.call(meta, "extensions")) {
    const workflowname = "deploy_eks.yml";
    let input: ActionWorkflowInputs = <ActionWorkflowInputs>{};

    // If we have a kubernetesd block but the exec target is not github
    if (
      Object.prototype.hasOwnProperty.call(meta["extensions"], "kubernetes") &&
      meta.exectarget !== "github"
    ) {
      input = {
        META: JSON.stringify(meta.extensions?.eks),
        TEARDOWN: "true",
      };
    }
    // If we have a kubernetes block and there are AWS keys set (we're assuming in a github action not act)
    else if (
      Object.prototype.hasOwnProperty.call(meta["extensions"], "kubernetes") &&
      awskey !== ""
    ) {
      input = {
        META: JSON.stringify(meta.extensions?.eks),
        KEY: awskey,
        SECRET: awssecret,
        TOKEN: awstoken,
        TEARDOWN: "true",
      };
    }
    // If there is a kubernetes block, to run in github and no AWS keys are set
    else if (
      Object.prototype.hasOwnProperty.call(meta["extensions"], "kubernetes")
    ) {
      input = {
        META: JSON.stringify(meta.extensions?.eks),
        TEARDOWN: "true",
      };
    }
    console.log("call eks workflow with key");
    // Check for nodegroup block, if not set, we assume we're reusing an existing EKS cluster
    if (
      Object.prototype.hasOwnProperty.call(meta["extensions"], "kubernetes") &&
      Object.prototype.hasOwnProperty.call(meta.extensions?.eks, "nodegroups")
    ) {
      // If the exec target is github we want to run using Github CI
      if (meta.exectarget === "github") {
        await tearDownEKSGithub(token, workflowname, input);
      }
      // If the exec target is not set we assume we want to run in a non github environment and run via act
      else {
        console.log("launching act");
        console.log("writing parameters");
        const ls = spawn("act", [
          "-W",
          process.env.WORKFLOWPATH + "/" + workflowname,
          "--input",
          "AWSCONNECTION=iam",
          "--input",
          "TEARDOWN=true",
          "--input",
          "META=" + JSON.stringify(meta.extensions?.eks),
        ]);
        ls.stdout.on("data", function (data) {
          console.log("stdout: " + data.toString());
        });

        ls.stderr.on("data", function (data) {
          console.log("stderr: " + data.toString());
        });
        await new Promise((resolve) => {
          ls.on("exit", function (code) {
            console.log("child process exited with code " + code?.toString());
            return resolve("done");
          });
        });
      }
    }
  } else {
    // No extension probably do nothing.
  }
}

// Spin up EKS via github action. Using the run await code to check for EKS to finish before continuing.
export async function spinUpEKSGithub(
  token: string,
  workflowname: string,
  input: ActionWorkflowInputs
) {
  const id: number = await runWF(
    "unity-sds",
    "refs/heads/main",
    "unity-cs-infra",
    token,
    workflowname,
    1800,
    input
  );
  console.log("checking run");
  await runWait("unity-sds", 60000, "unity-cs-infra", id, 3600, token);
  console.log("wf id: " + id);
}

// Tear down EKS via github action. Using the run await code to check for EKS teardown to finish before continuing.
export async function tearDownEKSGithub(
  token: string,
  workflowname: string,
  input: ActionWorkflowInputs
) {
  const id: number = await runWF(
    "unity-sds",
    "refs/heads/main",
    "unity-cs-infra",
    token,
    workflowname,
    1800,
    input
  );
  console.log("checking run");
  await runWait("unity-sds", 60000, "unity-cs-infra", id, 3600, token);
  console.log("wf id: " + id);
}

// Spin up projects
export async function spinUpTearDownProjects(
  meta: ActionMeta,
  token: string,
  teardown: string
) {
  if (meta.services) {
    const eksClusterName =
      meta.extensions?.eks?.clustername || "defaultClusterName";
    for (const [index, item] of meta.services.entries()) {
      // Run via GitHub Actions if exectarget is set to github
      if (meta.exectarget === "github") {
        console.log("Service found");
        console.log(item, index);
        console.log("Calling service workflow");

        const input: ActionWorkflowInputs = {
          deploymentProject: "UNITY",
          deploymentStage: "DEV",
          deploymentOwner: "tom",
          eksClusterName,
          deploymentTarget: "mcp",
          sourceRepository: item.source,
          sourceBranch: item.branch,
          deploymentName: item.name,
        };

        const id = await runWF(
          "unity-sds",
          "refs/heads/main",
          "unity-cs-infra",
          token,
          "software_deployment.yml",
          3600,
          input
        );

        console.log("Checking run");
        await runWait("unity-sds", 60000, "unity-cs-infra", id, 3600, token);
        console.log(`Workflow ID: ${id}`);
        console.log("Launching service");
      }
      // Run via act if there is no exectarget set
      else {
        console.log("Launching act");
        console.log("Writing parameters");

        return new Promise((resolve) => {
          const workflowName = "software_deployment.yml";
          const ls = spawn("act", [
            "-W",
            `${process.env.WORKFLOWPATH}/${workflowName}`,
            "workflow_dispatch",
            "--input",
            `deploymentOwner=${eksClusterName}`,
            "--input",
            `sourceRepository=${item.source}`,
            "--input",
            `deploymentName=${item.name}`,
            "--input",
            `sourceBranch=${item.branch}`,
            "--input",
            `eksClusterName=${eksClusterName}`,
            "--input",
            "awsConnection=iam",
            "--input",
            "deploymentSource=act",
            "--input",
            `teardown=${teardown}`,
            "-s",
            `GITHUB_TOKEN=${process.env.GITHUB_TOKEN}`,
          ]);

          ls.stdout.on("data", function (data) {
            console.log(`stdout: ${data.toString()}`);
          });

          ls.stderr.on("data", function (data) {
            console.log(`stderr: ${data.toString()}`);
          });

          ls.on("exit", function (code) {
            console.log(`Child process exited with code ${code?.toString()}`);
            return resolve("done");
          });
        });
      }
    }
  }
}
