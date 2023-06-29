# unity-cs-action

# DEPRECATION NOTICE

---
:warning: **IMPORTANT**: This library is deprecated as of June 29, 2023. :warning:
---

Dear users of our open-source library,

We have decided to officially deprecate this project. The decision comes after extensive deliberation and is driven by a combination of factors, such as the evolution of the technology landscape, the availability of superior alternatives, and our intent to focus on other areas of development.

As a consequence of this deprecation, we will not be undertaking any more active development on this library, which includes new features, bug fixes, and security updates. Moreover, official support will also be discontinued, including handling of issues and pull requests.

However, the library will still be accessible in its current state. Feel free to fork and use it under the terms of the license. Also, the community may continue to provide unofficial support.



This repository holds code that helps tie together multiple workflows, so that they aren't all in one monolithic workflow.
It also handles passing in the correct inputs to the various workflows.
The code in this repository gets kicked off by `run_unity_job` in a workflow inside of [unity-cs-infra repository](https://github.com/unity-sds/unity-cs-infra)

The metadata is an input to the [`main.ts`](https://github.com/unity-sds/unity-cs-action/blob/main/src/main.ts) program, and drives the flow.
