export interface Service {
    name: string;
    source: string;
    version: string;
    branch: string;
}

export interface Group1 {
    instancetype: string;
    nodecount: string;
}

export interface Nodegroups {
    group1: Group1;
}

export interface Kubernetes {
    nodegroups: Nodegroups;
}

export interface Extensions {
    kubernetes: Kubernetes;
}

export interface MetaObject {
    metadataVersion: string;
    deploymentName: string;
    services: Service[];
    extensions: Extensions;
}
