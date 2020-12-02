import * as path from 'path';

function canonicalize(rawClasspath: string): string {
  let sanitisedClassPath = rawClasspath.trim();
  while (sanitisedClassPath.startsWith(path.delimiter)) {
    sanitisedClassPath = sanitisedClassPath.slice(1);
  }
  while (sanitisedClassPath.endsWith(path.delimiter)) {
    sanitisedClassPath = sanitisedClassPath.slice(0, -1);
  }
  return sanitisedClassPath;
}

export class ClassPath {
  private readonly value: string;

  constructor(classPath: string) {
    this.value = canonicalize(classPath);
  }

  public isEmpty(): boolean {
    return this.value.length === 0;
  }

  public concat(other: ClassPath): ClassPath {
    const elements = this.value.split(path.delimiter);
    const otherElements = other.value.split(path.delimiter);
    const newElements = Array.from(
      new Set(elements.concat(otherElements)).values(),
    );
    return new ClassPath(newElements.join(path.delimiter));
  }

  public toString(): string {
    return this.value;
  }
}
