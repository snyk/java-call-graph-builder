import {
  MavenModule,
  MavenProject,
  parseModuleNames,
} from '../../lib/mvn-wrapper';
import { MalformedModulesSpecError } from '../../lib/errors';
import { ClassPath } from '../../lib/classpath';
import * as path from 'path';

describe('parseModuleNames', () => {
  test('handles empty input', () => {
    expect(() => parseModuleNames('')).toThrowError(MalformedModulesSpecError);
  });

  test('throws generic error on junk input', () => {
    expect(() => parseModuleNames('junk')).toThrowError(Error);
  });

  test('handles empty module list', () => {
    expect(() => parseModuleNames('<modules/>')).toHaveLength(0);
    expect(() => parseModuleNames('<modules></modules>')).toHaveLength(0);
  });

  test('throws specific error on malformed input', () => {
    expect(() => parseModuleNames(`<strings></strings>`)).toThrowError(
      MalformedModulesSpecError,
    );
  });

  test('handles module list', () => {
    expect(
      parseModuleNames(`<strings>
  <string>app</string>
  <string>util</string>
</strings>`),
    ).toEqual(['app', 'util']);
  });
});

describe('MavenModule', () => {
  test('throws on missing build directory', () => {
    expect(
      () => new MavenModule('base', '', 'out', new ClassPath('dep')),
    ).toThrowError();
  });

  test('throws on missing output directory', () => {
    expect(
      () => new MavenModule('base', 'build', '', new ClassPath('dep')),
    ).toThrowError();
  });

  test('throws on missing dependencies classpath', () => {
    expect(
      () => new MavenModule('base', 'build', 'out', new ClassPath('')),
    ).toThrowError();
  });

  test('builds correct classpath', () => {
    const module = new MavenModule(
      'base',
      'build',
      'out',
      new ClassPath('dep'),
    );
    expect(module.getClassPath().toString()).toEqual(`dep${path.delimiter}out`);
  });
});

describe('MavenProject', () => {
  test('throws on empty module list', () => {
    expect(() => new MavenProject('base', [])).toThrowError();
  });

  test('builds correct classpath', () => {
    const module1 = new MavenModule(
      'base1',
      'build1',
      'out1',
      new ClassPath('dep1'),
    );
    const module2 = new MavenModule(
      'base2',
      'build2',
      'out2',
      new ClassPath('dep2'),
    );
    const module3 = new MavenModule(
      'base3',
      'build3',
      'out3',
      new ClassPath('dep3'),
    );
    const project = new MavenProject('base', [module1, module2, module3]);
    expect(project.getClassPath().toString()).toEqual(
      `dep1${path.delimiter}out1${path.delimiter}dep2${path.delimiter}out2${path.delimiter}dep3${path.delimiter}out3`,
    );
  });
});
