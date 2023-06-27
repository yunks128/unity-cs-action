import * as core from "@actions/core";
import { ActionMeta } from "./proto/unity-management-console/protobuf/extensions";
import { spinUpEKS, spinUpTearDownProjects, tearDownEKS } from "./eks/unity-eks";
import { spinUpApiGateway, tearDownApiGateway } from "./apigateway/unity-apigateway";

async function spinUpExtensions(
  meta: ActionMeta,
  token: string,
  awskey: string,
  awssecret: string,
  awstoken: string
) {
  if (meta.extensions) {
    if (meta.extensions.eks) {
      console.log("Spinning up kubernetes");
      await spinUpEKS(meta, token, awskey, awssecret, awstoken);
    }
    if (meta.extensions.apis) {
      console.log("Spinning up api gateway");
      await spinUpApiGateway(meta, token);
    }
  } else {
    console.log(
      "No extensions block found in metadata, skipping extension deployment\n metadata: %s",
      meta
    );
  }
}

async function tearDownExtensions(
  meta: ActionMeta,
  token: string,
  awskey: string,
  awssecret: string,
  awstoken: string
) {
  if ( meta.extensions) {
    if (meta.extensions.eks) {
      console.log("Tearing down kubernetes");
      await tearDownEKS(meta, token, awskey, awssecret, awstoken);
    }
    if (meta.extensions.apis) {
      console.log("Tearing down api gateway");
      await tearDownApiGateway(meta, token);
    }
  } else {
    console.log(
      "No extensions block found in metadata, skipping extension deployment\n metadata: %s",
      meta
    );
  }
}

function base64ToByteArray(base64String: string): Uint8Array {
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function run(): Promise<void> {
  const meta = core.getInput("ucsmetadata");
  const byteArray = base64ToByteArray(meta);

  const metaobj = ActionMeta.decode(byteArray);
  console.log(metaobj);
  //const metaobj = JSON.parse(meta);
  const token = core.getInput("token");
  const awskey = "";
  const awstoken = "";
  const awssecret = "";

  console.log(`Secret length: ${token.length}`);
  console.log(`The deployment type is ${metaobj.deploymentType}`);

  if (!meta || meta.length < 2) {
    const eksMeta = core.getInput("eksmetadata");
    if (!eksMeta || eksMeta.length < 2) {
      core.setFailed("No metadata found");
      return;
    }
    console.log(`Found meta ${eksMeta}!`);
    spinUpExtensions(
      JSON.parse(eksMeta),
      token,
      awskey,
      awssecret,
      awstoken
    ).then(() => {
      console.log("SPINNING UP PROJECTS");
      spinUpTearDownProjects(metaobj, token, "false");
    });
  } else if (metaobj.deploymentType === "teardown") {
    console.log("Teardown of services");
    spinUpTearDownProjects(metaobj, token, "true").then(() => {
      console.log("Running teardown of extensions");
      tearDownExtensions(metaobj, token, awskey, awssecret, awstoken);
    });
  } else {
    console.log(`Found meta ${meta}!`);
    spinUpExtensions(metaobj, token, awskey, awssecret, awstoken).then(() => {
      console.log("SPINNING UP PROJECTS");
      spinUpTearDownProjects(metaobj, token, "false");
    });
  }

  const time = new Date().toTimeString();
  core.setOutput("time", time);
}

(() => run())();
