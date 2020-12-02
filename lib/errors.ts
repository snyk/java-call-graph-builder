export class CallGraphGenerationError extends Error {
  public innerError: Error;

  constructor(msg: string, innerError: Error) {
    super(msg);
    Object.setPrototypeOf(this, CallGraphGenerationError.prototype);
    this.innerError = innerError;
  }
}

export class ClassPathGenerationError extends Error {
  public readonly userMessage =
    "Could not determine the project's class path. Please contact our support or submit an issue at https://github.com/snyk/java-call-graph-builder/issues. Re-running the command with the `-d` flag will provide useful information for the support engineers.";

  public innerError: Error;

  constructor(innerError: Error) {
    super('Class path generation error');
    Object.setPrototypeOf(this, ClassPathGenerationError.prototype);
    this.innerError = innerError;
  }
}

export class EmptyClassPathError extends Error {
  public readonly userMessage =
    'The class path for the project is empty. Please contact our support or submit an issue at https://github.com/snyk/java-call-graph-builder/issues. Re-running the command with the `-d` flag will provide useful information for the support engineers.';

  constructor(command: string) {
    super(`The command "${command}" returned an empty class path`);
    Object.setPrototypeOf(this, EmptyClassPathError.prototype);
  }
}

export class MissingTargetFolderError extends Error {
  public readonly userMessage: string;
  errorMessagePerPackageManager = {
    mvn:
      "Could not find the project's output directory. Please build your project and try again. " +
      'The reachable vulnerabilities feature only supports the default Maven project layout, ' +
      "where the output directory is named 'target'.",
    gradle:
      "Could not find the project's target folder. Please compile your code and try again.",
  };

  constructor(targetPath: string, packageManager: 'mvn' | 'gradle') {
    super(`Could not find the target folder starting in "${targetPath}"`);
    Object.setPrototypeOf(this, MissingTargetFolderError.prototype);

    this.userMessage = this.errorMessagePerPackageManager[packageManager];
  }
}

export class SubprocessTimeoutError extends Error {
  public readonly userMessage =
    'Scanning for reachable vulnerabilities took too long. Please use the --reachable-timeout flag to increase the timeout for finding reachable vulnerabilities.';

  constructor(command: string, args: string, timeout: number) {
    super(
      `The command "${command} ${args}" timed out after ${timeout / 1000}s`,
    );
    Object.setPrototypeOf(this, SubprocessTimeoutError.prototype);
  }
}

export class SubprocessError extends Error {
  constructor(
    command: string,
    args: string,
    exitCode: number,
    stdError?: string,
  ) {
    super(
      `The command "${command} ${args}" exited with code ${exitCode}${
        stdError ? ', Standard Error Output: ' + stdError : ''
      }`,
    );
    Object.setPrototypeOf(this, SubprocessError.prototype);
  }
}

export class MalformedModulesSpecError extends Error {
  constructor(modulesXml: string) {
    super(`Malformed modules XML: ${modulesXml}`);
    Object.setPrototypeOf(this, MalformedModulesSpecError.prototype);
  }
}
