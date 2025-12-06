package com.example.stickysession.model;

public class PodInfo {
    private String podName;
    private String podIp;
    private String podNamespace;
    private String containerName;
    private String serviceName;

    public PodInfo() {
    }

    public PodInfo(String podName, String podIp, String podNamespace, String containerName, String serviceName) {
        this.podName = podName;
        this.podIp = podIp;
        this.podNamespace = podNamespace;
        this.containerName = containerName;
        this.serviceName = serviceName;
    }

    public String getPodName() {
        return podName;
    }

    public void setPodName(String podName) {
        this.podName = podName;
    }

    public String getPodIp() {
        return podIp;
    }

    public void setPodIp(String podIp) {
        this.podIp = podIp;
    }

    public String getPodNamespace() {
        return podNamespace;
    }

    public void setPodNamespace(String podNamespace) {
        this.podNamespace = podNamespace;
    }

    public String getContainerName() {
        return containerName;
    }

    public void setContainerName(String containerName) {
        this.containerName = containerName;
    }

    public String getServiceName() {
        return serviceName;
    }

    public void setServiceName(String serviceName) {
        this.serviceName = serviceName;
    }
}
