import { DockerfileCoreConfig } from "./types";

export const CORE_IMAGE = "localhost/aerovato/container-v3-core";
export const HARNESS_IMAGE = "localhost/aerovato/container-v3-harness";
export const USER_IMAGE = "localhost/aerovato/container-v3";

export const DEFAULT_PROMPT_COMMAND =
  "RUN echo 'PS1=\"\\[\\033[01;32m\\][container]\\[\\033[00m\\] \\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ \"' >> /root/.bashrc";

export const DEFAULT_CORE_COMMANDS = `ENV TZ=America/New_York
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \\
    build-essential \\
    git \\
    curl \\
    wget \\
    unzip \\
    ca-certificates \\
    libssl-dev \\
    zlib1g-dev \\
    libffi-dev \\
    vim \\
    tree

ENV NVM_DIR=/root/.nvm
ENV NODE_VERSION=22
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash \\
    && . "$NVM_DIR/nvm.sh" \\
    && nvm install \${NODE_VERSION} \\
    && nvm use \${NODE_VERSION} \\
    && nvm alias default \${NODE_VERSION} \\
    && ln -sf "$NVM_DIR/versions/node/$(nvm current)/bin/"* /usr/local/bin/

RUN apt-get update \\
    && apt-get install -y \\
        python3 \\
        python3-dev \\
        python3-venv \\
        python3-pip

RUN ln -sf /usr/bin/python3 /usr/bin/python`;

export const DOCKERFILE_CORE_DEFAULTS: Required<DockerfileCoreConfig> = {
  baseImage: "ubuntu:24.04",
  workdir: "/root",
  cmd: '["/bin/bash"]',
  promptCommand: DEFAULT_PROMPT_COMMAND,
  disableDefaultCommands: false,
  customCommands: [],
};

export function resolveCoreConfig(
  user: DockerfileCoreConfig,
): Required<DockerfileCoreConfig> {
  return { ...DOCKERFILE_CORE_DEFAULTS, ...user };
}

export function generateDockerfileCore(
  config: Required<DockerfileCoreConfig>,
): string {
  const sections: string[] = [];

  sections.push(`FROM ${config.baseImage}`);
  sections.push(`LABEL aerovato.container=v3`);
  sections.push(`WORKDIR ${config.workdir}`);
  sections.push(`CMD ${config.cmd}`);
  sections.push(config.promptCommand);

  if (!config.disableDefaultCommands) {
    sections.push(DEFAULT_CORE_COMMANDS);
  }

  if (config.customCommands.length > 0) {
    sections.push(config.customCommands.join("\n"));
  }

  return sections.join("\n\n") + "\n";
}
