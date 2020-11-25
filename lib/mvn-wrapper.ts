import 'source-map-support/register';
import * as path from 'path';
import * as fs from 'fs';
import * as xmlJs from 'xml-js';
import { ClassPath } from './classpath';
import * as tmp from 'tmp';
import { execute } from './sub-process';
import { MalformedModulesSpecError } from './errors';
import { timeIt } from './metrics';
import { debug } from './debug';

// Low level helper functions

export async function withOutputToTemporaryFile(
  f: (fileName: string) => Promise<void>,
): Promise<string> {
  // NOTE(alexmu): We have to do this little dance with output written to files
  // because that seems to be the only way to get the output without having to
  // parse maven logs
  const file = tmp.fileSync({ discardDescriptor: true });
  try {
    await f(file.name);
  } catch (e) {
    debug(`Failed to execute command with temporary file: ${e}`);
    throw e;
  }

  try {
    return fs.readFileSync(file.name, 'utf8');
  } catch (e) {
    debug(`Failed to read temporary file: ${e}`);
    throw e;
  }
}

function runCommand(projectDirectory: string, args: string[]): Promise<string> {
  return execute('mvn', args.concat(['-f', projectDirectory]), {
    cwd: projectDirectory,
  });
}

// Domain specific helpers

async function evaluateExpression(
  projectDirectory: string,
  expression: string,
): Promise<string> {
  return await withOutputToTemporaryFile(async (outputFile) => {
    await runCommand(projectDirectory, [
      'help:evaluate',
      `-Dexpression="${expression}"`,
      `-Doutput=${outputFile}`,
    ]);
  });
}

export async function getBuildDir(baseDir: string): Promise<string> {
  return await evaluateExpression(baseDir, 'project.build.directory');
}

export async function getOutputDir(baseDir: string): Promise<string> {
  return await evaluateExpression(baseDir, 'project.build.outputDirectory');
}

export async function getDepsClassPath(baseDir: string): Promise<ClassPath> {
  const classPath = await withOutputToTemporaryFile(async (outputFile) => {
    await runCommand(baseDir, [
      'dependency:build-classpath',
      `-Dmdep.outputFile=${outputFile}`,
    ]);
  });
  return new ClassPath(classPath);
}

export function parseModuleNames(modulesXml: string): string[] {
  const modulesSpec = xmlJs.xml2js(modulesXml, { compact: true });
  if ('strings' in modulesSpec && 'string' in modulesSpec['strings']) {
    debug(`Found 'strings' in the modules XML`);
    return modulesSpec['strings']['string'].map((s) => s['_text']);
  } else if ('modules' in modulesSpec) {
    debug(`Empty modules XML`);
    return [];
  } else {
    throw new MalformedModulesSpecError(modulesXml);
  }
}

// Maven model

export class MavenModule {
  public readonly baseDirectory: string;
  public readonly buildDirectory: string;
  public readonly outputDirectory: string;
  public readonly dependenciesClassPath: ClassPath;

  constructor(
    baseDir: string,
    buildDirectory: string,
    outputDirectory: string,
    dependenciesClassPath: ClassPath,
  ) {
    if (buildDirectory?.length === 0) {
      throw new Error(`Empty build directory for the project in: ${baseDir}`);
    }
    if (outputDirectory?.length === 0) {
      throw new Error(`Empty output directory for the project in: ${baseDir}`);
    }
    if (dependenciesClassPath?.isEmpty()) {
      throw new Error(`Empty dependencies for the project in: ${baseDir}`);
    }

    this.baseDirectory = baseDir;
    this.buildDirectory = buildDirectory;
    this.outputDirectory = outputDirectory;
    this.dependenciesClassPath = dependenciesClassPath;
  }

  public getClassPath(): ClassPath {
    debug(`Dependencies class path: ${this.dependenciesClassPath}`);
    debug(`Output directory: ${this.outputDirectory}`);
    return this.dependenciesClassPath.concat(
      new ClassPath(this.outputDirectory),
    );
  }
}

export class MavenProject {
  public readonly baseDir: string;
  public readonly modules: MavenModule[];

  constructor(baseDir: string, modules: MavenModule[]) {
    if (modules?.length === 0) {
      throw new Error(`Empty module list for the project in: ${baseDir}`);
    }
    this.baseDir = baseDir;
    this.modules = modules;
  }

  public getClassPath(): string {
    const classPaths = this.modules.map((module) => module.getClassPath());
    const cp = classPaths.reduce((cp1, cp2) => cp1.concat(cp2));
    debug(`Project class path: ${cp}`);
    return cp.toString();
  }
}

// Factories that deal with the low level details

export async function makeMavenModule(baseDir: string): Promise<MavenModule> {
  const buildDir = await getBuildDir(baseDir);
  const outputDir = await getOutputDir(baseDir);
  const depsClassPath = await timeIt('getMvnClassPath', async () => {
    return await getDepsClassPath(baseDir);
  });
  return new MavenModule(baseDir, buildDir, outputDir, depsClassPath);
}

export async function makeMavenProject(baseDir: string): Promise<MavenProject> {
  const modulesXml = await evaluateExpression(baseDir, 'project.modules');
  const moduleNames = parseModuleNames(modulesXml);
  const modules = [await makeMavenModule(baseDir)];
  const submodules = await Promise.all(
    moduleNames.map((name) => makeMavenModule(path.join(baseDir, name))),
  );
  modules.push(...submodules);
  const validModules = modules.filter((module) =>
    fs.existsSync(module.buildDirectory),
  );
  return new MavenProject(baseDir, validModules);
}
