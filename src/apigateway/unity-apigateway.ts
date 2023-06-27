import { ActionMeta } from "../proto/unity-management-console/protobuf/extensions";
import { ActionWorkflowInputs } from "../return-dispatch/action";
import { runWF } from "../return-dispatch/main";
import { runWait } from "../await-remote-run/main";
import { spawn } from "child_process";

export async function tearDownApiGateway(meta: ActionMeta, token: string) {
  let api;
  const workflowname = "deploy_project_apigateway.yml";

  if (meta.exectarget === "github") {
    if (meta.extensions?.apis) {
      for (api of meta.extensions?.apis.apis) {
        await spinUpApiGatewayApiGithub(api.name, token, workflowname, "true");
      }
    }
  } else {
    if (meta.extensions?.apis) {
      for (api of meta.extensions?.apis.apis) {
        await spinUpApiGatewayApi(api.name, workflowname, "true");
      }
    }
  }
}

export async function spinUpApiGateway(meta: ActionMeta, token: string) {
  let api;
  const workflowname = "deploy_project_apigateway.yml";

  if (meta.exectarget === "github") {
    if (meta.extensions?.apis) {
      for (api of meta.extensions?.apis.apis) {
        await spinUpApiGatewayApiGithub(api.name, token, workflowname, "false");
      }
    }
  } else {
    if (meta.extensions?.apis) {
      for (api of meta.extensions?.apis.apis) {
        await spinUpApiGatewayApi(api.name, workflowname, "false");
      }
    }
  }
}

async function spinUpApiGatewayApiGithub(
  name: string,
  token: string,
  workflowname: string,
  teardown: string
) {
  const input: ActionWorkflowInputs = {
    apiName: name,
    teardown: teardown,
  };
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

async function spinUpApiGatewayApi(
  name: string,
  workflowname: string,
  teardown: string
) {
  console.log("launching act");
  console.log("writing parameters");
  const ls = spawn("act", [
    "-W",
    process.env.WORKFLOWPATH + "/" + workflowname,
    "--input",
    "awsConnection=iam",
    "--input",
    "apiName=" + name,
    "--input",
    "deploymentSource=act",
    "--input",
    "teardown=" + teardown,
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