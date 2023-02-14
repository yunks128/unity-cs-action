# unity-cs-action

This repository holds code that helps tie together multiple workflows, so that they aren't all in one monolithic workflow.
It also handles passing in the correct inputs to the various workflows.
The code in this repository gets kicked off by `run_unity_job` in a workflow inside of [unity-cs-infra repository](https://github.com/unity-sds/unity-cs-infra)

The metadata is an input to the `main.ts` program, and drives the flow.
